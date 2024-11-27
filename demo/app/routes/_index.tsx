import { redirect, MetaFunction } from "@remix-run/node";

export const loader = async () => {
  return redirect("/app");
};

export const meta: MetaFunction = () => {
  return [{ title: "useAsyncFetcher Demo" }];
};
