import { z } from 'zod';
import {
  ANALYSIS_MODE_OPTIONS,
  ANCHOR_TYPE_OPTIONS,
  BENCHMARK_OPTIONS,
  INTERVAL_OPTIONS,
  OPENING_RANGE_OPTIONS,
  RANGE_OPTIONS,
  SESSION_OPTIONS
} from './market';

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
  interval: z.enum(INTERVAL_OPTIONS).default('1day'),
  mode: z.enum(ANALYSIS_MODE_OPTIONS).default('swing'),
  session: z.enum(SESSION_OPTIONS).default('regular'),
  benchmark: z.enum(BENCHMARK_OPTIONS).optional().nullable(),
  orMinutes: z
    .coerce.number()
    .refine((value) => OPENING_RANGE_OPTIONS.includes(value as (typeof OPENING_RANGE_OPTIONS)[number]), {
      message: 'Invalid opening range minutes.'
    })
    .transform((value) => value as (typeof OPENING_RANGE_OPTIONS)[number])
    .optional(),
  anchorType: z.enum(ANCHOR_TYPE_OPTIONS).default('gap'),
  anchorTime: z.coerce.number().int().positive().optional()
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type QuoteQuery = z.infer<typeof quoteQuerySchema>;
export type CandlesQuery = z.infer<typeof candlesQuerySchema>;
