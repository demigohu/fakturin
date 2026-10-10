import {
  bytesToHex,
  consensusIdenticalAggregation,
  cre,
  getNetwork,
  type HTTPSendRequester,
  logTriggerConfig,
  prepareReportRequest,
  type Runtime,
  TxStatus,
} from '@chainlink/cre-sdk'
import {
  type Address,
  decodeEventLog,
  encodeAbiParameters,
  type Hex,
  keccak256,
  parseAbi,
  toBytes,
  toEventSelector,
} from 'viem'
import { z } from 'zod'

/**
 * Fakturin verification workflow (PRD v2, US-02).
 *
 * 1. Triggers on FakturRegistry.VerificationRequested(invoiceId, seller, fakturNumber).
 * 2. Every node asks PJAP about the Faktur Pajak; nodes must agree on the result.
 * 3. The agreed result is ABI-encoded and written to FakturVerifierReceiver, which holds
 *    VERIFIER_ROLE and calls FakturRegistry.fulfillVerification.
 * 4. The result carries the NPWP hash of the seller named on the Faktur Pajak; the registry
 *    matches it against the requesting wallet's Chainlink ACE PKP credential (FR-13), so nobody
 *    can finance somebody else's invoice.
 *
 * PJAP is SIMULATED for the hackathon (apps/web/app/api/pjap); the JSON shape mirrors a PJAP
 * Faktur Pajak lookup, so pointing pjapBaseUrl at a real PJAP is the only change needed.
 * The mapping below must stay identical to apps/web/lib/pjap.ts (toVerification).
 */

export const configSchema = z.object({
  registryAddress: z.string(),
  receiverAddress: z.string(),
  pjapBaseUrl: z.string(),
  chainName: z.string(),
  gasLimit: z.string(),
})

export type Config = z.infer<typeof configSchema>

const EVENT_ABI = parseAbi([
  'event VerificationRequested(bytes32 indexed invoiceId, address indexed seller, string fakturNumber)',
])
const EVENT_TOPIC = toEventSelector(EVENT_ABI[0])

const REJECT = { NOT_FOUND: 1, CANCELLED: 2, REPLACED: 3 } as const

type PjapFaktur = {
  status: 'VALID' | 'TIDAK_DITEMUKAN' | 'DIBATALKAN' | 'DIGANTI'
  tanggalFaktur?: string
  jatuhTempo?: string
  penjual?: { npwp: string }
  pembeli?: { npwp: string }
  total?: number
}

/** Serializable verification result; every field must be identical across nodes. */
type VerificationResult = {
  valid: boolean
  rejectCode: number
  sellerNpwpHash: string
  buyerNpwpHash: string
  nominal: string
  issuedAt: string
  dueDate: string
}

const ZERO32 = `0x${'0'.repeat(64)}`

/** MockIDRX / IDRX have 2 decimals: one rupiah is 100 token units (must match apps/web/lib/token.ts). */
const TOKEN_UNIT = 100n

const fetchVerification = (requester: HTTPSendRequester, url: string): VerificationResult => {
  const response = requester.sendRequest({ method: 'GET', url }).result()
  if (response.statusCode === 404) {
    return { valid: false, rejectCode: REJECT.NOT_FOUND, sellerNpwpHash: ZERO32, buyerNpwpHash: ZERO32, nominal: '0', issuedAt: '0', dueDate: '0' }
  }
  if (response.statusCode !== 200) {
    throw new Error(`PJAP request failed with status ${response.statusCode}`)
  }
  const f = JSON.parse(Buffer.from(response.body).toString('utf-8')) as PjapFaktur
  if (f.status !== 'VALID') {
    const rejectCode =
      f.status === 'DIBATALKAN' ? REJECT.CANCELLED : f.status === 'DIGANTI' ? REJECT.REPLACED : REJECT.NOT_FOUND
    return { valid: false, rejectCode, sellerNpwpHash: ZERO32, buyerNpwpHash: ZERO32, nominal: '0', issuedAt: '0', dueDate: '0' }
  }
  return {
    valid: true,
    rejectCode: 0,
    sellerNpwpHash: keccak256(toBytes(f.penjual!.npwp)),
    buyerNpwpHash: keccak256(toBytes(f.pembeli!.npwp)),
    nominal: (BigInt(f.total!) * TOKEN_UNIT).toString(),
    issuedAt: String(Math.floor(new Date(f.tanggalFaktur!).getTime() / 1000)),
    dueDate: String(Math.floor(new Date(f.jatuhTempo!).getTime() / 1000)),
  }
}

