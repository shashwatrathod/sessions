import crypto from "crypto";

// Ensure the encryption key is set and is the correct length (32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || Buffer.from(ENCRYPTION_KEY, "hex").length !== 32) {
  console.warn(
    "WARNING: ENCRYPTION_KEY is not set or is not 32 bytes hex. Using a fallback key for development ONLY. " +
      "Set a secure ENCRYPTION_KEY in production to protect refresh tokens.",
  );
}

// Fallback key only for dev if not provided (32 bytes hex)
const key = ENCRYPTION_KEY
  ? Buffer.from(ENCRYPTION_KEY, "hex")
  : crypto.scryptSync("fallback-encryption-password-change-me", "salt", 32);

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
