import { createClient } from '@src/client'
import { createServer } from '@src/server'

interface IAPI {
  echo(message: string): string
}

const API: IAPI = {
  echo(message: string): string {
    return message
  }
}

describe('MessageChannel: createClient, createServer', () => {
  let channel: MessageChannel
  let stopServer: () => void
  beforeEach(() => {
    channel = new MessageChannel()
    channel.port1.start()
    channel.port2.start()

    stopServer = createServer<IAPI>(API, channel.port1)
  })
  afterEach(() => {
    stopServer()
  })

  it('echo', async () => {
    const [client, close] = createClient<IAPI>(channel.port2)

    const result = await client.echo('hello')
    close()

    expect(result).toEqual('hello')
  })
})
