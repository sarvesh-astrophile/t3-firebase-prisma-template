import { z } from "zod";
// Remove observable import
// import { observable } from "@trpc/server/observable"; 

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { generateGeminiStream } from "@/lib/gemini";
import { TRPCError } from "@trpc/server"; // Import TRPCError

export const aiRouter = createTRPCRouter({
  generateStream: protectedProcedure
    .input(z.object({ prompt: z.string().min(1) }))
    // Use async generator syntax directly
    .subscription(async function* ({ input, ctx }) { // Add ctx if needed later
      console.log(`Starting subscription for user ${ctx.user.uid} prompt: ${input.prompt}`);
      try {
        const stream = generateGeminiStream(input.prompt);
        for await (const chunk of stream) {
          // Ensure chunk is a string before yielding
          if (typeof chunk === 'string') {
            yield chunk; // Directly yield the chunk
          } else {
            console.warn("Non-string chunk received from generator:", chunk);
          }
        }
        // Generator completion signifies the end of the stream
        console.log(`Subscription completed for user ${ctx.user.uid} prompt: ${input.prompt}`);
      } catch (error) {
        console.error(`Error in tRPC subscription for user ${ctx.user.uid}:`, error);
        // Throw a TRPCError for the client to receive
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate AI response.",
          cause: error instanceof Error ? error : undefined,
        });
      }
      // Optional: Add cleanup logic here if necessary, e.g., closing resources
      // It will run when the subscription is cancelled or ends
      // console.log(`Cleaning up subscription for user ${ctx.user.uid}`);
    }),
}); 