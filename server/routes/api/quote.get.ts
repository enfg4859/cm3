import { createError, defineEventHandler, getQuery } from 'h3';
import { quoteQuerySchema } from '@shared/schemas';
import type { QuoteResponse } from '@shared/market';
import { withCache } from '../../utils/cache';
import { getMarketDataProvider } from '../../utils/provider';

export default defineEventHandler(async (event): Promise<QuoteResponse> => {
  const parsed = quoteQuerySchema.safeParse(getQuery(event));

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Invalid quote query.'
    });
  }

  const provider = getMarketDataProvider();
  const cacheKey = `quote:${provider.id}:${parsed.data.symbol}`;
  const { value, cached } = await withCache(cacheKey, () => provider.getQuote(parsed.data.symbol));

  return {
    quote: value,
    provider: provider.id,
    cached
  };
});
