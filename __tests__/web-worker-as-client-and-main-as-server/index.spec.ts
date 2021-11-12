import { createServer } from '@src/server'
import { createClient } from '@src/client'
import { IAPI } from './api'

describe('Web Worker as Client, Main as Server', () => {
  it('echo', async () => {
    const api: IAPI = {
      echo(message: string): string {
        return message
      }
    }
    const worker: Worker = new Worker(new URL('./worker.ts', import.meta.url))
    const cancelServer = createServer(api, worker)

    try {
      const client = createClient<{ eval: (code: string) => any }>(worker)
      const result = await client.eval('client.echo("hello")')
      expect(result).toEqual('hello')
    } finally {
      cancelServer()
      worker.terminate()
    }
  })
})
