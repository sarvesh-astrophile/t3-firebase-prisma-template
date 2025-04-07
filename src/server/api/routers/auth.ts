import { z } from "zod";
import { cookies } from "next/headers";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { auth as adminAuth } from "@/lib/firebase-admin"; // Correct import

const SESSION_COOKIE_NAME = "session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 5; // 5 days

export const authRouter = createTRPCRouter({
  createSession: publicProcedure
    .input(z.object({ idToken: z.string() }))
    .mutation(async ({ input }) => {
      const cookieStore = await cookies(); // Get cookie store and await it
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

        // Create the session cookie.
        // IMPORTANT: In a real app, use a robust session library (like iron-session)
        // to encrypt/sign the cookie content. Storing the token directly is NOT secure for production.
        // For this example, we'll store the token (replace with proper session data).
        const sessionCookie = input.idToken; // Replace with actual session data/token

        await cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, { // Use cookie store
          httpOnly: true,
          secure: process.env.NODE_ENV === "production", // Use secure cookies in production
          maxAge: SESSION_DURATION_SECONDS,
          path: "/", // Cookie available across the entire site
          sameSite: "lax", // Protects against CSRF attacks
        });

        console.log("Session cookie created for UID:", decodedToken.uid);
        return { success: true };
      } catch (error) {
        console.error("Error creating session:", error);
        // Throw a TRPCError so the client knows it failed
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create session.",
          cause: error, // Optional: include the original error cause
        });
      }
    }),

  deleteSession: publicProcedure.mutation(async () => {
    const cookieStore = await cookies(); // Get cookie store and await it
    try {
      // Clear the session cookie
      await cookieStore.delete(SESSION_COOKIE_NAME); // Use cookie store
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