import { z } from "zod";
import { cookies } from "next/headers";
import { TRPCError } from "@trpc/server";
import { sealData, unsealData } from "iron-session";
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
      const cookieStore = await cookies();
      let decodedToken;

      try {
        // Step 1: Verify the ID token
        decodedToken = await adminAuth.verifyIdToken(input.idToken);
        if (!decodedToken.uid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid ID token: No UID.",
          });
        }
      } catch (error) {
        console.error("ID token verification failed:", error);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "ID token verification failed.",
          cause: error,
        });
      }

      try {
        // Step 2: Attempt to get and validate existing session cookie
        const existingCookie = cookieStore.get(sessionOptions.cookieName);
        if (existingCookie && existingCookie.value) {
          try {
            const unsealedSession = await unsealData<{ uid: string }>(
              existingCookie.value,
              sessionOptions
            );
            if (unsealedSession && unsealedSession.uid === decodedToken.uid) {
              console.log(
                "Valid session cookie exists and matches Firebase UID. Re-login skipped for UID:",
                decodedToken.uid
              );
              // Optionally, you could re-seal and re-set the cookie here if you want to refresh its maxAge
              // without hitting the database, but for now, we'll just accept it as is.
              // Example: cookieStore.set(sessionOptions.cookieName, existingCookie.value, sessionOptions.cookieOptions);
              return { success: true, message: "Existing session validated." };
            } else {
              console.log(
                "Existing session cookie UID does not match Firebase UID or is invalid. Proceeding with new session."
              );
            }
          } catch (unsealError) {
            // This can happen if the cookie is malformed, tampered, or the SESSION_SECRET changed
            console.warn(
              "Failed to unseal existing session cookie, creating new one:",
              unsealError
            );
            // Proceed to create a new session
          }
        }

        // Step 3 & 4: Upsert user in the database and create/update session cookie
        await ctx.db.user.upsert({
          where: { id: decodedToken.uid },
          update: { email: decodedToken.email ?? null },
          create: {
            id: decodedToken.uid,
            email: decodedToken.email ?? null,
          },
        });
        console.log("User synced with database:", decodedToken.uid);

        const sessionData = {
          uid: decodedToken.uid,
        };

        const sealedSession = await sealData(sessionData, sessionOptions);

        cookieStore.set(
          sessionOptions.cookieName,
          sealedSession,
          sessionOptions.cookieOptions
        );

        console.log(
          "New session cookie created/updated for UID:",
          decodedToken.uid
        );
        return { success: true, message: "Session created/updated." };
      } catch (error) {
        // Catch-all for other errors during the process (e.g., database error)
        console.error(
          "Error during session creation/validation or user sync:",
          error
        );
        // Avoid re-throwing TRPCErrors if they were already specific (like UNAUTHORIZED from token check)
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process session or sync user.",
          cause: error,
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