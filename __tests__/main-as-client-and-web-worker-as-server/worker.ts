import { createServer } from '@src/server'
import { IAPI } from './api'

const api: IAPI = {
  echo(message: string): string {
    return message
  }
}

createServer(api, self)
