import { createServer } from '@src/server.js'
import { createClient } from '@src/client.js'
import { IAPI } from './contract.js'
import { getErrorPromise } from 'return-style'

const api: IAPI = {
  echo(message: string): string {
    return message
  }
, error(message: string): never {
    throw new Error(message)
  }
}

describe('Web Worker as Client, Main as Server', () => {
  it('echo', async () => {
    const worker: Worker = new Worker(new URL('./worker.ts', import.meta.url))
    const cancelServer = createServer(api, worker)

    try {
      const [client] = createClient<{ eval: (code: string) => any }>(worker)
      const result = await client.eval('client.echo("hello")')

      expect(result).toBe('hello')
    } finally {
      cancelServer()
      worker.terminate()
    }
  })

  it('error', async () => {
    const worker: Worker = new Worker(new URL('./worker.ts', import.meta.url))
    const cancelServer = createServer(api, worker)

    try {
      const [client] = createClient<{ eval: (code: string) => any }>(worker)
      const err = await getErrorPromise(client.eval('client.error("hello")'))

      expect(err).toBeInstanceOf(Error)
      expect(err!.message).toMatch('hello')
    } finally {
      cancelServer()
      worker.terminate()
    }
  })
})
