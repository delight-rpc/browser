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
  let cancelServer: () => void
  beforeEach(() => {
    channel = new MessageChannel()
    channel.port1.start()
    channel.port2.start()

    cancelServer = createServer<IAPI>(API, channel.port1)
  })
  afterEach(() => {
    cancelServer()

    channel.port1.close()
    channel.port2.close()
  })

  it('echo', async () => {
    const client = createClient<IAPI>(channel.port2)

    const result = await client.echo('hello')

    expect(result).toEqual('hello')
  })
})
