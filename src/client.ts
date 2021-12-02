import * as DelightRPC from 'delight-rpc'
import { Deferred } from 'extra-promise'
import { CustomError } from '@blackglory/errors'

export function createClient<IAPI extends object>(
  port: Window | MessagePort | Worker
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void] {
  const pendings: { [id: string]: Deferred<DelightRPC.IResponse<any>> } = {}

  // `(event: MessageEvent) => void`作为handler类型通用于port的三种类型.
  // 但由于TypeScript标准库的实现方式无法将三种类型的情况合并起来, 因此会出现类型错误.
  // 该问题也许会在未来版本的TypeScript解决, 我目前找不到比用any忽略掉它更适合的处理方式.
  port.addEventListener('message', handler as any)
  if (port instanceof MessagePort) {
    port.start()
  }

  const client = DelightRPC.createClient<IAPI>(
    async function send(request) {
      const res = new Deferred<DelightRPC.IResponse<any>>()
      pendings[request.id] = res
      try {
        port.postMessage(request)
        return await res
      } finally {
        delete pendings[request.id]
      }
    }
  )

  return [client, close]

  function close(): void {
    port.removeEventListener('message', handler as any)
    for (const [key, deferred] of Object.entries(pendings)) {
      deferred.reject(new ClientClosed())
      delete pendings[key]
    }
  }

  function handler(event: MessageEvent) {
    const res = event.data
    if (DelightRPC.isResult(res)) {
      pendings[res.id].resolve(res)
    } else if (DelightRPC.isError(res)) {
      pendings[res.id].reject(res)
    }
  }
}

export class ClientClosed extends CustomError {}
