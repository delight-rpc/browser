import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '@src/client.js'
import { IAPI } from './contract.js'
import { getErrorPromise } from 'return-style'

describe('Main as Client, Web Worker as Server', () => {
  let worker: Worker
  beforeEach(() => {
    worker = new Worker(
      new URL('./worker.ts', import.meta.url)
    , { type: 'module' }
    )
  })
  afterEach(() => worker.terminate())

  it('echo', async () => {
    const [client] = createClient<IAPI>(worker)

    const result = await client.echo('hello')

    expect(result).toBe('hello')
  })

  it('error', async () => {
    const [client] = createClient<IAPI>(worker)

    const err = await getErrorPromise(client.error('hello'))

    expect(err).toBeInstanceOf(Error)
    expect(err!.message).toMatch('hello')
  })
})
