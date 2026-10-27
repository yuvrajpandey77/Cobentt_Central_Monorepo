import { CloudComputerService } from "./service";
import { e2bBackend } from "./backend";
import type { CloudDeps } from "./handlers";
import { userIdFromRequest, bearerToken } from "./auth";
import { readPublicPage } from "./browse";
import { checkRateLimit } from "@/lib/rate-limit";
import { inngest } from "@/inngest/client";

export { handleCloudComputer } from "./handlers";
export type { CloudDeps } from "./handlers";

/** Production wiring. Tests build their own deps with fakes. */
export function productionDeps(): CloudDeps {
  const service = new CloudComputerService(e2bBackend);
  return {
    service,
    userIdFrom: userIdFromRequest,
    tokenFrom: bearerToken,
    now: () => new Date(),
    readPage: (url) => readPublicPage(url),
    rateLimit: async (key, perMinute) => {
      const result = await checkRateLimit(key, { requests: perMinute, window: "60 s" });
      return result.success;
    },
    sendEvent: async (name, data) => {
      await inngest.send({ name, data });
    },
  };
}
