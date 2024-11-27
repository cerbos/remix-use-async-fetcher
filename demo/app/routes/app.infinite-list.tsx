import { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import {
  handleServerFnResponse,
  useAsyncFetcher,
} from "remix-use-async-fetcher";

export const meta: MetaFunction = () => {
  return [{ title: "useAsyncFetcher Demo" }];
};

interface ListResponse {
  results: string[];
  next: string | null;
  prev: string | null;
}
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const pageParam = url.searchParams.get("page");

  const page = pageParam ? parseInt(pageParam, 10) : 0;

  const limit = 20;
  const offset = page * limit;

  const rows = new Array(limit)
    .fill(0)
    .map((_, i) => `Async loaded row #${i + offset * limit}`);

  await new Promise((r) => setTimeout(r, 500));

  return {
    results: rows,
    next: `${url.pathname}?page=${page + 1}`,
    prev: page > 0 ? `${url.pathname}?page=${page - 1}` : null,
  };
};

export default function Index() {
  const loaderData = useLoaderData<ListResponse>();
  const asyncFetcher = useAsyncFetcher();

  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    status,
    error,
    isFetching,
  } = useInfiniteQuery({
    initialData: {
      pages: [loaderData],
      pageParams: ["/app/infinite-list"],
    },
    queryKey: ["infinite-list"],
    queryFn: async ({ pageParam }) => await asyncFetcher.fetch(pageParam),
    getNextPageParam: (lastPage) => lastPage.next,
    getPreviousPageParam: (firstPage) => firstPage.prev,
    initialPageParam: "/app/infinite-list",
  });

  const allRows = data ? data.pages.flatMap((d) => d.results) : [];

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? allRows.length + 1 : allRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();

    if (!lastItem) {
      return;
    }

    if (
      lastItem.index >= allRows.length - 50 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    allRows.length,
    isFetchingNextPage,
    rowVirtualizer.getVirtualItems(),
  ]);

  return (
    <div>
      <p>
        This infinite scroll example uses React Query's useInfiniteScroll hook
        to fetch infinite data from a serverLoader with the help of
        useAsyncFetcher.
      </p>

      <br />
      <br />

      {status === "error" ? (
        <span>Error: {error.message}</span>
      ) : (
        <div
          ref={parentRef}
          className="List"
          style={{
            height: `500px`,
            width: `100%`,
            overflow: "auto",
          }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const isLoaderRow = virtualRow.index > allRows.length - 1;
              const character = allRows[virtualRow.index];

              return (
                <div
                  key={virtualRow.index}
                  className={`${virtualRow.index % 2 ? "bg-gray-900" : ""} flex items-center justify-center`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {isLoaderRow
                    ? hasNextPage
                      ? "Loading more..."
                      : "Nothing more to load"
                    : character}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div>
        {isFetching && !isFetchingNextPage ? "Background Updating..." : null}
      </div>
    </div>
  );
}

export const clientLoader = handleServerFnResponse;
