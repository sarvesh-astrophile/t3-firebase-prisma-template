import { z } from "zod";
import { TodoStatus } from "@prisma/client"; // Import enum from Prisma

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db"; // Import Prisma client

export const todoRouter = createTRPCRouter({
	create: protectedProcedure
		.input(
			z.object({
				title: z.string().min(1, "Title is required"),
				description: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return db.todo.create({
				data: {
					title: input.title,
					description: input.description,
					userId: ctx.user.uid, // Link to the authenticated user
					status: TodoStatus.TODO, // Default status
				},
			});
		}),

	getAll: protectedProcedure.query(async ({ ctx }) => {
		return db.todo.findMany({
			where: {
				userId: ctx.user.uid, // Only fetch todos for the logged-in user
			},
			orderBy: {
				createdAt: "desc", // Show newest first
			},
		});
	}),

	updateStatus: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				status: z.nativeEnum(TodoStatus), // Use the Prisma enum for validation
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// UpdateMany ensures we only update if the user owns the todo
			const { count } = await db.todo.updateMany({
				where: {
					id: input.id,
					userId: ctx.user.uid,
				},
				data: {
					status: input.status,
				},
			});
			// Optionally, check if count is 0 to throw an error if not found/authorized
			if (count === 0) {
				throw new Error("Todo not found or update failed"); // Or TRPCError
			}
			return { success: true };
		}),

	updateDetails: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				title: z.string().min(1).optional(),
				description: z.string().nullable().optional(), // Allow clearing description
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const dataToUpdate: { title?: string; description?: string | null } = {};
			if (input.title !== undefined) {
				dataToUpdate.title = input.title;
			}
			// Only include description if it's explicitly provided (even if null)
			if (input.description !== undefined) {
				dataToUpdate.description = input.description;
			}

			if (Object.keys(dataToUpdate).length === 0) {
				// Avoid unnecessary database calls if nothing is changing
				return { success: true, message: "No changes provided" };
			}

			const { count } = await db.todo.updateMany({
				where: {
					id: input.id,
					userId: ctx.user.uid,
				},
				data: dataToUpdate,
			});

			if (count === 0) {
				throw new Error("Todo not found or update failed"); // Or TRPCError
			}
			return { success: true };
		}),

	delete: protectedProcedure
		.input(
			z.object({
				id: z.number(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// deleteMany ensures we only delete if the user owns the todo
			const { count } = await db.todo.deleteMany({
				where: {
					id: input.id,
					userId: ctx.user.uid,
				},
			});

			if (count === 0) {
				throw new Error("Todo not found or delete failed"); // Or TRPCError
			}
			return { success: true };
		}),
}); 