type LogPayload = { topics: Uint8Array[]; data: Uint8Array }

export const onVerificationRequested = (runtime: Runtime<Config>, log: LogPayload): string => {
  const { args } = decodeEventLog({
    abi: EVENT_ABI,
    topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    data: bytesToHex(log.data),
  })
  const { invoiceId, fakturNumber } = args
  runtime.log(`VerificationRequested ${invoiceId} faktur=${fakturNumber}`)

  const http = new cre.capabilities.HTTPClient()
  const url = `${runtime.config.pjapBaseUrl}/${encodeURIComponent(fakturNumber)}`
  const v = http
    .sendRequest(runtime, fetchVerification, consensusIdenticalAggregation<VerificationResult>())(url)
    .result()
  runtime.log(`PJAP result valid=${v.valid} code=${v.rejectCode}`)

  const report = encodeAbiParameters(
    [
      { type: 'bytes32', name: 'invoiceId' },
      {
        type: 'tuple',
        name: 'v',
        components: [
          { type: 'bool', name: 'valid' },
          { type: 'uint8', name: 'rejectCode' },
          { type: 'bytes32', name: 'sellerNpwpHash' },
          { type: 'bytes32', name: 'buyerNpwpHash' },
          { type: 'uint256', name: 'nominal' },
          { type: 'uint64', name: 'issuedAt' },
          { type: 'uint64', name: 'dueDate' },
        ],
      },
    ],
    [
      invoiceId,
      {
        valid: v.valid,
        rejectCode: v.rejectCode,
        sellerNpwpHash: v.sellerNpwpHash as Hex,
        buyerNpwpHash: v.buyerNpwpHash as Hex,
        nominal: BigInt(v.nominal),
        issuedAt: BigInt(v.issuedAt),
        dueDate: BigInt(v.dueDate),
      },
    ],
  )

  const network = getNetwork({ chainFamily: 'evm', chainSelectorName: runtime.config.chainName, isTestnet: true })
  if (!network) throw new Error(`Unknown chain: ${runtime.config.chainName}`)
  const evm = new cre.capabilities.EVMClient(network.chainSelector.selector)
  const signed = runtime.report(prepareReportRequest(report)).result()
  const write = evm
    .writeReport(runtime, {
      receiver: runtime.config.receiverAddress as Address,
      report: signed,
      gasConfig: { gasLimit: runtime.config.gasLimit },
    })
    .result()

  if (write.txStatus !== TxStatus.SUCCESS) {
    throw new Error(write.errorMessage || `writeReport failed: ${write.txStatus}`)
  }
  const txHash = bytesToHex(write.txHash || new Uint8Array(32))
  runtime.log(`Verification written: ${txHash}`)
  return txHash
}

export function initWorkflow(config: Config) {
  const network = getNetwork({ chainFamily: 'evm', chainSelectorName: config.chainName, isTestnet: true })
  if (!network) throw new Error(`Unknown chain: ${config.chainName}`)
  const evm = new cre.capabilities.EVMClient(network.chainSelector.selector)
  return [
    cre.handler(
      evm.logTrigger(
        logTriggerConfig({
          addresses: [config.registryAddress as Hex],
          topics: [[EVENT_TOPIC]],
          confidence: 'LATEST',
        }),
      ),
      onVerificationRequested,
    ),
  ]
}
