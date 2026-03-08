import { Request, Response } from "express";
import { PlaylistsService } from "../services/playlists.service";
import { catchAsync } from "../utils/catchAsync";
import {
  CreatePlaylistBody,
  SaveSessionBody,
  RenameSessionBody,
} from "../types/index";

export class PlaylistsController {
  static createPlaylist = catchAsync(async (req: Request, res: Response) => {
    const userId = req.session.userId!;
    const {
      name,
      description,
      trackUris,
      isPublic,
      sessionStartTime,
      sessionEndTime,
    } = req.body as CreatePlaylistBody;

    if (!name || !trackUris?.length || !sessionStartTime || !sessionEndTime) {
      res.status(400).json({
        error:
          "Missing required fields: name, trackUris, sessionStartTime, sessionEndTime",
      });
      return;
    }

    const result = await PlaylistsService.createSavedSessionWithSpotifyPlaylist(
      userId,
      req.session,
      name,
      description,
      isPublic ?? false,
      trackUris,
      sessionStartTime,
      sessionEndTime,
    );

    res.json(result);
  });

  static getSavedSessions = catchAsync(async (req: Request, res: Response) => {
    const userId = req.session.userId!;
    const enriched = await PlaylistsService.getSavedSessions(userId);
    res.json(enriched);
  });

  static renameSession = catchAsync(async (req: Request, res: Response) => {
    const userId = req.session.userId!;
    const { id } = req.params;
    const { name } = req.body as RenameSessionBody;

    if (!name?.trim()) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    const result = await PlaylistsService.renameSession(id, userId, name);
    res.json(result);
  });

  static saveSessionOnly = catchAsync(async (req: Request, res: Response) => {
    const userId = req.session.userId!;
    const { name, trackUris, sessionStartTime, sessionEndTime } =
      req.body as SaveSessionBody;

    if (
      !name?.trim() ||
      !trackUris?.length ||
      !sessionStartTime ||
      !sessionEndTime
    ) {
      res.status(400).json({
        error:
          "Missing required fields: name, trackUris, sessionStartTime, sessionEndTime",
      });
      return;
    }

    const result = await PlaylistsService.saveSessionOnly(
      userId,
      name,
      trackUris,
      sessionStartTime,
      sessionEndTime,
    );

    res.json(result);
  });

  static deleteSession = catchAsync(async (req: Request, res: Response) => {
    const userId = req.session.userId!;
    const { id } = req.params;

    const result = await PlaylistsService.deleteSession(id, userId);
    res.json(result);
  });
}
