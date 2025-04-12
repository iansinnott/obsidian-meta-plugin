import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { groq } from "@ai-sdk/groq";

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export const sonnet = anthropic("claude-3-7-sonnet-latest");
export const haiku = anthropic("claude-3-5-haiku-20241022");
export const optimus = openrouter("openrouter/optimus-alpha");
export const llama4Scout = groq("meta-llama/llama-4-scout-17b-16e-instruct");
export const llama4Maverick = groq("meta-llama/llama-4-maverick-17b-128e-instruct");
export const gemma = groq("gemma2-9b-it");
