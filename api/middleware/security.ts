import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Check JWT secret on startup
export function validateEnvironmentSecurity() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret === "watchwds-super-secret-key-2026") {
    if (process.env.NODE_ENV === 'production') {
      console.error("[FATAL SECURITY ERROR] Strong JWT_SECRET environment variable is required in production!");
      process.exit(1);
    } else {
      console.warn("[SECURITY WARNING] Using fallback JWT_SECRET in non-production mode. Set a strong JWT_SECRET in .env.");
    }
  }
}

// Helmet Security Headers Config
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com", "https://www.paypal.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "wss:", "ws:"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://www.paypal.com", "https://www.youtube.com", "https://player.vimeo.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// General API Rate Limiter
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // max 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again later." },
});

// Strict Rate Limiter for Sensitive Routes (Auth, Password Reset)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // max 15 login/auth attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again after 15 minutes." },
});

// Strict CORS Middleware
export const corsControl = (req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = [
    process.env.APP_URL,
    "https://watchwds.com",
    "https://www.watchwds.com",
    "http://localhost:3000",
    "http://localhost:5173"
  ].filter(Boolean) as string[];

  const origin = req.headers.origin;
  if (origin) {
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    } else {
      return res.status(403).json({ error: "CORS origin blocked" });
    }
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
};
