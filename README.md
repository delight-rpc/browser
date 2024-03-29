# @delight-rpc/browser
## Install
```sh
npm install --save @delight-rpc/browser
# or
yarn add @delight-rpc/browser
```

## Usage
### Web Worker
#### Main as Client, Web Worker as Server
```ts
// api.d.ts
interface IAPI {
  echo(message: string): string
}

// main.ts
import { createClient } from '@delight-rpc/browser'

const worker = new Worker('./worker.js')
const [client] = createClient<IAPI>(worker)
await client.echo('hello world')

// worker.ts
import { createServer } from '@delight-rpc/browser'

const api: IAPI = {
  echo(message) {
    return message
  }
}

createServer(api, self)
```

#### Web Worker as Client, Main as Server
```ts
// api.d.ts
interface IAPI {
  echo(message: string): string
}

// main.ts
import { createServer } from '@delight-rpc/browser'

const api: IAPI = {
  echo(message) {
    return message
  }
}

const worker = new Worker('./worker.js')
createServer(api, worker)

// worker.ts
import { createClient } from '@delight-rpc/browser'

const [client] = createClient<IAPI>(self)
await client.echo('hello world')
```

### MessageChannel
```ts
interface IAPI {
  echo(message: string): string
}

const api: IAPI = {
  echo(message) {
    return message
  }
}

const channel = new MessageChannel()
channel.port1.start()
channel.port2.start()

createServer<IAPI>(api, channel.port1)

const [client] = createClient<IAPI>(channel.port2)
await client.echo('hello world')
```

## API
### createClient
```ts
function createClient<IAPI extends object>(
  port: Window | MessagePort | Worker
, options?: {
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    expectedVersion?: string
    channel?: string
  }
): [client: DelightRPC.ClientProxy<IAPI>, close: () => void]
```

### createBatchClient
```ts
function createBatchClient<DataType>(
  port: Window | MessagePort | Worker
, options?: {
    expectedVersion?: string
    channel?: string
  }
): [client: DelightRPC.BatchClient<DataType>, close: () => void]
```

### createServer
```ts
function createServer<IAPI extends object>(
  api: DelightRPC.ImplementationOf<IAPI>
, port: Window | MessagePort | Worker
, options?: {
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    version?: `${number}.${number}.${number}`
    channel?: string | RegExp | AnyChannel
    ownPropsOnly?: boolean
  }
): () => void
```

### createHTTPHandler
```ts
function createHTTPHandler<IAPI>(
  api: DelightRPC.ImplementationOf<IAPI>
, options?: {
    basicAuth?: (username: string, password: string) => Awaitable<boolean>
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    version?: `${number}.${number}.${number}`
    ownPropsOnly?: boolean
    channel?: string | RegExp | typeof DelightRPC.AnyChannel
  }
): (req: Request) => Promise<Response>
```
