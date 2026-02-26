import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createServer } from '@src/server.js'
import { createClient } from '@src/client.js'
import { IAPI } from './contract.js'
import { getErrorPromise } from 'return-style'
import { ImplementationOf } from 'delight-rpc'
import { assert } from '@blackglory/prelude'
import { delay } from 'extra-promise'
import { javascript } from 'extra-tags'
import { AbortError } from 'extra-abort'

const api: ImplementationOf<IAPI> = {
  echo(message: string): string {
    return message
  }
, error(message: string): never {
    throw new Error(message)
  }
, async loop(signal?: AbortSignal): Promise<never> {
    assert(signal)

    while (!signal.aborted) {
      await delay(100)
    }

    throw signal.reason
  }
}

describe('Web Worker as Client, Main as Server', () => {
  let worker: Worker
  let cancelServer: () => void
  beforeEach(() => {
    worker = new Worker(
      new URL('./worker.ts', import.meta.url)
    , { type: 'module' }
    )
    cancelServer = createServer(api, worker)
  })
  afterEach(() => {
    cancelServer()
    worker.terminate()
  })

  test('result', async () => {
    const [client, close] = createClient<{ eval: (code: string) => any }>(worker)

    const result = await client.eval(javascript`
      client.echo('foo')
    `)
    close()

    expect(result).toBe('foo')
  })

  test('error', async () => {
    const [client, close] = createClient<{ eval: (code: string) => any }>(worker)

    const err = await getErrorPromise(client.eval(javascript`
      client.error("foo")
    `))
    close()

    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toMatch('foo')
  })

  test('abort', async () => {
    const [client, close] = createClient<{ eval: (code: string) => any }>(worker)

    const err = await getErrorPromise(client.eval(javascript`
      const controller = new AbortController()
      const promise = client.loop(controller.signal)
      controller.abort()
      promise
    `))
    close()

    expect(err).toBeInstanceOf(AbortError)
  })
})
