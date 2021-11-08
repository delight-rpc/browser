import { isJsonRpcRequest } from '@blackglory/types'
import { createResponse } from 'delight-rpc'

export function createServer<IAPI extends object>(
  api: IAPI
, port: Window | MessagePort | Worker
): () => void {
  // `(event: MessageEvent) => void`作为handler类型通用于port的三种类型.
  // 但由于TypeScript标准库的实现方式无法将三种类型的情况合并起来, 因此会出现类型错误.
  // 该问题也许会在未来版本的TypeScript解决, 我目前找不到比用any忽略掉它更适合的处理方式.
  port.addEventListener('message', handler as any)
  return () => port.removeEventListener('message', handler as any)

  async function handler(event: MessageEvent): Promise<void> {
    const req = event.data
    if (isJsonRpcRequest(req)) {
      const result = await createResponse(api, req)

      port.postMessage(result)
    }
  }
}
