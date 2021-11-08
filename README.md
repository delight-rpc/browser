# @delight-rpc/browser

## Install

```sh
npm install --save @delight-rpc/browser
# or
yarn add @delight-rpc/browser
```

## API

### createClient

```ts
function createClient<IAPI extends object>(
  port: Window | MessagePort | Worker
): DelightRPC.RequestProxy<IAPI>
```

### createServer

```ts
function createServer<IAPI extends object>(
  api: IAPI
, port: Window | MessagePort | Worker
): () => void
```
