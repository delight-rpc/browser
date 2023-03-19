import { createClient } from '@src/client.js'
import { createServer } from '@src/server.js'
import { getErrorPromise } from 'return-style'

interface IAPI {
  echo(message: string): string
  error(message: string): never
}

const api: IAPI = {
  echo(message: string): string {
    return message
  }
, error(message: string): never {
    throw new Error(message)
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

  it('echo', async () => {
    const [client, close] = createClient<IAPI>(channel.port2)

    const result = await client.echo('hello')
    close()

    expect(result).toBe('hello')
  })

  it('error', async () => {
    const [client, close] = createClient<IAPI>(channel.port2)

    const err = await getErrorPromise(client.error('hello'))
    close()

    expect(err).toBeInstanceOf(Error)
    expect(err!.message).toMatch('hello')
  })
})
