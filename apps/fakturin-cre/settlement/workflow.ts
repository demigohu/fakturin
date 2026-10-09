import {
  bytesToHex,
  cre,
  getNetwork,
  prepareReportRequest,
  type CronPayload,
  type Runtime,
  TxStatus,
} from '@chainlink/cre-sdk'
import { encodeAbiParameters, type Address, type Hex } from 'viem'
import { z } from 'zod'

export const configSchema = z.object({
  schedule: z.string(),
  invoiceId: z.string(),
  consumerAddress: z.string(),
  chainName: z.string(),
  gasLimit: z.string(),
})

export type Config = z.infer<typeof configSchema>

const triggerSettlement = (runtime: Runtime<Config>): string => {
  const invoiceId = runtime.config.invoiceId as Hex
  if (invoiceId === `0x${'0'.repeat(64)}`) {
    throw new Error('Set invoiceId in settlement/config.json after financing an invoice')
  }

  const network = getNetwork({
    chainFamily: 'evm',
    chainSelectorName: runtime.config.chainName,
    isTestnet: true,
  })
  if (!network) {
    throw new Error(`Unknown chain: ${runtime.config.chainName}`)
  }

  const reportPayload = encodeAbiParameters([{ type: 'bytes32', name: 'invoiceId' }], [invoiceId])

  const reportResponse = runtime.report(prepareReportRequest(reportPayload)).result()

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)
  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: runtime.config.consumerAddress as Address,
      report: reportResponse,
      gasConfig: { gasLimit: runtime.config.gasLimit },
    })
    .result()

  runtime.log(
    `writeReport txStatus=${writeResult.txStatus} receiverStatus=${writeResult.receiverContractExecutionStatus}`,
  )

  if (writeResult.txStatus !== TxStatus.SUCCESS) {
    throw new Error(writeResult.errorMessage || `tx failed: ${writeResult.txStatus}`)
  }

  const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32))
  runtime.log(`Settlement report broadcast: ${txHash}`)
  return txHash
}

export const onCronTrigger = (runtime: Runtime<Config>, payload: CronPayload): string => {
  if (!payload.scheduledExecutionTime) {
    throw new Error('Scheduled execution time is required')
  }
  runtime.log('Fakturin CRE settlement trigger')
  return triggerSettlement(runtime)
}

export function initWorkflow(config: Config) {
  const cron = new cre.capabilities.CronCapability()
  return [
    cre.handler(
      cron.trigger({ schedule: config.schedule }),
      onCronTrigger,
    ),
  ]
}
