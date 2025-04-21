import { createAzure } from "@ai-sdk/azure";
import { streamText } from "ai";

/**
 * See also
 * @see {@link https://sdk.vercel.ai/providers/ai-sdk-providers/azure}
 */
const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME,
  apiKey: process.env.AZURE_API_KEY,
});

(async () => {
  const stream = streamText({
    // NOTE: available models are set in the Azure portal: https://ai.azure.com/resource/deployments
    model: azure("gpt-4.1"),
    prompt: "are you familiar with the hero of ages?",
  });
  for await (const chunk of stream.fullStream) {
    if (chunk.type === "text-delta") {
      process.stdout.write(chunk.textDelta);
    } else {
      console.log("\n");
      console.log(chunk);
    }
  }
})();
