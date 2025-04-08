import { TodoList } from "./_components/TodoList";
import { HydrateClient } from "@/trpc/server";

function TodoPage() {
  return (
    <HydrateClient>
      {" "}
      {/* Ensure client components are hydrated */}
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <h1 className="mb-6 text-2xl font-bold">My Todos</h1>
        <TodoList />
      </div>
    </HydrateClient>
  );
}

export default TodoPage;
