import "@ungap/with-resolvers";

declare global {
  interface PromiseWithResolvers<T> {
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
    promise: Promise<T>;
  }

  interface PromiseConstructor {
    withResolvers<T>(): PromiseWithResolvers<T>;
  }
}
