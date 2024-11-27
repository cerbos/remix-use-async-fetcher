import { MetaFunction, ActionFunctionArgs } from "@remix-run/node";
import { ClientLoaderFunctionArgs, useLoaderData } from "@remix-run/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import {
  isAsyncFetcherRequest,
  handleServerFnResponse,
  useAsyncFetcher,
} from "remix-use-async-fetcher";
import { getQueryClient } from "../query-client";

export const meta: MetaFunction = () => {
  return [{ title: "useAsyncFetcher Demo" }];
};

interface Todo {
  id: string;
  content: string;
}

let fakeDb: Todo[] = [
  {
    id: "123",
    content: "This is your first todo item",
  },
];

interface AddTodoAction {
  action: "add";
  content: string;
}

interface RemoveTodoAction {
  action: "remove";
  id: string;
}

type TodoAction = AddTodoAction | RemoveTodoAction;

export const loader = async () => {
  await new Promise((r) => setTimeout(r, 500));
  return fakeDb;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await new Promise((r) => setTimeout(r, 300));

  const payload = (await request.json()) as AddTodoAction | RemoveTodoAction;

  switch (payload.action) {
    case "add":
      fakeDb.push({ id: Math.random().toString(), content: payload.content });
      break;
    case "remove":
      fakeDb = fakeDb.filter((todo) => todo.id !== payload.id);
      break;
  }

  return null;
};

export default function Index() {
  const loaderData = useLoaderData<Todo[]>();

  const asyncFetcher = useAsyncFetcher();

  const { data: todos } = useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      return await asyncFetcher.fetch<Todo[]>("/app/todos");
    },
    initialData: loaderData,
    // this is to prevent unnecessary call to the server loader
    // on the initial render of this route because we already
    // have the data returned from the useLoaderData call.
    initialDataUpdatedAt: Date.now() + 200,
  });

  const todoActions = useMutation({
    mutationFn: async (action: TodoAction) => {
      return await asyncFetcher.submit(
        //@ts-expect-error
        action,
        {
          action: "/app/todos",
          encType: "application/json",
          method: "POST",
        },
      );
    },
    onSuccess: (_, variables) => {
      switch (variables.action) {
        case "add":
          getQueryClient().setQueriesData<Todo[]>(
            { queryKey: ["todos"] },
            (prev) => {
              return [
                ...(prev ?? []),
                {
                  id: `placeholderId_${Math.random().toString()}`,
                  content: variables.content,
                },
              ];
            },
          );
          break;

        case "remove":
          getQueryClient().setQueriesData<Todo[]>(
            { queryKey: ["todos"] },
            (prev) => {
              return (prev ?? []).filter((todo) => todo.id !== variables.id);
            },
          );
          break;
      }

      getQueryClient().invalidateQueries({ queryKey: ["todos"] });
    },
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const addTodo = () => {
    const inputValue = inputRef.current?.value;
    if (inputValue) {
      todoActions.mutate(
        { action: "add", content: inputValue },
        {
          onSuccess: () => {
            if (inputRef.current) {
              inputRef.current.value = "";
            }
          },
        },
      );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p>
        This mutations example uses React Query's useQuery to fetch and
        useMutation to update the data.
      </p>

      <p>
        This route also prevents calling the server loader if React Query's
        cache already has the data. For implementation details see clientLoader
        of this route
      </p>

      <div className="flex flex-col gap-4 border rounded-md p-4 border-gray-500">
        <h2 className="self-center font-bold">Todo App</h2>
        <div className="flex self-center gap-4">
          <input
            ref={inputRef}
            className="p-1 rounded-md border"
            placeholder="Enter a todo item"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addTodo();
              }
            }}
          />
          <button
            onClick={addTodo}
            className="p-1 border rounded-md px-4 enabled:hover:bg-gray-300 enabled:hover:dark:!bg-gray-700"
            disabled={todoActions.isPending}
          >
            Add todo
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center justify-between p-2 dark:bg-gray-900 bg-gray-200 rounded-md "
            >
              {todo.content}

              {!todo.id.startsWith("placeholderId_") ? (
                <button
                  type="button"
                  className=" enabled:hover:dark:!bg-gray-700 enabled:hover:bg-gray-300 h-8 w-8 flex items-center rounded-lg justify-center"
                  onClick={() => {
                    todoActions.mutate({ action: "remove", id: todo.id });
                  }}
                >
                  x
                </button>
              ) : (
                <div role="status h-8">
                  <svg
                    aria-hidden="true"
                    className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                    />
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="currentFill"
                    />
                  </svg>
                  <span className="sr-only">Loading...</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const clientLoader = async (args: ClientLoaderFunctionArgs) => {
  if (isAsyncFetcherRequest(args.request)) {
    // if this is an async fetcher request, call handleServerFnResponse.
    return await handleServerFnResponse(args);
  } else {
    // if this is not an async fetcher request, prefer react-query cache. If the cache is empty, call the serverLoader.
    return (
      getQueryClient().getQueryData(["todos"]) ?? (await args.serverLoader())
    );
  }
};

export const clientAction = handleServerFnResponse;
