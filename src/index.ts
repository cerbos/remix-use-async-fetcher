import { nanoid } from "nanoid";
import { useCallback } from "react";
import {
  ClientActionFunctionArgs,
  ClientLoaderFunctionArgs,
  useFetcher,
} from "@remix-run/react";
import "./promise-with-resolvers";

const asyncFetcherQueries: Map<string, PromiseWithResolvers<unknown>> = new Map<
  string,
  PromiseWithResolvers<unknown>
>();

const requestIdKey = "__request-id";

export function useAsyncFetcher(): <T>(href: string) => Promise<T> {
  const originalFetcher = useFetcher();

  const fetch = useCallback(
    async <T>(href: string): Promise<T> => {
      const requestId = nanoid();

      // append the request ID
      href = href.includes("?")
        ? `${href}&${requestIdKey}=${requestId}`
        : `${href}?${requestIdKey}=${requestId}`;

      const promiseWithResolvers = Promise.withResolvers<T>();

      // store promiseWithResolvers keyed by request ID
      asyncFetcherQueries.set(
        requestId,
        promiseWithResolvers as PromiseWithResolvers<unknown>,
      );

      // initiate loader call
      originalFetcher.load(href);

      // return the promise.
      return await promiseWithResolvers.promise;
    },
    [originalFetcher],
  );

  return fetch;
}

export async function handleServerForAsyncFetcher(
  args: ClientLoaderFunctionArgs | ClientActionFunctionArgs,
): Promise<unknown> {
  const { request } = args;
  const serverFn =
    "serverLoader" in args ? args.serverLoader : args.serverAction;

  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get(requestIdKey);

  try {
    // call the server action/loader
    const serverResponse = await serverFn();

    // if request ID is present, resolve the promise with the server data
    if (requestId) {
      // This is undocumented, but if you do a redirect in the loader,
      // `serverLoader()` will resolve to a Response object.
      // When we encounter a Response object we treat that as a fetch
      // error. Since we are planning to use @tanstack/react-query
      // we can rely on it retrying the request afterwards.
      if (serverResponse instanceof Response) {
        asyncFetcherQueries
          .get(requestId)
          ?.reject(new Error("Encountered a Response object"));
      } else {
        asyncFetcherQueries.get(requestId)?.resolve(serverResponse);
        asyncFetcherQueries.delete(requestId);
      }
    }

    // Return the data to ensure Remix's
    // data hooks function as expected.
    return serverResponse;
  } catch (e) {
    if (!requestId) {
      // rethrow when there is no Request ID
      // to ensure Remix's data hooks function
      // as expected.
      throw e;
    }

    asyncFetcherQueries.get(requestId)?.reject(e);
    asyncFetcherQueries.delete(requestId);
    return null;
  }
}
