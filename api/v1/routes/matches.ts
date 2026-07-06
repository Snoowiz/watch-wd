/**
 * API v1 — Matches Route
 * 
 * POST /api/v1/matches
 * 
 * Accepts validated match data from authorized third-party services,
 * saves it to the `matches` table, and returns a 201 Created response.
 * 
 * Authentication: Bearer token (via bearerAuth middleware)
 * Validation: Zod schema (createMatchSchema)
 */

import { Router } from "express";
import { ZodError } from "zod";
import { bearerAuth } from "../middleware/bearerAuth.js";
import { createMatchSchema } from "../schemas/matchSchema.js";

import type { MySQLAdapter } from "../../../db/MySQLAdapter.js";

interface MatchRouterDeps {
  db: MySQLAdapter;
  cacheEngine: { invalidateCollection: (name: string) => void };
}

export function createMatchRouter({ db, cacheEngine }: MatchRouterDeps): Router {
  const router = Router();

  /**
   * POST /api/v1/matches
   * 
   * Create a new match from external service data.
   * Requires a valid Bearer token in the Authorization header.
   */
  router.post("/", bearerAuth, async (req, res) => {
    try {
      // 1. Validate request body
      const parsed = createMatchSchema.parse(req.body);

      // 2. Build the database record
      //    Map the API fields to match the existing matches table schema
      const matchRecord: Record<string, any> = {
        title: parsed.title || `${parsed.home_team} vs ${parsed.away_team}`,
        slug: parsed.slug || generateSlug(parsed.home_team, parsed.away_team, parsed.match_date),
        description: parsed.description || `${parsed.home_team} vs ${parsed.away_team}`,
        content: parsed.content || "",
        date: parsed.match_date,
        start_time: parsed.match_date,
        price: parsed.price,
        embed_price: parsed.embed_price ?? 0,
        status: parsed.status,
        publish_status: parsed.publish_status || "published",
        access: parsed.access === "free" ? "free" : (parsed.price > 0 || parsed.access === "ppv" || parsed.access === "subscription" ? "paid" : "free"),
        access_type: parsed.access_type || (parsed.access === "subscription" ? "plan" : (parsed.price > 0 || parsed.access === "ppv" ? "ppv" : "free")),
        ppv_price: parsed.ppv_price ?? (parsed.price > 0 ? parsed.price : null),
        required_plan_id: parsed.required_plan_id || null,
        thumbnail: parsed.thumbnail || null,
        categories: parsed.categories
          ? JSON.stringify(parsed.categories)
          : JSON.stringify([parsed.category]),
        live_commenting: parsed.live_commenting !== undefined ? (parsed.live_commenting ? 1 : 0) : 1,
        comment_alignment: parsed.comment_alignment || "right",
        views: 0,
        operator_id: "api-v1",
        creator_id: "api-v1",
        created_at: new Date().toISOString(),
      };

      // 3. Persist to database
      const docRef = await db.collection("matches").add(matchRecord);

      // 4. Invalidate match cache so public endpoints reflect new data
      cacheEngine.invalidateCollection("matches");

      // 5. Return success
      console.log(`[API v1] Match created: ${docRef.id} — ${matchRecord.title}`);

      res.status(201).json({
        success: true,
        message: "Match created successfully",
        data: {
          id: docRef.id,
          title: matchRecord.title,
          home_team: parsed.home_team,
          away_team: parsed.away_team,
          match_date: parsed.match_date,
          category: parsed.category,
          price: parsed.price,
          status: parsed.status,
          created_at: matchRecord.created_at,
        },
      });
    } catch (err: any) {
      // Zod validation failure → 400
      if (err instanceof ZodError) {
        const fieldErrors = err.issues.map((e: any) => ({
          field: e.path.join("."),
          message: e.message,
        }));

        return res.status(400).json({
          error: "Validation failed",
          details: fieldErrors,
        });
      }

      // Unexpected server error → 500
      console.error("[API v1] Error creating match:", err);
      res.status(500).json({
        error: "Internal server error",
        message: err.message || "An unexpected error occurred while creating the match.",
      });
    }
  });

  return router;
}

/**
 * Generate a URL-safe slug from team names and date.
 */
function generateSlug(home: string, away: string, dateStr: string): string {
  const dateSlug = dateStr.slice(0, 10); // YYYY-MM-DD
  const slug = `${home}-vs-${away}-${dateSlug}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug;
}
