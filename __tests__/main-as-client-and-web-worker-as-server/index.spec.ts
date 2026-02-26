import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createBatchClient, createClient } from '@src/client.js'
import { IAPI } from './contract.js'
import { getErrorPromise } from 'return-style'
import { AbortController, AbortError } from 'extra-abort'
import { createBatchProxy } from 'delight-rpc'

describe('Main as Client, Web Worker as Server', () => {
  let worker: Worker
  beforeEach(() => {
    worker = new Worker(
      new URL('./worker.ts', import.meta.url)
    , { type: 'module' }
    )
  })
  afterEach(() => worker.terminate())

  test('result', async () => {
    const [client, close] = createClient<IAPI>(worker)

    const result = await client.echo('foo')
    close()

    expect(result).toBe('foo')
  })

  test('result (batch)', async () => {
    const [client, close] = createBatchClient(worker)
    const proxy = createBatchProxy<IAPI>()

    const result = await client.parallel(proxy.echo('foo'))
    close()

    expect(result.length).toBe(1)
    expect(result[0].unwrap()).toBe('foo')
  })

  test('error', async () => {
    const [client, close] = createClient<IAPI>(worker)

    const err = await getErrorPromise(client.error('foo'))
    close()

    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toMatch('foo')
  })

  test('error (batch)', async () => {
    const [client, close] = createBatchClient(worker)
    const proxy = createBatchProxy<IAPI>()

    const result = await client.parallel(proxy.error('foo'))
    close()

    expect(result.length).toBe(1)
    const err = result[0].unwrapErr()
    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toMatch('foo')
  })

  test('abort', async () => {
    const [client, close] = createClient<IAPI>(worker)

    const controller = new AbortController()
    const promise = getErrorPromise(client.loop(controller.signal))
    controller.abort()
    const err = await promise
    close()

    expect(err).toBeInstanceOf(AbortError)
  })
})
