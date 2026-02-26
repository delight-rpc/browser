import * as DelightRPC from 'delight-rpc'
import { isntNull } from '@blackglory/prelude'

export function createServer<IAPI extends object>(
  api: DelightRPC.ImplementationOf<IAPI>
, port: Window | MessagePort | Worker
, { parameterValidators, version, channel, ownPropsOnly }: {
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    version?: `${number}.${number}.${number}`
    channel?: string | RegExp | typeof DelightRPC.AnyChannel
    ownPropsOnly?: boolean
  } = {}
): () => void {
  if (port instanceof Worker) {
    port.addEventListener('message', handler)
    return () => port.removeEventListener('message', handler)
  } else if (port instanceof MessagePort) {
    port.addEventListener('message', handler)
    return () => port.removeEventListener('message', handler)
  } else {
    port.addEventListener('message', handler)
    return () => port.removeEventListener('message', handler)
  }

  async function handler(event: MessageEvent): Promise<void> {
    const req = event.data
    if (DelightRPC.isRequest(req) || DelightRPC.isBatchRequest(req)) {
      const result = await DelightRPC.createResponse(
        api
      , req
      , {
          parameterValidators
        , version
        , channel
        , ownPropsOnly
        }
      )

      if (isntNull(result)) {
        port.postMessage(result)
      }
    }
  }
}
