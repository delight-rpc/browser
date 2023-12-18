import * as DelightRPC from 'delight-rpc'
import { Awaitable, isNull } from '@blackglory/prelude'
import * as Base64 from 'js-base64'

export function createHTTPHandler<IAPI>(
  api: DelightRPC.ImplementationOf<IAPI>
, { basicAuth, parameterValidators, version, ownPropsOnly, channel }: {
    basicAuth?: (username: string, password: string) => Awaitable<boolean>
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    version?: `${number}.${number}.${number}`
    ownPropsOnly?: boolean
    channel?: string | RegExp | typeof DelightRPC.AnyChannel
  } = {}
): (req: Request) => Promise<Response> {
  const commonHeaders: HeadersInit = {
    'Cache-Control': 'no-store'
  }

  return async function (req: Request): Promise<Response> {
    if (basicAuth) {
      const basicAuthRegExp = /^Basic (?<credentials>[A-Za-z0-9+/=]+)$/
      const authorization = req.headers.get('authorization')
      const result = authorization?.match(basicAuthRegExp)
      if (result?.groups?.credentials) {
        const credentials = Base64.decode(result.groups.credentials)
        const [username, password] = credentials.split(':')
        if (await basicAuth(username, password)) {
          return await handle(req)
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
      return await handle(req)
    }
  }

  async function handle(req: Request): Promise<Response> {
    const request = await req.json()
    if (DelightRPC.isRequest(request) || DelightRPC.isBatchRequest(request)) {
      const response = await DelightRPC.createResponse(
        api
      , request
      , {
          parameterValidators
        , version
        , ownPropsOnly
        , channel
        }
      )

      if (isNull(response)) {
        return new Response('The server does not support channel', {
          status: 400
        , headers: commonHeaders
        })
      } else {
        return Response.json(response, { headers: commonHeaders })
      }
    } else {
      return new Response('The payload is not a valid Delight RPC request.', {
        status: 400
      , headers: commonHeaders
      })
    }
  }
}
