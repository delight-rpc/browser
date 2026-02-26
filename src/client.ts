import * as DelightRPC from 'delight-rpc'
import { Deferred } from 'extra-promise'
import { CustomError } from '@blackglory/errors'
import { IResponse, IError, IBatchResponse } from '@delight-rpc/protocol'
import { SyncDestructor } from 'extra-defer'
import { isntUndefined } from '@blackglory/prelude'
import { raceAbortSignals, timeoutSignal, withAbortSignal } from 'extra-abort'

export function createClient<IAPI extends object>(
  port: Window | MessagePort | Worker
, { parameterValidators, expectedVersion, channel, timeout }: {
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    expectedVersion?: string
    channel?: string
    timeout?: number
  } = {}
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void] {
  const destructor = new SyncDestructor()

  const pendings: Map<string, Deferred<IResponse<unknown>>> = new Map()
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

  const client = DelightRPC.createClient<IAPI>(
    async function send(request, signal) {
      const destructor = new SyncDestructor()

      const res = new Deferred<IResponse<unknown>>()
      pendings.set(request.id, res)
      destructor.defer(() => pendings.delete(request.id))

      try {
        port.postMessage(request)

        const mergedSignal = raceAbortSignals([
          isntUndefined(timeout) && timeoutSignal(timeout)
        , signal
        ])
        mergedSignal.addEventListener('abort', sendAbort)
        destructor.defer(() => mergedSignal.removeEventListener('abort', sendAbort))

        return await withAbortSignal(mergedSignal, () => res)
      } finally {
        destructor.execute()
      }

      function sendAbort(): void {
        const abort = DelightRPC.createAbort(request.id, channel)
        port.postMessage(abort)
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
    destructor.execute()
  }

  function abortAllPendings(): void {
    const err = new ClientClosed()

    for (const deferred of pendings.values()) {
      deferred.reject(err)
    }

    pendings.clear()
  }

  function receive(event: MessageEvent): void {
    const res = event.data
    if (DelightRPC.isResult(res) || DelightRPC.isError(res)) {
      pendings.get(res.id)?.resolve(res)
    }
  }
}

export function createBatchClient<DataType>(
  port: Window | MessagePort | Worker
, { expectedVersion, channel, timeout }: {
    expectedVersion?: string
    channel?: string
    timeout?: number
  } = {}
): [client: DelightRPC.BatchClient<DataType>, close: () => void] {
  const destructor = new SyncDestructor()

  const pendings: Map<string, Deferred<IError | IBatchResponse<unknown>>> = new Map()
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

  const client = new DelightRPC.BatchClient(
    async function send(request) {
      const destructor = new SyncDestructor()

      const res = new Deferred<IError | IBatchResponse<unknown>>()
      pendings.set(request.id, res)
      destructor.defer(() => pendings.delete(request.id))

      try {
        port.postMessage(request)

        const mergedSignal = raceAbortSignals([
          isntUndefined(timeout) && timeoutSignal(timeout)
        ])
        mergedSignal.addEventListener('abort', sendAbort)
        destructor.defer(() => mergedSignal.removeEventListener('abort', sendAbort))

        return await res
      } finally {
        destructor.execute()
      }

      function sendAbort(): void {
        const abort = DelightRPC.createAbort(request.id, channel)
        port.postMessage(abort)
      }
    }
  , {
      expectedVersion
    , channel
    }
  )

  return [client, close]

  function close(): void {
    destructor.execute()
  }

  function abortAllPendings(): void {
    const err = new ClientClosed()

    for (const deferred of pendings.values()) {
      deferred.reject(err)
    }

    pendings.clear()
  }

  function receive(event: MessageEvent): void {
    const res = event.data
    if (DelightRPC.isError(res) || DelightRPC.isBatchResponse(res)) {
      pendings.get(res.id)?.resolve(res)
    }
  }
}

export class ClientClosed extends CustomError {}
