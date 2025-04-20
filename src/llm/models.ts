import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export const sonnet = anthropic("claude-3-7-sonnet-latest");
export const haiku = anthropic("claude-3-5-haiku-20241022");
export const optimus = openrouter("openrouter/optimus-alpha");
