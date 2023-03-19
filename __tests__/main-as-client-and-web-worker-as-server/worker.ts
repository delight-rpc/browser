import { createServer } from '@src/server.js'
import { IAPI } from './contract.js'

const api: IAPI = {
  echo(message: string): string {
    return message
  }
, error(message: string): never {
    throw new Error(message)
  }
}

createServer(api, self)
