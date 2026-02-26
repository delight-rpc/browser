import { createServer } from '@src/server.js'
import { IAPI } from './contract.js'
import { ImplementationOf } from 'delight-rpc'
import { assert } from '@blackglory/prelude'
import { delay } from 'extra-promise'

const api: ImplementationOf<IAPI> = {
  echo(message: string): string {
    return message
  }
, error(message: string): never {
    throw new Error(message)
  }
, async loop(signal?: AbortSignal): Promise<never> {
    assert(signal)

    while (!signal.aborted) {
      await delay(100)
    }

    throw signal.reason
  }
}

createServer(api, self)
