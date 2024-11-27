import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, Outlet, redirect, useLocation } from "@remix-run/react";
import { useAsyncFetcher } from "remix-use-async-fetcher";

export const meta: MetaFunction = () => {
  return [{ title: "useAsyncFetcher Demo" }];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.pathname === "/app") {
    return redirect("/app/infinite-list");
  }

  return null;
};

export default function Index() {
  const fetcher = useAsyncFetcher();
  const isInfiniteListRoute = useLocation().pathname === "/app/infinite-list";
  const isMutationsRoute = useLocation().pathname === "/app/todos";

  return (
    <div className="flex h-screen  pt-[120px] justify-center">
      <div className="flex flex-col items-center gap-16">
        <header className="flex flex-col items-center gap-9">
          <h1 className="leading text-2xl font-bold text-gray-800 dark:text-gray-100">
            useAsyncFetcher Demo
          </h1>
        </header>
        <ul className="flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:border-gray-700 dark:text-gray-400">
          <li className="me-2">
            <TabLink to="/app/infinite-list" active={isInfiniteListRoute}>
              Infinite List with SSR Example
            </TabLink>
          </li>
          <li className="me-2">
            <TabLink to="/app/todos" active={isMutationsRoute}>
              Mutations Example
            </TabLink>
          </li>
        </ul>
        <div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function TabLink({
  to,
  children,
  active,
}: {
  to: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`inline-block p-4 rounded-t-lg active ${active ? "text-blue-600 dark:text-blue-500 bg-gray-100 dark:bg-gray-800" : "hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-300"}`}
    >
      {children}
    </Link>
  );
}

export const shouldRevalidate = () => {
  return false;
};
