import { describe, expect, it } from 'vitest';
import { candlesQuerySchema, quoteQuerySchema, searchQuerySchema } from '@shared/schemas';

describe('query schemas', () => {
  it('normalizes symbols to uppercase', () => {
    expect(quoteQuerySchema.parse({ symbol: 'aapl' }).symbol).toBe('AAPL');
  });

  it('applies candles defaults', () => {
    expect(candlesQuerySchema.parse({ symbol: 'nvda' })).toEqual({
      symbol: 'NVDA',
      range: '3M',
      interval: '1day'
    });
  });

  it('rejects empty search queries', () => {
    expect(() => searchQuerySchema.parse({ q: '' })).toThrow();
  });
});
