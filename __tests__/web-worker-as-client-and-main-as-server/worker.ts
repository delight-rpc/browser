import { IAPI } from './api'
import { createServer } from '@src/server'
import { createClient } from '@src/client'

const [client] = createClient<IAPI>(self)

createServer({
  async eval(code: string): Promise<unknown> {
    return await eval(code)
  }
}, self)
