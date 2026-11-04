/**
 * Match Data Validation Schema (Zod)
 * 
 * Validates incoming match/event payloads from third-party services
 * against the `matches` table schema in the database.
 * 
 * Supports Football, Tennis, Basketball, Boxing, and dynamic configured sports.
 * Required common fields: match_date, category, price, status
 */

import { z } from "zod";

export const createMatchSchema = z.object({
  // === Sport discriminator ===
  sport: z.enum(["football", "tennis", "basketball", "boxing"], {
    error: "sport must be one of: football, tennis, basketball, boxing",
  }).optional().default("football"),

  // === Participant fields (sport-specific) ===
  home_team: z.string().max(255).optional(),
  away_team: z.string().max(255).optional(),
  player_pair_1: z.string().max(255).optional(),
  player_pair_2: z.string().max(255).optional(),

  // === Common required fields ===
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
    .min(0, "price must be 0 or greater")
    .optional()
    .default(0),

  status: z.enum(["upcoming", "live", "completed", "full_match", "highlights", "cancelled", "postponed"], {
    error: "status must be one of: upcoming, live, full_match, completed, highlights, cancelled, postponed",
  }).optional().default("upcoming"),

  // === Optional fields ===
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
  club_id: z.string().max(100).nullable().optional(),
  competition_id: z.string().max(100).nullable().optional(),
}).superRefine((data, ctx) => {
  const sportKey = (data.sport || 'football').toLowerCase();
  if (sportKey === 'tennis') {
    if (!data.player_pair_1 && !data.title) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "player_pair_1 or title is required for tennis",
        path: ["player_pair_1"]
      });
    }
  } else if (sportKey === 'boxing') {
    if (!data.player_pair_1 && !data.home_team && !data.title) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fighter 1 or title is required for combat sports",
        path: ["player_pair_1"]
      });
    }
  } else {
    // Team sports (Football, Basketball, etc.)
    if (!data.home_team && !data.title) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "home_team or title is required",
        path: ["home_team"]
      });
    }
    if (!data.away_team && !data.title) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "away_team or title is required",
        path: ["away_team"]
      });
    }
  }
});

/** Alias for backward and forward compatibility */
export const matchSchema = createMatchSchema;

/** TypeScript type inferred from the schema */
export type CreateMatchInput = z.infer<typeof createMatchSchema>;
