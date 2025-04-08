import { GoogleGenAI } from "@google/genai";
import { env } from "@/env.js";

// Ensure the API key is available
if (!env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY in environment variables");
}

// Corrected initialization using options object
const genAI = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

/**
 * Generates content stream from Gemini AI based on a prompt.
 * @param prompt The user prompt.
 * @returns An asynchronous generator yielding text chunks.
 */
export async function* generateGeminiStream(prompt: string) {
  try {
    // Corrected call using genAI.models.generateContentStream
    const result = await genAI.models.generateContentStream({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    // Iterate directly over the response (which is the stream)
    for await (const chunk of result) {
      // Check if chunk has text property
      if (typeof chunk.text !== 'undefined') { // Check for existence
        const chunkText = chunk.text; // Access as property
        // console.log("Yielding chunk:", chunkText); // Optional: server-side logging
        yield chunkText;
      } else {
        console.warn("Received chunk without text method:", chunk);
      }
    }
  } catch (error) {
    console.error("Error generating content stream from Gemini:", error);
    yield "Error generating response from AI.";
    // Alternatively, re-throw or handle differently
    // throw new Error("Failed to generate content stream from Gemini.");
  }
} 