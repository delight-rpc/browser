import * as DelightRPC from 'delight-rpc'
import { isJsonRpcSuccess, isJsonRpcError } from '@blackglory/types'
import { Deferred } from 'extra-promise'
import { JsonRpcResponse } from 'justypes'

export function createClient<IAPI extends object>(
  port: Window | MessagePort | Worker
): DelightRPC.RequestProxy<IAPI> {
  const pendings: { [id: string]: Deferred<JsonRpcResponse<any>> } = {}

  // `(event: MessageEvent) => void`作为handler类型通用于port的三种类型.
  // 但由于TypeScript标准库的实现方式无法将三种类型的情况合并起来, 因此会出现类型错误.
  // 该问题也许会在未来版本的TypeScript解决, 我目前找不到比用any忽略掉它更适合的处理方式.
  port.addEventListener('message', handler as any)
  if (port instanceof MessagePort) {
    port.start()
  }

  const client = DelightRPC.createClient<IAPI>(
    async function request(jsonRpc) {
      const res = new Deferred<JsonRpcResponse<any>>()
      pendings[jsonRpc.id] = res
      try {
        port.postMessage(jsonRpc)
        return await res
      } finally {
        delete pendings[jsonRpc.id]
      }
    }
  )

  return client

  function handler(event: MessageEvent) {
    const res = event.data
    if (isJsonRpcSuccess(res)) {
      pendings[res.id].resolve(res)
    } else if (isJsonRpcError(res)) {
      pendings[res.id].reject(res)
    }
  }
}
