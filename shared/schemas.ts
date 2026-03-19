import { z } from 'zod';
import { INTERVAL_OPTIONS, RANGE_OPTIONS } from './market';

const symbolSchema = z
  .string()
  .trim()
  .min(1, 'Symbol is required.')
  .max(24, 'Symbol is too long.')
  .regex(/^[A-Za-z0-9./:-]+$/, 'Invalid symbol format.')
  .transform((value) => value.toUpperCase());

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Search term is required.').max(40, 'Search term is too long.')
});

export const quoteQuerySchema = z.object({
  symbol: symbolSchema
});

export const candlesQuerySchema = z.object({
  symbol: symbolSchema,
  range: z.enum(RANGE_OPTIONS).default('3M'),
  interval: z.enum(INTERVAL_OPTIONS).default('1day')
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type QuoteQuery = z.infer<typeof quoteQuerySchema>;
export type CandlesQuery = z.infer<typeof candlesQuerySchema>;
