import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText, streamText } from "ai";

const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

/**
 * NOTE: This comes from the "Cross-region inference" section of the Bedrock
 * console. Find the model you want, find the "Inference profile ARN".
 * @see {@link https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/inference-profiles}
 */
const SONNET_ARN =
  "arn:aws:bedrock:us-east-1:327006722363:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0";

/**
 * See also
 * @see {@link https://sdk.vercel.ai/providers/ai-sdk-providers/amazon-bedrock}
 */
const sonnet = bedrock(SONNET_ARN);

(async () => {
  const stream = streamText({
    model: sonnet,
    prompt: "are you familiar with the hero of ages?",
  });
  for await (const chunk of stream.fullStream) {
    if (chunk.type === "text-delta") {
      process.stdout.write(chunk.textDelta);
    } else {
      console.debug("\n");
      console.debug(chunk);
    }
  }
})();
