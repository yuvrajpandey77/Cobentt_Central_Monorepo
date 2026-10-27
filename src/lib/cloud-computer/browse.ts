import { assertPublicUrl, UrlError } from "./network";
import { capOutput } from "./output";

/**
 * The cloud browser reads pages on the server and returns their text. It doesn't
 * run a remote browser, so there are no cookies, logins or scripts from the page.
 */
export interface PageRead {
  url: string;
  title: string;
  text: string;
  truncated: boolean;
}

const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;

export function encodeBrowserId(url: string): string {
  return Buffer.from(url, "utf8").toString("base64url");
}

export function decodeBrowserId(id: string): string {
  if (!/^[A-Za-z0-9_-]{1,2048}$/.test(id)) throw new UrlError("That page session doesn't exist.");
  return Buffer.from(id, "base64url").toString("utf8");
}

export function htmlToText(html: string): { title: string; text: string } {
  const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const body = html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|br)\s*>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return { title, text: decodeEntities(body).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim() };
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    chunks.push(value);
    if (size > MAX_BYTES) {
      await reader.cancel();
      break;
    }
  }
  return new TextDecoder().decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
}

export async function readPublicPage(rawUrl: string, fetchImpl: typeof fetch = fetch): Promise<PageRead> {
  let url = await assertPublicUrl(rawUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetchImpl(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "CobenttCloudComputer/1.0", Accept: "text/html,text/plain;q=0.9" },
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new UrlError("The page redirected without an address.");
      url = await assertPublicUrl(new URL(location, url).href);
      continue;
    }
    if (!res.ok) throw new UrlError(`The page didn't load (HTTP ${res.status}).`);
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|text\/plain/i.test(type)) throw new UrlError("That link isn't a web page.");
    const raw = await readCapped(res);
    const { title, text } = type.includes("html") ? htmlToText(raw) : { title: "", text: raw };
    const capped = capOutput(text, 8000);
    return { url: url.href, title: title || url.hostname, text: capped.text, truncated: capped.truncated };
  }
  throw new UrlError("The page redirected too many times.");
}
