import { createError, defineEventHandler, getQuery } from 'h3';
import { searchQuerySchema } from '@shared/schemas';
import type { SearchResponse } from '@shared/market';
import { withCache } from '../../utils/cache';
import { getMarketDataProvider } from '../../utils/provider';

export default defineEventHandler(async (event): Promise<SearchResponse> => {
  const parsed = searchQuerySchema.safeParse(getQuery(event));

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Invalid search query.'
    });
  }

  const provider = getMarketDataProvider();
  const cacheKey = `search:${provider.id}:${parsed.data.q.toUpperCase()}`;
  const { value, cached } = await withCache(cacheKey, () => provider.search(parsed.data.q));

  return {
    query: parsed.data.q,
    results: value,
    provider: provider.id,
    cached
  };
});
