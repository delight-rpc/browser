import { describe, test, expect } from 'vitest'
import { ClientProxy, createClient, ImplementationOf } from 'delight-rpc'
import { createHTTPHandler } from '@src/http.js'
import { post } from 'extra-request'
import { url, json, basicAuth } from 'extra-request/transformers'
import { assert, JSONValue } from '@blackglory/prelude'
import { ok, toJSON } from 'extra-response'
import { IResponse } from '@delight-rpc/protocol'
import { getErrorPromise } from 'return-style'
import { Unauthorized } from '@blackglory/http-status'
import { delay } from 'extra-promise'

interface IAPI {
  echo(message: string): string
  error(message: string): never
  loop(): never
}

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

describe('createHTTPHandler', () => {
  test('result', async () => {
    const [client, close] = createMockHTTPClient()

    const result = await client.echo('foo')
    close()

    expect(result).toBe('foo')
  })

  test('error', async () => {
    const [client, close] = createMockHTTPClient()

    const err = await getErrorPromise(client.error('foo'))
    close()

    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toBe('foo')
  })

  test('abort', async () => {
    const [client, close] = createMockHTTPClient()
    const controller = new AbortController()

    const promise = getErrorPromise(client.error('foo'))
    controller.abort()
    const err = await promise
    close()

    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toBe('foo')
  })

  function createMockHTTPClient(): [client: ClientProxy<IAPI>, close: () => void] {
    const [handler, close] = createHTTPHandler<IAPI>(api)
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

    return [client, close]
  }

  describe('basic auth', () => {
    test('authorized', async () => {
      const [client, close] = createMockHTTPClient('username', 'password')

      const result = await client.echo('foo')
      close()

      expect(result).toBe('foo')
    })

    test('unauthorized', async () => {
      const [client, close] = createMockHTTPClient('password', 'username')

      const err = await getErrorPromise(client.echo('foo'))
      close()

      expect(err).toBeInstanceOf(Unauthorized)
    })

    test('no basic auth', async () => {
      const [client, close] = createMockHTTPClient()

      const err = await getErrorPromise(client.echo('foo'))
      close()

      expect(err).toBeInstanceOf(Unauthorized)
    })

    function createMockHTTPClient(
      username?: string
    , password?: string
    ): [client: ClientProxy<IAPI>, close: () => void] {
      const [handler, close] = createHTTPHandler<IAPI>(api, {
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

      return [client, close]
    }
  })
})
