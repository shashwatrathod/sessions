import { SessionData } from "express-session";

export interface CreatePlaylistBody {
  name: string;
  description?: string;
  trackUris: string[];
  isPublic: boolean;
  sessionStartTime: string;
  sessionEndTime: string;
}

export interface SaveSessionBody {
  name: string;
  trackUris: string[];
  sessionStartTime: string;
  sessionEndTime: string;
}

export interface RenameSessionBody {
  name: string;
}

export interface CreateShareBody {
  savedSessionId: string;
  visibility?: "PRIVATE" | "LINK_ANYONE" | "SPECIFIC_USER";
  expiresAt?: string;
}
