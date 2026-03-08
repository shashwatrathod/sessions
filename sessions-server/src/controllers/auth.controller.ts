import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { config } from "../config";
import { catchAsync } from "../utils/catchAsync";

export class AuthController {
  static login = catchAsync(async (req: Request, res: Response) => {
    const url = AuthService.getSpotifyLoginUrl();
    res.redirect(url);
  });

  static callback = catchAsync(async (req: Request, res: Response) => {
    const { code, error } = req.query;
    const frontendUrl = config.frontendUrl;

    if (error || !code) {
      res.redirect(`${frontendUrl}?error=access_denied`);
      return;
    }

    try {
      const { access_token, refresh_token, expires_in } =
        await AuthService.exchangeCodeForTokens(code as string);
      const { id, expiresAt } = await AuthService.upsertSpotifyUser(
        access_token,
        refresh_token,
        expires_in,
      );

      req.session.userId = id;
      req.session.accessToken = access_token;
      req.session.tokenExpiresAt = expiresAt;

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          res.redirect(`${frontendUrl}?error=session_failed`);
          return;
        }
        res.redirect(`${frontendUrl}/sessions`);
      });
    } catch (err) {
      console.error("Auth callback error:", err);
      res.redirect(`${frontendUrl}?error=auth_failed`);
    }
  });

  static me = catchAsync(async (req: Request, res: Response) => {
    if (!req.session.userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const user = await AuthService.getUserProfile(req.session.userId);

    if (!user) {
      req.session.destroy(() => {});
      res.status(401).json({ error: "User not found" });
      return;
    }

    res.json(user);
  });

  static logout = catchAsync(async (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: "Logout failed" });
        return;
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
}
