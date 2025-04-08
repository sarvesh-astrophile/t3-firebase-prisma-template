"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { TodoStatus, type Todo } from "@prisma/client";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, PlusCircle, Trash2, Loader2, FileWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge"; // For status display
import { useAuth } from "@/context/auth-context"; // <-- Import useAuth

// Validation schemas for forms
const todoFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});
type TodoFormData = z.infer<typeof todoFormSchema>;

const todoEditFormSchema = z.object({
  title: z.string().min(1, "Title is required").optional(), // Optional for update
  description: z.string().nullable().optional(), // Allow clearing
});
type TodoEditFormData = z.infer<typeof todoEditFormSchema>;

// Helper to get badge variant based on status
const getStatusVariant = (
  status: TodoStatus
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case TodoStatus.DONE:
      return "default"; // Or maybe a success variant if you add one
    case TodoStatus.IN_PROGRESS:
      return "secondary";
    case TodoStatus.CANCELED:
      return "destructive";
    case TodoStatus.TODO:
    case TodoStatus.BACKLOG:
      return "outline";
    default:
      return "outline";
  }
};

export function TodoList() {
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  const utils = api.useUtils();
  const { isServerSessionReady } = useAuth(); // <-- Get session ready state

  // Fetch Todos Query - enable only when server session is ready
  const {
    data: todos,
    isLoading,
    error,
  } = api.todo.getAll.useQuery(
    undefined, // No input needed for getAll
    {
      enabled: isServerSessionReady, // <-- Conditionally enable query
    }
  );

  // --- Mutations --- //

  // Create Todo Mutation
  const createTodo = api.todo.create.useMutation({
    onSuccess: () => {
      toast.success("Todo created successfully!");
      utils.todo.getAll.invalidate(); // Refetch todos
      setCreateDialogOpen(false); // Close dialog
    },
    onError: (err) => {
      toast.error(`Failed to create todo: ${err.message}`);
    },
  });

  // Update Status Mutation
  const updateStatus = api.todo.updateStatus.useMutation({
    onSuccess: (_, variables) => {
      toast.success(`Todo status updated to ${variables.status}`);
      utils.todo.getAll.invalidate();
    },
    onError: (err) => {
      toast.error(`Failed to update status: ${err.message}`);
    },
  });

  // Update Details Mutation
  const updateDetails = api.todo.updateDetails.useMutation({
    onSuccess: () => {
      toast.success("Todo details updated!");
      utils.todo.getAll.invalidate();
      setEditDialogOpen(false);
      setEditingTodo(null);
    },
    onError: (err) => {
      toast.error(`Failed to update details: ${err.message}`);
    },
  });

  // Delete Todo Mutation
  const deleteTodo = api.todo.delete.useMutation({
    onSuccess: () => {
      toast.success("Todo deleted successfully!");
      utils.todo.getAll.invalidate();
    },
    onError: (err) => {
      toast.error(`Failed to delete todo: ${err.message}`);
    },
  });

  // --- Forms --- //

  // Create Form
  const createForm = useForm<TodoFormData>({
    resolver: zodResolver(todoFormSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const onCreateSubmit = (data: TodoFormData) => {
    createTodo.mutate(data);
  };

  // Edit Form
  const editForm = useForm<TodoEditFormData>({
    resolver: zodResolver(todoEditFormSchema),
  });

  const onEditSubmit = (data: TodoEditFormData) => {
    if (!editingTodo) return;
    updateDetails.mutate({
      id: editingTodo.id,
      // Only send fields if they have values (or are null for description)
      title: data.title || undefined,
      description:
        data.description !== undefined ? data.description : undefined,
    });
  };

  // Helper function to open edit dialog
  const handleEditClick = (todo: Todo) => {
    setEditingTodo(todo);
    editForm.reset({ title: todo.title, description: todo.description });
    setEditDialogOpen(true);
  };

  // --- Render Logic --- //

  // Display loading skeleton ONLY if the query is enabled and actually loading
  if (isLoading && isServerSessionReady) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" /> {/* Add Todo button skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Skeleton className="h-8 w-20" />
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Display error if the query is enabled and encounters an error
  if (error && isServerSessionReady) {
    return (
      <p className="text-destructive">Error loading todos: {error.message}</p>
    );
  }

  // Show loading or informational state before session is ready
  if (!isServerSessionReady && !error) {
    // Avoid showing this if there was an auth context error
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-8 text-center">
        <Loader2 className="size-10 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Checking authentication...</p>
      </div>
    );
  }

  // Check for empty state *after* session is ready and query hasn't errored
  if (isServerSessionReady && todos?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-dashed p-8 text-center">
        <FileWarning className="size-10 text-muted-foreground" />
        <h3 className="text-xl font-semibold">No Todos Yet!</h3>
        <p className="text-muted-foreground">
          Click the button below to add your first todo.
        </p>
        <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 size-4" /> Add New Todo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)}>
              <DialogHeader>
                <DialogTitle>Create New Todo</DialogTitle>
                <DialogDescription>
                  Fill in the details for your new task.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Title
                  </Label>
                  <Input
                    id="title"
                    {...createForm.register("title")}
                    className="col-span-3"
                    aria-invalid={!!createForm.formState.errors.title}
                  />
                </div>
                {createForm.formState.errors.title && (
                  <p className="col-span-4 text-right text-sm text-destructive">
                    {createForm.formState.errors.title.message}
                  </p>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    {...createForm.register("description")}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={createTodo.isPending}>
                  {createTodo.isPending && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Save Todo
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Render todo list only if session is ready and todos exist
  if (isServerSessionReady && todos && todos.length > 0) {
    return (
      <div className="space-y-6">
        {/* --- Add Todo Button & Dialog (Main) --- */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 size-4" /> Add New Todo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)}>
              <DialogHeader>
                <DialogTitle>Create New Todo</DialogTitle>
                <DialogDescription>
                  Fill in the details for your new task.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Title
                  </Label>
                  <Input
                    id="title"
                    {...createForm.register("title")}
                    className="col-span-3"
                    aria-invalid={!!createForm.formState.errors.title}
                  />
                </div>
                {createForm.formState.errors.title && (
                  <p className="col-span-4 text-right text-sm text-destructive">
                    {createForm.formState.errors.title.message}
                  </p>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    {...createForm.register("description")}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={createTodo.isPending}>
                  {createTodo.isPending && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Save Todo
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* --- Todo List Grid --- */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {todos.map((todo) => (
            <Card key={todo.id}>
              <CardHeader>
                <CardTitle>{todo.title}</CardTitle>
                <CardDescription>
                  Created: {format(new Date(todo.createdAt), "PPp")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {todo.description && (
                  <p className="text-sm text-muted-foreground">
                    {todo.description}
                  </p>
                )}
                <Badge variant={getStatusVariant(todo.status)}>
                  {todo.status.replace("_", " ")}
                </Badge>
              </CardContent>
              <CardFooter className="flex items-center justify-between">
                {/* Status Select */}
                <Select
                  value={todo.status}
                  onValueChange={(newStatus) => {
                    updateStatus.mutate({
                      id: todo.id,
                      status: newStatus as TodoStatus,
                    });
                  }}
                  disabled={updateStatus.isPending}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Change status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TodoStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  {/* Edit Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEditClick(todo)}
                    disabled={updateDetails.isPending}
                  >
                    <Pencil className="size-4" />
                  </Button>

                  {/* Delete Button & Dialog */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        disabled={deleteTodo.isPending}
                      >
                        {deleteTodo.isPending &&
                        deleteTodo.variables?.id === todo.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete the todo "{todo.title}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction asChild>
                          <Button
                            onClick={() => deleteTodo.mutate({ id: todo.id })}
                            disabled={deleteTodo.isPending}
                          >
                            {deleteTodo.isPending &&
                              deleteTodo.variables?.id === todo.id && (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                              )}
                            Delete
                          </Button>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* --- Edit Todo Dialog --- */}
        <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={editForm.handleSubmit(onEditSubmit)}>
              <DialogHeader>
                <DialogTitle>Edit Todo</DialogTitle>
                <DialogDescription>
                  Make changes to your todo item.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-title" className="text-right">
                    Title
                  </Label>
                  <Input
                    id="edit-title"
                    {...editForm.register("title")}
                    className="col-span-3"
                    aria-invalid={!!editForm.formState.errors.title}
                  />
                </div>
                {editForm.formState.errors.title && (
                  <p className="col-span-4 text-right text-sm text-destructive">
                    {editForm.formState.errors.title.message}
                  </p>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="edit-description"
                    {...editForm.register("description")}
                    className="col-span-3"
                    placeholder="(Optional)"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingTodo(null)} // Clear editing state on cancel
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={updateDetails.isPending}>
                  {updateDetails.isPending && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Fallback case (should ideally not be reached if logic above is correct)
  return null;
}
