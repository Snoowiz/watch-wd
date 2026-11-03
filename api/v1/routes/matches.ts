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

      // Determine participant display for title/description
      const isTennis = parsed.sport === "tennis";
      const slot1 = isTennis ? parsed.player_pair_1 : parsed.home_team;
      const slot2 = isTennis ? parsed.player_pair_2 : parsed.away_team;
      const derivedTitle = slot1 && slot2 ? `${slot1} vs ${slot2}` : (slot1 || slot2 || "Untitled Event");

      // 2. Build the database record
      //    Map the API fields to match the existing matches table schema
      const matchRecord: Record<string, any> = {
        title: parsed.title || derivedTitle,
        slug: parsed.slug || generateSlug(slot1, slot2, parsed.match_date),
        description: parsed.description || derivedTitle,
        content: parsed.content || "",
        date: parsed.match_date,
        start_time: parsed.match_date,
        price: parsed.price,
        embed_price: parsed.embed_price ?? 0,
        status: parsed.status,
        sport: parsed.sport || "football",
        home_team: parsed.home_team || null,
        away_team: parsed.away_team || null,
        player_pair_1: parsed.player_pair_1 || null,
        player_pair_2: parsed.player_pair_2 || null,
        publish_status: parsed.publish_status || "published",
        access: parsed.access === "free" ? "free" : (parsed.price > 0 || parsed.access === "ppv" || parsed.access === "subscription" ? "paid" : "free"),
        access_type: parsed.access_type || (parsed.access === "subscription" ? "plan" : (parsed.price > 0 || parsed.access === "ppv" ? "ppv" : "free")),
        ppv_price: parsed.ppv_price ?? (parsed.price > 0 ? parsed.price : null),
        required_plan_id: parsed.required_plan_id || null,
        thumbnail: parsed.thumbnail || null,
        categories: parsed.categories ? JSON.stringify(parsed.categories) : JSON.stringify([parsed.category]),
        live_commenting: parsed.live_commenting ? 1 : 0,
        comment_alignment: parsed.comment_alignment || "right",
        club_id: parsed.club_id || null,
        competition_id: parsed.competition_id || null,
      };

      // 3. Insert into the database
      const result = await db.collection("matches").add(matchRecord);

      // 4. Invalidate the matches cache collection
      cacheEngine.invalidateCollection("matches");

      // 5. Return 201 Created with the saved record
      return res.status(201).json({
        id: result.id,
        ...matchRecord,
        categories: parsed.categories || [parsed.category],
        live_commenting: !!parsed.live_commenting,
        created_at: new Date().toISOString(),
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
 * Generate a URL-safe slug from participant names and date.
 */
function generateSlug(part1?: string | null, part2?: string | null, dateStr?: string): string {
  const dateSlug = (dateStr || "").slice(0, 10);
  const p1 = (part1 || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const p2 = (part2 || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const base = p2 ? `${p1}-vs-${p2}` : p1;
  const slug = dateSlug ? `${base}-${dateSlug}` : base;
  return slug.replace(/^-|-$/g, "") || `event-${Date.now()}`;
}
