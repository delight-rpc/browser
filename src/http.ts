import * as DelightRPC from 'delight-rpc'
import { Awaitable, isNull } from '@blackglory/prelude'
import * as Base64 from 'js-base64'
import { getErrorResultAsync } from 'return-style'
import { SyncDestructor } from 'extra-defer'
import { HashMap } from '@blackglory/structures'
import { AbortController } from 'extra-abort'

export function createHTTPHandler<IAPI>(
  api: DelightRPC.ImplementationOf<IAPI>
, { basicAuth, parameterValidators, version, ownPropsOnly, channel }: {
    basicAuth?: (username: string, password: string) => Awaitable<boolean>
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    version?: `${number}.${number}.${number}`
    ownPropsOnly?: boolean
    channel?: string | RegExp | typeof DelightRPC.AnyChannel
  } = {}
): [handler: (req: Request) => Promise<Response>, close: () => void] {
  const destructor = new SyncDestructor()

  const channelIdToController: HashMap<
    {
      channel?: string
    , id: string
    }
  , AbortController
  > = new HashMap(({ channel, id }) => JSON.stringify([channel, id]))
  destructor.defer(abortAllPendings)

  const commonHeaders: HeadersInit = { 'Cache-Control': 'no-store' }

  return [handler, close]

  function close(): void {
    destructor.execute()
  }

  function abortAllPendings(): void {
    for (const controller of channelIdToController.values()) {
      controller.abort()
    }

    channelIdToController.clear()
  }

  async function handler(req: Request): Promise<Response> {
    if (basicAuth) {
      const basicAuthRegExp = /^Basic (?<credentials>[A-Za-z0-9+/=]+)$/
      const authorization = req.headers.get('authorization')
      const result = authorization?.match(basicAuthRegExp)
      if (result?.groups?.credentials) {
        const credentials = Base64.decode(result.groups.credentials)
        const [username, password] = credentials.split(':')
        if (await basicAuth(username, password)) {
          return await handleMessage(req)
        }
      }

      return new Response(null, {
        status: 401
      , headers: {
          ...commonHeaders
        , 'WWW-Authenticate': 'Basic realm="Secure Area"'
        }
      })
    } else {
      return await handleMessage(req)
    }
  }

  async function handleMessage(req: Request): Promise<Response> {
    const [error, message] = await getErrorResultAsync(() => req.json())
    if (error) {
      return new Response('The payload is not valid JSON.', {
        status: 400
      , headers: commonHeaders
      })
    }

    if (
      DelightRPC.isRequest(message) ||
      DelightRPC.isBatchRequest(message)
    ) {
      const destructor = new SyncDestructor()

      const controller = new AbortController()
      channelIdToController.set(message, controller)
      destructor.defer(() => channelIdToController.delete(message))

      try {
        const response = await DelightRPC.createResponse(
          api
        , message
        , {
            parameterValidators
          , version
          , ownPropsOnly
          , channel
          , signal: controller.signal
          }
        )

        if (isNull(response)) {
          return new Response('The server does not support this channel.', {
            status: 400
          , headers: commonHeaders
          })
        } else {
          return Response.json(response, { headers: commonHeaders })
        }
      } finally {
        destructor.execute()
      }
    } else if (DelightRPC.isAbort(message)) {
      if (DelightRPC.matchChannel(message, channel)) {
        channelIdToController.get(message)?.abort()
        channelIdToController.delete(message)

        return new Response(undefined, {
          status: 204
        , headers: commonHeaders
        })
      } else {
        return new Response('The server does not support this channel.', {
          status: 400
        , headers: commonHeaders
        })
      }
    } else {
      return new Response('The payload is not a valid Delight RPC request.', {
        status: 400
      , headers: commonHeaders
      })
    }
  }
}
