import { tool } from "ai";
import { z } from "zod";

export const getCurrentDateTime = tool({
  description: "Get the current date and time in local and UTC timezones.",
  parameters: z.object({}),
  execute: async () => {
    const now = new Date();
    return {
      local: now.toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZoneName: "short",
        formatMatcher: "best fit",
      }),
      utc: now.toISOString(),
    };
  },
});
