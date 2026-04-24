import { z } from "zod";

export const LaunchStatusSchema = z.enum([
  "scheduled",
  "tbd",
  "go",
  "hold",
  "in_flight",
  "success",
  "failure",
  "unknown",
]);

export const LaunchSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: LaunchStatusSchema,
  net: z.string().datetime(),
  window: z
    .object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    })
    .optional(),
  provider: z.string().optional(),
  rocket: z.string().optional(),
  mission: z.string().optional(),
  missionDescription: z.string().optional(),
  pad: z.string().optional(),
  location: z.string().optional(),
  imageUrl: z.string().url().optional(),
  infoUrl: z.string().url().optional(),
});

export type Launch = z.infer<typeof LaunchSchema>;
