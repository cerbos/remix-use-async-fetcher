# remix-use-async-fetcher

## Warning
This is not yet published and its here for demonstration purposes.

## Motivation
Remix's BFF concept is great but it also have some limitations. For example implementing infinite scrolling might be challenging and you might prefer to use React Query for that. This package provides an easy way to asynchronously call `serverLoader` or `serverAction` functions to ease React Query usage in a Remix app.


## Installation

Currently there is no npm package so you'd need to install this directly from a git source;

pnpm:
```console
pnpm add https://github.com/cerbos/remix-use-async-fetcher
```

npm:
```console
npm install https://github.com/cerbos/remix-use-async-fetcher
```


yarn:
```console
yarn add https://github.com/cerbos/remix-use-async-fetcher
``````

## Setup
### Option 1 (Simple)
On the route loaders/actions that you need to use `useAsyncFetcher` add following;

```typescript
import {handleServerFnResponse} from "remix-use-async-fetcher";

export const clientLoader = handleServerFnResponse;
export const clientAction = handleServerFnResponse;
```
### Option 2 (Advanced)
If you are have `clientLoader` and/or `clientAction` functions and you want to preserve that while being able to use `useAsyncFetcher` call `handleServerFnResponse` in your client function:

```typescript
import {handleServerFnResponse} from "remix-use-async-fetcher";

export const clientLoader = (args)=>{
    // this is where you can place other logic.

    const serverResponse = await handleServerFnResponse(args);

    // this is where you can place other logic.

    return serverResponse
}

```


### Using
For the server functions where you implemented `clientLoader` and/or `clientAction` functions as shown in the setup; you can call `useAsyncFetcher.fetch(path)` or `useAsyncFetcher.submit(data, options)`. Parameters of submit and fetch functions are the same as the original `useFetcher`'s submit and fetch functions.


### Demo
run `npm install & npm run dev` in the demo folder to see how this is used with `@tanstack/react-query`


### A note about `__request-id`
For each request made using `useAsyncFetcher`, a search param with `__request-id` as key is added. In server loader or action functions, using request URLs directly when building redirect URLs might be problematic. If you don't sanitize the redirect URL, this may inadvertently redirect the client to a URL containing `__request-id`.


### isAsyncFetcherRequest
In some cases, in `clientLoader` or `clientAction` functions, you might want to check if the request was made using `useAsyncFetcher` or something else, `isAsyncFetcher(request)` call return true if the request was triggered by `useAsyncFetcher`.
