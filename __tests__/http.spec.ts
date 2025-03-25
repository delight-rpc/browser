import { describe, it, expect } from 'vitest'
import { ClientProxy, createClient } from 'delight-rpc'
import { createHTTPHandler } from '@src/http.js'
import { post } from 'extra-request'
import { url, json, basicAuth } from 'extra-request/transformers'
import { JSONValue } from '@blackglory/prelude'
import { ok, toJSON } from 'extra-response'
import { IResponse } from '@delight-rpc/protocol'
import { getErrorPromise } from 'return-style'
import { Unauthorized } from '@blackglory/http-status'

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

describe('createHTTPHandler', () => {
  it('echo', async () => {
    const client = createHTTPClient()

    const result = await client.echo('hello')

    expect(result).toBe('hello')
  })

  it('error', async () => {
    const client = createHTTPClient()

    const err = await getErrorPromise(client.error('hello'))

    expect(err).toBeInstanceOf(Error)
    expect(err!.message).toBe('hello')
  })

  function createHTTPClient(): ClientProxy<IAPI> {
    const handler = createHTTPHandler<IAPI>(api)
    const client = createClient<IAPI, JSONValue>(async request => {
      return await handler(
        post(
          url('http://localhost')
        , json(request as JSONValue)
        )
      )
        .then(ok)
        .then(toJSON<IResponse<JSONValue>>)
    })

    return client
  }

  describe('basic auth', () => {
    it('authorized', async () => {
      const client = createHTTPClient('username', 'password')

      const result = await client.echo('hello')

      expect(result).toBe('hello')
    })

    it('unauthorized', async () => {
      const client = createHTTPClient('password', 'username')

      const err = await getErrorPromise(client.echo('hello'))

      expect(err).toBeInstanceOf(Unauthorized)
    })

    it('no basic auth', async () => {
      const client = createHTTPClient()

      const err = await getErrorPromise(client.echo('hello'))

      expect(err).toBeInstanceOf(Unauthorized)
    })

    function createHTTPClient(
      username?: string
    , password?: string
    ): ClientProxy<IAPI> {
      const handler = createHTTPHandler<IAPI>(api, {
        basicAuth(username, password) {
          return username === 'username'
              && password === 'password'
        }
      })
      const client = createClient<IAPI, JSONValue>(async request => {
        return await handler(
          post(
            url('http://localhost')
          , json(request as JSONValue)
          , (username && password) && basicAuth(username, password)
          )
        )
          .then(ok)
          .then(toJSON<IResponse<JSONValue>>)
      })

      return client
    }
  })
})
