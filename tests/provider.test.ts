import { describe, expect, it } from 'vitest';
import { MockMarketDataProvider } from '../server/providers/mock';
import { resolveProviderId } from '../server/utils/provider';

describe('provider selection', () => {
  it('falls back to mock when Twelve Data key is missing', () => {
    expect(resolveProviderId('twelvedata', '')).toBe('mock');
  });

  it('uses twelvedata only when api key exists', () => {
    expect(resolveProviderId('twelvedata', 'demo-key')).toBe('twelvedata');
  });

  it('returns deterministic mock search results', async () => {
    const provider = new MockMarketDataProvider();
    const results = await provider.search('AAP');

    expect(results[0]?.symbol).toBe('AAPL');
  });
});
