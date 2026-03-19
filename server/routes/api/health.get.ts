import { defineEventHandler } from 'h3';
import { resolveProviderId } from '../../utils/provider';

export default defineEventHandler(() => ({
  status: 'ok',
  provider: resolveProviderId(),
  apiConfigured: Boolean(process.env.TWELVEDATA_API_KEY?.trim()),
  cacheTtlMs: Number(process.env.API_CACHE_TTL_MS ?? '60000')
}));
