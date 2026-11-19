import { newCache } from "/lib/cache";
import { request as httpClientRequest } from "/lib/http-client";

const A_SECOND = 1;

const isRunningCache = newCache({
  size: 1,
  expire: 10 * A_SECOND
});

export function getBrowserSyncUrl({ request }) {
  const {
    host,
    scheme
  } = request;
  return `${scheme}://${host}:3003/browser-sync/browser-sync-client.js`;
}

export function isRunning({ request }) {
  if (app.config.devBrowsersync !== "true") return false;

  return isRunningCache.get("hardcoded-cache-key", () => {
    try {
      const requestParameters = {
        url: getBrowserSyncUrl({ request }),
        method: "HEAD",
        // headers: {
        //  'Cache-Control': 'no-cache'
        // },
        connectionTimeout: 1000,
        readTimeout: 1000
      };
      const response = httpClientRequest(requestParameters);
      if (response.status !== 200) {
        log.info("Response status not 200 when checking for BrowserSync request:%s response:%s", JSON.stringify(requestParameters, null, 2), JSON.stringify(response, null, 2));
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  });
}

export function getBrowserSyncScript({ request }) {
  return `<script src="${getBrowserSyncUrl({ request })}"></script>`;
}
