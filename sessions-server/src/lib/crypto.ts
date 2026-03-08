import crypto from "crypto";

// Ensure the encryption key is exactly 32 bytes for AES-256
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

let key: Buffer;
if (ENCRYPTION_KEY) {
  // Check if it's already a valid 32-byte hex key (64 hex characters)
  if (/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY)) {
    key = Buffer.from(ENCRYPTION_KEY, "hex");
  } else {
    // Hash the provided key to ensure it is exactly 32 bytes
    console.warn(
      "WARNING: ENCRYPTION_KEY is not a 64-character hex string. Hashing it to 32 bytes.",
    );
    key = crypto.createHash("sha256").update(String(ENCRYPTION_KEY)).digest();
  }
} else {
  console.warn(
    "WARNING: ENCRYPTION_KEY is not set. Using a fallback key for development ONLY. " +
      "Set a secure ENCRYPTION_KEY in production to protect refresh tokens.",
  );
  key = crypto.scryptSync("fallback-encryption-password-change-me", "salt", 32);
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a string containing the IV, ciphertext, and auth tag, separated by colons.
 */
export function encrypt(text: string): string {
  if (!text) return text;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  // Format: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a string that was encrypted by the `encrypt` function.
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return encryptedData;
  if (!encryptedData.includes(":")) {
    // Check if it's already an unencrypted token (for backwards compatibility during migration)
    return encryptedData;
  }

  try {
    const parts = encryptedData.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encryptedText = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt data");
  }
}
