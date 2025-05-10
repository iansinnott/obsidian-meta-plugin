import { createAzure } from "@ai-sdk/azure";
import { generateText } from "ai";
import * as readline from "readline";

/**
 * See also
 * @see {@link https://sdk.vercel.ai/providers/ai-sdk-providers/azure}
 */
const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME,
  apiKey: process.env.AZURE_API_KEY,
});

// Create readline interface for CLI input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

(async () => {
  // Prompt user for search query
  rl.question("Enter your search query: ", async (searchQuery) => {
    console.debug(`Searching for: ${searchQuery}`);

    try {
      const result = await generateText({
        // NOTE: available models are set in the Azure portal: https://ai.azure.com/resource/deployments
        model: azure.responses("gpt-4.1"),
        prompt: searchQuery,
        tools: {
          // @ts-expect-error - the types actually werne't wrong, tools doesn't exist. the docs say it does... such a classic.
          web_search_preview: azure.tools.webSearchPreview(),
        },
        toolChoice: { type: "tool", toolName: "web_search_preview" },
        maxRetries: 0,
      });

      // Display the result
      console.debug("\nResult:");
      console.debug(result.text);

      // Display sources
      console.debug("\nSources:");
      if (result.sources && result.sources.length > 0) {
        result.sources.forEach((source, index) => {
          console.debug(`[${index + 1}] ${source.title}: ${source.url}`);
        });
      } else {
        console.debug("No sources found");
      }
    } catch (error) {
      console.dir(error, { depth: null });
    } finally {
      rl.close();
    }
  });
})();
