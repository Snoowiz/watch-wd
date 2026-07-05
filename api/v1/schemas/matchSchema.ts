/**
 * Match Data Validation Schema (Zod)
 * 
 * Validates incoming match payloads from third-party services
 * against the `matches` table schema in the database.
 * 
 * Required fields: home_team, away_team, match_date, category, price, status
 * Optional fields map to additional columns in the matches table.
 */

import { z } from "zod";

export const createMatchSchema = z.object({
  // === Required fields ===
  home_team: z
    .string({ error: "home_team is required" })
    .min(1, "home_team cannot be empty")
    .max(255, "home_team must be 255 characters or fewer"),

  away_team: z
    .string({ error: "away_team is required" })
    .min(1, "away_team cannot be empty")
    .max(255, "away_team must be 255 characters or fewer"),

  match_date: z
    .string({ error: "match_date is required (ISO 8601 format)" })
    .refine(
      (val) => !isNaN(Date.parse(val)),
      { message: "match_date must be a valid ISO 8601 date string (e.g. 2026-07-10T18:00:00Z)" }
    ),

  category: z
    .string({ error: "category is required" })
    .min(1, "category cannot be empty")
    .max(255, "category must be 255 characters or fewer"),

  price: z
    .number({ error: "price is required and must be a number" })
    .min(0, "price must be 0 or greater"),

  status: z.enum(["upcoming", "live", "completed", "cancelled", "postponed"], {
    error: "status must be one of: upcoming, live, completed, cancelled, postponed",
  }),

  // === Optional fields (aligned with matches table) ===
  title: z.string().max(500).optional(),
  slug: z.string().max(500).optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  embed_price: z.number().min(0).optional(),
  publish_status: z.enum(["published", "draft", "scheduled"]).optional(),
  access: z.enum(["free", "ppv", "subscription"]).optional(),
  access_type: z.string().max(50).optional(),
  ppv_price: z.number().min(0).optional(),
  required_plan_id: z.string().max(100).optional(),
  thumbnail: z.string().url("thumbnail must be a valid URL").optional().or(z.literal("")),
  categories: z.array(z.union([z.string(), z.number()])).optional(),
  live_commenting: z.boolean().optional(),
  comment_alignment: z.enum(["left", "right"]).optional(),
});

/** TypeScript type inferred from the schema */
export type CreateMatchInput = z.infer<typeof createMatchSchema>;
