import { IAPI } from './contract.js'
import { createServer } from '@src/server.js'
import { createClient } from '@src/client.js'

const [client] = createClient<IAPI>(self)

createServer({
  async eval(code: string): Promise<unknown> {
    return await eval(code)
  }
}, self)
