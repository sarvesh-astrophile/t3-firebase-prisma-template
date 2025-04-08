/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { unsealData } from "iron-session";
import { cookies } from "next/headers"; // Import cookies helper

import { db } from "@/server/db";

// Define session constants (consider moving to a shared file later)
const SESSION_COOKIE_NAME = "session";
// Ensure SESSION_SECRET is set in your .env file and is at least 32 characters long
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
	throw new Error(
		"SESSION_SECRET environment variable is not set or is less than 32 characters long. Please define it in your .env file.",
	);
}
const sessionPassword = process.env.SESSION_SECRET;

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: {
	headers: Headers;
	// Use an inline type for the expected shape of the cookies store
	cookies: {
		get: (name: string) => { value: string } | undefined;
		// Add other methods if needed, e.g., has, getAll
	};
}) => {
	// // Helper to get cookies from headers (No longer primary method)
	// const getCookie = (name: string): string | undefined => {
	// 	const cookieHeader = opts.headers.get("cookie");
	// 	if (!cookieHeader) return undefined;
	// 	const cookiesArr = cookieHeader.split(";").map(c => c.trim());
	// 	const cookie = cookiesArr.find(c => c.startsWith(`${name}=`));
	// 	return cookie ? cookie.split("=")[1] : undefined;
	// };

	return {
		db,
		headers: opts.headers,
		cookies: opts.cookies, // Pass the cookies store into context
		// getCookie, // Can remove this if not used elsewhere
	};
};

// Define the expected shape of the user data in the session
interface SessionUser {
	uid: string;
	// Add other properties stored in the session if needed, e.g., email
}

// Adjust context type definition if necessary (it should infer correctly)
type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
type TRPCContextWithUser = TRPCContext & {
	user?: SessionUser;
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<TRPCContext>().create({
	transformer: superjson,
	errorFormatter({ shape, error }) {
		return {
			...shape,
			data: {
				...shape.data,
				zodError:
					error.cause instanceof ZodError ? error.cause.flatten() : null,
			},
		};
	},
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
	const start = Date.now();

	if (t._config.isDev) {
		// artificial delay in dev
		const waitMs = Math.floor(Math.random() * 400) + 100;
		await new Promise((resolve) => setTimeout(resolve, waitMs));
	}

	const result = await next();

	const end = Date.now();
	console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

	return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

// Middleware to check if the user is authenticated
const isAuthenticated = t.middleware(async ({ ctx, next }) => {
	// Remove logging
	const sessionCookie = ctx.cookies.get(SESSION_COOKIE_NAME)?.value;
	// console.log('[isAuthenticated] Cookie Data:', ctx.cookies.get(SESSION_COOKIE_NAME));
	// console.log('[isAuthenticated] Cookie Value:', sessionCookie);

	if (!sessionCookie) {
		// console.error('[isAuthenticated] No session cookie found.');
		throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated." });
	}

	try {
		const sessionData = await unsealData<SessionUser>(sessionCookie, {
			password: sessionPassword,
		});

		if (!sessionData?.uid) {
			// console.error('[isAuthenticated] Invalid session data after unsealing.');
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Invalid session data.",
			});
		}

		// console.log('[isAuthenticated] Authentication successful for UID:', sessionData.uid);
		return next({
			ctx: {
				...ctx,
				user: sessionData,
			} satisfies TRPCContextWithUser,
		});
	} catch (error) {
		// console.error("[isAuthenticated] Session unsealing failed:", error);
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Invalid or expired session.",
			cause: error instanceof Error ? error : undefined,
		});
	}
});

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged-in users, use this. It verifies
 * the session is valid and guarantees `ctx.user` is present.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure.use(timingMiddleware).use(isAuthenticated);
