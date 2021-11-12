import { createClient } from '@src/client'
import { IAPI } from './api'

describe('Main as Client, Web Worker as Server', () => {
  let worker: Worker
  beforeEach(() => {
    worker = new Worker(new URL('./worker.ts', import.meta.url))
  })
  afterEach(() => worker.terminate())

  it('echo', async () => {
    const client = createClient<IAPI>(worker)

    const result = await client.echo('hello')

    expect(result).toEqual('hello')
  })
})
