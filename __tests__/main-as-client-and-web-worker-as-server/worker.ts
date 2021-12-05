import { createServer } from '@src/server'
import { IAPI } from './api'

const api: IAPI = {
  echo(message: string): string {
    return message
  }
, error(message: string): never {
    throw new Error(message)
  }
}

createServer(api, self)
