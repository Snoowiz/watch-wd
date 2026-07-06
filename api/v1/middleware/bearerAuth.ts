/**
 * Bearer Token Authentication Middleware
 * 
 * Validates incoming requests from authorized third-party services
 * using a static Bearer token stored in the API_BEARER_TOKEN env variable.
 * 
 * This is separate from the JWT-based user authentication used by the
 * main app — it is designed exclusively for machine-to-machine API access.
 */

import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";

export function bearerAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Missing Authorization header. Provide a Bearer token.",
    });
    return;
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    res.status(401).json({
      error: "Unauthorized",
      message: "Malformed Authorization header. Expected format: Bearer <token>",
    });
    return;
  }

  const token = parts[1];
  const expectedToken = process.env.API_BEARER_TOKEN;

  if (!expectedToken) {
    console.error("[API v1] API_BEARER_TOKEN is not configured in the environment.");
    res.status(500).json({
      error: "Server configuration error",
      message: "API authentication is not configured. Contact the administrator.",
    });
    return;
  }

  if (token.length !== expectedToken.length) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid Bearer token.",
    });
    return;
  }

  try {
    if (!timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid Bearer token.",
      });
      return;
    }
  } catch (err) {
    // Fallback if Buffer comparison fails
    let result = 0;
    for (let i = 0; i < token.length; i++) {
      result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
    }
    if (result !== 0) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid Bearer token.",
      });
      return;
    }
  }

  next();
}
