import { Request, Response } from "express";
import { SharesService } from "../services/shares.service";
import { catchAsync } from "../utils/catchAsync";
import { CreateShareBody } from "../types/index";

export class SharesController {
  static createShareLink = catchAsync(async (req: Request, res: Response) => {
    const userId = req.session.userId!;
    const { savedSessionId, visibility, expiresAt } =
      req.body as CreateShareBody;

    if (!savedSessionId) {
      res.status(400).json({ error: "savedSessionId is required" });
      return;
    }

    const result = await SharesService.createShareLink(
      userId,
      savedSessionId,
      visibility,
      expiresAt,
    );
    res.json(result);
  });

  static listShareLinksForSession = catchAsync(
    async (req: Request, res: Response) => {
      const userId = req.session.userId!;
      const { savedSessionId } = req.params;

      const result = await SharesService.listShareLinksForSession(
        userId,
        savedSessionId,
      );
      res.json(result);
    },
  );

  static deleteShareLink = catchAsync(async (req: Request, res: Response) => {
    const userId = req.session.userId!;
    const { id } = req.params;

    const result = await SharesService.deleteShareLink(userId, id);
    res.json(result);
  });

  static resolveShareToken = catchAsync(async (req: Request, res: Response) => {
    const { token } = req.params;
    const result = await SharesService.resolveShareToken(
      token,
      req.session.userId,
    );
    res.json(result);
  });
}
