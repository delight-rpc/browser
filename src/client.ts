import * as DelightRPC from 'delight-rpc'
import { Deferred } from 'extra-promise'
import { CustomError } from '@blackglory/errors'
import { IRequest, IResponse, IError, IBatchRequest, IBatchResponse } from '@delight-rpc/protocol'

export function createClient<IAPI extends object>(
  port: Window | MessagePort | Worker
, { parameterValidators, expectedVersion, channel }: {
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
  , expectedVersion?: string
  , channel?: string
  } = {}
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void] {
  const pendings: { [id: string]: Deferred<IResponse<unknown>> } = {}

  // `(event: MessageEvent) => void`作为handler类型通用于port的三种类型.
  // 但由于TypeScript标准库的实现方式无法将三种类型的情况合并起来, 因此会出现类型错误.
  // 该问题也许会在未来版本的TypeScript解决, 我目前找不到比用any忽略掉它更适合的处理方式.
  port.addEventListener('message', handler as any)

  const client = DelightRPC.createClient<IAPI>(
    async function send(request: IRequest<unknown>) {
      const res = new Deferred<IResponse<unknown>>()
      pendings[request.id] = res
      try {
        port.postMessage(request)
        return await res
      } finally {
        delete pendings[request.id]
      }
    }
  , {
      parameterValidators
    , expectedVersion
    , channel
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
    if (DelightRPC.isResult(res) || DelightRPC.isError(res)) {
      pendings[res.id].resolve(res)
    }
  }
}

export function createBatchClient<IAPI extends object>(
  port: Window | MessagePort | Worker
, { expectedVersion, channel }: {
    expectedVersion?: string
    channel?: string
  } = {}
): [client: DelightRPC.BatchClient<IAPI>, close: () => void] {
  const pendings: { [id: string]: Deferred<IError | IBatchResponse<unknown>> } = {}

  // `(event: MessageEvent) => void`作为handler类型通用于port的三种类型.
  // 但由于TypeScript标准库的实现方式无法将三种类型的情况合并起来, 因此会出现类型错误.
  // 该问题也许会在未来版本的TypeScript解决, 我目前找不到比用any忽略掉它更适合的处理方式.
  port.addEventListener('message', handler as any)

  const client = new DelightRPC.BatchClient(
    async function send(request: IBatchRequest<unknown>) {
      const res = new Deferred<IError | IBatchResponse<unknown>>()
      pendings[request.id] = res
      try {
        port.postMessage(request)
        return await res
      } finally {
        delete pendings[request.id]
      }
    }
  , {
      expectedVersion
    , channel
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
    if (DelightRPC.isError(res) || DelightRPC.isBatchResponse(res)) {
      pendings[res.id].resolve(res)
    }
  }
}

export class ClientClosed extends CustomError {}
