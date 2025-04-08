import { z } from "zod";
import { cookies } from "next/headers";
import { TRPCError } from "@trpc/server";
import { sealData } from "iron-session";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { auth as adminAuth } from "@/lib/firebase-admin"; // Correct import
import { db } from "@/server/db"; // Added import for Prisma client

const SESSION_COOKIE_NAME = "session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 5; // 5 days

// Session options for iron-session
// Ensure SESSION_SECRET is set in your .env file and is at least 32 characters long
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error(
    "SESSION_SECRET environment variable is not set or is less than 32 characters long. Please define it in your .env file.",
  );
}

const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: SESSION_COOKIE_NAME,
  cookieOptions: {
    httpOnly: true, // REVERT BACK TO TRUE
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    maxAge: SESSION_DURATION_SECONDS, // Use maxAge directly here if preferred, otherwise calculate expires
    path: "/", // Cookie available across the entire site
    sameSite: "lax" as const, // Protects against CSRF attacks, use 'lax' or 'strict'
  },
};

export const authRouter = createTRPCRouter({
  createSession: publicProcedure
    .input(z.object({ idToken: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const cookieStore = await cookies(); // Get cookie store
      try {
        // Verify the ID token
        const decodedToken = await adminAuth.verifyIdToken(input.idToken);

        // Basic check if token is valid
        if (!decodedToken.uid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid ID token.",
          });
        }

        // Upsert user in the database
        await ctx.db.user.upsert({
          where: { id: decodedToken.uid },
          update: { email: decodedToken.email ?? null }, // Update email if user exists
          create: {
            id: decodedToken.uid,
            email: decodedToken.email ?? null, // Create user with email (or null if not present)
          },
        });
        console.log("User synced with database:", decodedToken.uid);

        // Prepare session data - include only necessary, non-sensitive info
        const sessionData = {
          uid: decodedToken.uid,
          // Add other relevant data if needed, e.g., roles, email
          // email: decodedToken.email, // Email is now in DB, maybe not needed in session
        };

        // Encrypt the session data using iron-session
        const sealedSession = await sealData(sessionData, sessionOptions);

        // Set the encrypted session cookie
        const cookieStore = await cookies(); // Get cookie store
        cookieStore.set(
          sessionOptions.cookieName, // Use name from options
          sealedSession, // Use the sealed data
          sessionOptions.cookieOptions // Pass the cookie options
        );

        console.log("Secure session cookie created for UID:", decodedToken.uid);
        return { success: true };
      } catch (error) {
        console.error("Error creating session or syncing user:", error);
        // Throw a TRPCError so the client knows it failed
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create session or sync user.",
          cause: error, // Optional: include the original error cause
        });
      }
    }),

  deleteSession: publicProcedure.mutation(async () => {
    const cookieStore = await cookies(); // Get cookie store
    try {
      // Clear the session cookie using the name from options
      cookieStore.delete(sessionOptions.cookieName);
      console.log("Session cookie deleted.");
      return { success: true };
    } catch (error) {
      console.error("Error deleting session:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete session.",
        cause: error,
      });
    }
  }),
}); 