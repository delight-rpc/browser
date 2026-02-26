import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createBatchProxy, ImplementationOf } from 'delight-rpc'
import { createClient, createBatchClient } from '@src/client.js'
import { createServer } from '@src/server.js'
import { getErrorPromise } from 'return-style'
import { assert } from '@blackglory/prelude'
import { delay } from 'extra-promise'
import { AbortController, AbortError } from 'extra-abort'

interface IAPI {
  echo(message: string): string
  error(message: string): never
  loop(): never
}

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

describe('MessageChannel: createClient, createServer', () => {
  let channel: MessageChannel
  let stopServer: () => void
  beforeEach(() => {
    channel = new MessageChannel()
    channel.port1.start()
    channel.port2.start()

    stopServer = createServer<IAPI>(api, channel.port1)
  })
  afterEach(() => {
    stopServer()
  })

  test('result', async () => {
    const [client, close] = createClient<IAPI>(channel.port2)

    const result = await client.echo('foo')
    close()

    expect(result).toBe('foo')
  })

  test('result (batch)', async () => {
    const [client, close] = createBatchClient(channel.port2)
    const proxy = createBatchProxy<IAPI>()

    const result = await client.parallel(proxy.echo('foo'))
    close()

    expect(result.length).toBe(1)
    expect(result[0].unwrap()).toBe('foo')
  })

  test('error', async () => {
    const [client, close] = createClient<IAPI>(channel.port2)

    const err = await getErrorPromise(client.error('foo'))
    close()

    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toMatch('foo')
  })

  test('error (batch)', async () => {
    const [client, close] = createBatchClient(channel.port2)
    const proxy = createBatchProxy<IAPI>()

    const result = await client.parallel(proxy.error('foo'))
    close()

    expect(result.length).toBe(1)
    const err = result[0].unwrapErr()
    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toMatch('foo')
  })

  test('abort', async () => {
    const [client, close] = createClient<IAPI>(channel.port2)
    const controller = new AbortController()

    const promise = getErrorPromise(client.loop(controller.signal))
    controller.abort()
    const err = await promise
    close()

    expect(err).toBeInstanceOf(AbortError)
  })
})
