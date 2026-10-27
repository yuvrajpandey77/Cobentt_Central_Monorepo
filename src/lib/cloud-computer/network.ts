import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** True for addresses a server-side fetch must never reach: loopback, private, link-local, metadata. */
export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      a >= 224
    );
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    if (lower.startsWith("::ffff:")) return isPrivateAddress(lower.slice(7));
    return /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower);
  }
  return true;
}

export class UrlError extends Error {}

/**
 * Parses a URL the user wants to read through the cloud browser. Only public
 * http(s) URLs on the default ports are allowed, and every resolved address
 * must be public.
 */
export async function assertPublicUrl(raw: string): Promise<URL> {
  const trimmed = raw.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    throw new UrlError("Only http and https pages can be opened.");
  }
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    throw new UrlError("That doesn't look like a web address.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new UrlError("Only http and https pages can be opened.");
  if (url.username || url.password) throw new UrlError("Addresses with a username or password aren't allowed.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new UrlError("Only the standard web ports can be opened.");
  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new UrlError("That address isn't public.");
  }
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new UrlError("That address isn't public.");
  }
  return url;
}
