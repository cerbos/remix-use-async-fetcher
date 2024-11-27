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
    content: "This is a fake todo item",
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
        }
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
            }
          );
          break;

        case "remove":
          getQueryClient().setQueriesData<Todo[]>(
            { queryKey: ["todos"] },
            (prev) => {
              return (prev ?? []).filter((todo) => todo.id !== variables.id);
            }
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
        }
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
            className="p-1 rounded-md"
            placeholder="Enter a todo item"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addTodo();
              }
            }}
          />
          <button onClick={addTodo}>Add todo</button>
        </div>

        <div className="flex flex-col gap-1">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center justify-between p-2 bg-gray-900 rounded-md"
            >
              {todo.content}

              {!todo.id.startsWith("placeholderId_") ? (
                <button
                  type="button"
                  className="hover:bg-gray-700 h-8 w-8 flex items-center rounded-lg justify-center"
                  onClick={() => {
                    todoActions.mutate({ action: "remove", id: todo.id });
                  }}
                >
                  x
                </button>
              ) : (
                <div className="h-8" />
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
