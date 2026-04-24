import { z } from "zod";

/** NASA APOD — https://api.nasa.gov */
export const ApodSchema = z.object({
  title: z.string(),
  date: z.string(),
  explanation: z.string(),
  mediaType: z.enum(["image", "video", "other"]),
  url: z.string().url(),
  hdUrl: z.string().url().optional(),
  copyright: z.string().optional(),
});

export type Apod = z.infer<typeof ApodSchema>;
