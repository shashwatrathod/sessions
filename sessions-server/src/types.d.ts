// Extend express-session with our custom userId field
import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    accessToken?: string;
    tokenExpiresAt?: Date;
  }
}
