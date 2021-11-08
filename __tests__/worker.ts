import { createServer } from '@src/server'

const API = {
  echo(message: string): string {
    return message
  }
}

createServer(API, self)
