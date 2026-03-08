import { Request, Response } from "express";
import { HistoryService } from "../services/history.service";
import { catchAsync } from "../utils/catchAsync";
import { config } from "../config";

export class HistoryController {
  static syncHistory = catchAsync(async (req: Request, res: Response) => {
    const userId = req.session.userId!;
    const result = await HistoryService.syncHistory(userId, req.session);
    res.json(result);
  });

  static getSessions = catchAsync(async (req: Request, res: Response) => {
    const userId = req.session.userId!;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(
      1,
      Math.min(Number(req.query.limit) || 20, config.sessionsPageLimitMax),
    );

    const offset = Number(req.headers["x-timezone-offset"]) || 0;

    const result = await HistoryService.getPaginatedSessions(
      userId,
      page,
      limit,
      offset,
    );

    res.set("Cache-Control", "private, max-age=300");
    res.json(result);
  });

  static getSessionDetail = catchAsync(async (req: Request, res: Response) => {
    const userId = req.session.userId!;
    const { id } = req.params;
    const offset = Number(req.headers["x-timezone-offset"]) || 0;

    const result = await HistoryService.getSessionDetail(userId, id, offset);

    res.set("Cache-Control", "private, max-age=3600");
    res.json(result);
  });
}
