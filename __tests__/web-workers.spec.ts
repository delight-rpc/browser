import { createClient } from '@src/client'

interface IAPI {
  echo(message: string): string
}

describe('Web Workers: createClient, createServer', () => {
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
