import 'dotenv/config';

import type { ProviderId } from '@shared/market';
import type { MarketDataProvider } from '../providers/types';
import { MockMarketDataProvider } from '../providers/mock';
import { TwelveDataProvider } from '../providers/twelvedata';

const mockProvider = new MockMarketDataProvider();
let twelveDataProvider: TwelveDataProvider | null = null;

export function resolveProviderId(
  preferredProvider = process.env.MARKET_DATA_PROVIDER,
  apiKey = process.env.TWELVEDATA_API_KEY
): ProviderId {
  const requested = preferredProvider?.toLowerCase();

  if (requested === 'twelvedata' && apiKey?.trim()) {
    return 'twelvedata';
  }

  return 'mock';
}

export function getMarketDataProvider(): MarketDataProvider {
  const providerId = resolveProviderId();

  if (providerId === 'twelvedata') {
    twelveDataProvider ??= new TwelveDataProvider(process.env.TWELVEDATA_API_KEY!.trim());
    return twelveDataProvider;
  }

  return mockProvider;
}
