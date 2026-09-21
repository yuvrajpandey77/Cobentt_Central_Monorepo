import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const raw = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!raw) {
    throw new Error(
      "API_KEY_ENCRYPTION_SECRET not configured. Generate one with `openssl rand -hex 32` and set it in .env / .env.local, then restart the dev server."
    );
  }
  return Buffer.from(raw, "hex").length === KEY_LENGTH
    ? Buffer.from(raw, "hex")
    : crypto.scryptSync(raw, "cobentt-api-keys", KEY_LENGTH);
}

export function encryptApiKey(plaintext: string): {
  encrypted: string;
  iv: string;
  authTag: string;
} {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

export function decryptApiKey(
  encrypted: string,
  iv: string,
  authTag: string
): string {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function maskKey(key: string): { prefix: string; suffix: string } {
  return {
    prefix: key.slice(0, 8),
    suffix: key.slice(-4),
  };
}
