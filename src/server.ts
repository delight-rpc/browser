import * as DelightRPC from 'delight-rpc'
import { isntNull } from '@blackglory/prelude'
import { SyncDestructor } from 'extra-defer'
import { HashMap } from '@blackglory/structures'

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
  const destructor = new SyncDestructor()

  const channelIdToController: HashMap<
    {
      channel?: string
    , id: string
    }
  , AbortController
  > = new HashMap(({ channel, id }) => JSON.stringify([channel, id]))
  destructor.defer(abortAllPendings)

  if (port instanceof Worker) {
    port.addEventListener('message', receive)
    destructor.defer(() => port.removeEventListener('message', receive))
  } else if (port instanceof MessagePort) {
    port.addEventListener('message', receive)
    destructor.defer(() => port.removeEventListener('message', receive))
  } else {
    port.addEventListener('message', receive)
    destructor.defer(() => port.removeEventListener('message', receive))
  }

  return close

  function close(): void {
    destructor.execute()
  }

  function abortAllPendings(): void {
    for (const controller of channelIdToController.values()) {
      controller.abort()
    }

    channelIdToController.clear()
  }

  async function receive(event: MessageEvent): Promise<void> {
    const message = event.data
    if (DelightRPC.isRequest(message) || DelightRPC.isBatchRequest(message)) {
      const destructor = new SyncDestructor()

      const controller = new AbortController()
      channelIdToController.set(message, controller)
      destructor.defer(() => channelIdToController.delete(message))

      try {
        const result = await DelightRPC.createResponse(
          api
        , message
        , {
            parameterValidators
          , version
          , channel
          , ownPropsOnly
          , signal: controller.signal
          }
        )

        if (isntNull(result)) {
          port.postMessage(result)
        }
      } finally {
        destructor.execute()
      }
    } else if (DelightRPC.isAbort(message)) {
      if (DelightRPC.matchChannel(message, channel)) {
        channelIdToController.get(message)?.abort()
        channelIdToController.delete(message)
      }
    }
  }
}
