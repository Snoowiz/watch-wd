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

  // Constant-time comparison to prevent timing attacks
  if (token.length !== expectedToken.length || !timingSafeEqual(token, expectedToken)) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid Bearer token.",
    });
    return;
  }

  next();
}

/**
 * Constant-time string comparison to prevent timing-based attacks.
 * Falls back to a manual byte comparison if crypto is unavailable.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  try {
    const { timingSafeEqual: cryptoTimingSafe } = require("crypto");
    return cryptoTimingSafe(Buffer.from(a), Buffer.from(b));
  } catch {
    // Manual constant-time comparison fallback
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
