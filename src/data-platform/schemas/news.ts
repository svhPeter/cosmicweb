import { z } from "zod";

export const NewsArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  url: z.string().url(),
  imageUrl: z.string().url().optional(),
  publishedAt: z.string().datetime(),
  source: z.string(),
});

export type NewsArticle = z.infer<typeof NewsArticleSchema>;
