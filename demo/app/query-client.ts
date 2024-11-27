import { QueryClient } from "@tanstack/react-query";
const browserQueryClient = new QueryClient();

export function getQueryClient(): QueryClient {
  return globalThis.window ? browserQueryClient : new QueryClient();
}
