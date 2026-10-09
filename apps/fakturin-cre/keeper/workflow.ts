import {
  bytesToHex,
  cre,
  encodeCallMsg,
  getNetwork,
  LATEST_BLOCK_NUMBER,
  prepareReportRequest,
  type Runtime,
  TxStatus,
} from '@chainlink/cre-sdk'
import { type Address, decodeFunctionResult, encodeAbiParameters, encodeFunctionData, parseAbi, zeroAddress } from 'viem'
import { z } from 'zod'

/**
 * Fakturin keeper workflow (PRD v2, FR-12).
 *
 * Every tick it asks FakturKeeper which vaults are overdue:
 *   - funding vaults past their funding deadline  -> cancelFunding (funders get 1:1 back)
 *   - financed vaults past due date + grace period -> markDefault  (funders share the holdback)
 * and, if there are any, writes that list to FakturKeeper.onReport. Funders never have to press
 * "Mark default" or "Cancel funding"; they only withdraw.
 */

export const configSchema = z.object({
  schedule: z.string(),
  keeperAddress: z.string(),
  chainName: z.string(),
  maxPerRun: z.number().int().positive(),
  gasLimit: z.string(),
})

export type Config = z.infer<typeof configSchema>

const KEEPER_ABI = parseAbi(['function closable(uint256 max) view returns (address[])'])

const evmClient = (chainName: string) => {
  const network = getNetwork({ chainFamily: 'evm', chainSelectorName: chainName, isTestnet: true })
  if (!network) throw new Error(`Unknown chain: ${chainName}`)
  return new cre.capabilities.EVMClient(network.chainSelector.selector)
}

export const onTick = (runtime: Runtime<Config>): string => {
  const { keeperAddress, maxPerRun, chainName, gasLimit } = runtime.config
  const evm = evmClient(chainName)

  const reply = evm
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: keeperAddress as Address,
        data: encodeFunctionData({ abi: KEEPER_ABI, functionName: 'closable', args: [BigInt(maxPerRun)] }),
      }),
      blockNumber: LATEST_BLOCK_NUMBER,
    })
    .result()
  const due = decodeFunctionResult({ abi: KEEPER_ABI, functionName: 'closable', data: bytesToHex(reply.data) })

  if (due.length === 0) {
    runtime.log('No overdue vaults')
    return 'idle'
  }
  runtime.log(`Closing ${due.length} vault(s): ${due.join(', ')}`)

  const report = encodeAbiParameters([{ type: 'address[]', name: 'vaults' }], [due])
  const signed = runtime.report(prepareReportRequest(report)).result()
  const write = evm
    .writeReport(runtime, {
      receiver: keeperAddress as Address,
      report: signed,
      gasConfig: { gasLimit },
    })
    .result()

  if (write.txStatus !== TxStatus.SUCCESS) {
    throw new Error(write.errorMessage || `writeReport failed: ${write.txStatus}`)
  }
  const txHash = bytesToHex(write.txHash || new Uint8Array(32))
  runtime.log(`Keeper report written: ${txHash}`)
  return txHash
}

export function initWorkflow(config: Config) {
  const cron = new cre.capabilities.CronCapability()
  return [cre.handler(cron.trigger({ schedule: config.schedule }), onTick)]
}
