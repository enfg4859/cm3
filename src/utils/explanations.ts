import type {
  CandlesResponse,
  IndicatorPoint,
  IndicatorToggleKey,
  SignalCategoryKey,
  SignalCategorySummary,
  SignalSummary
} from '@shared/market';
import { formatCompactNumber } from './format';

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

export interface ExplanationContent {
  description: string;
  details: string[];
}

function lastPoint<T extends { value: number | null }>(series: T[]) {
  return [...series].reverse().find((entry) => entry.value !== null) ?? null;
}

function formatNumericValue(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--';
  }

  return value.toFixed(digits);
}

function formatIndicatorValue(points: IndicatorPoint[], digits = 2) {
  return formatNumericValue(lastPoint(points)?.value, digits);
}

function isPriceAbove(latestClose: number | null, level: number | null) {
  return latestClose !== null && level !== null && latestClose > level;
}

function isPriceBelow(latestClose: number | null, level: number | null) {
  return latestClose !== null && level !== null && latestClose < level;
}

export function buildSummaryOverviewExplanation(summary: SignalSummary, t: TranslateFn): ExplanationContent {
  return {
    description: t('summary.info.overview'),
    details: [
      t('summary.info.currentBias', { bias: t(`summary.bias.${summary.bias}`) }),
      t('summary.info.currentConfidence', { confidence: t(`summary.confidence.${summary.confidence}`) }),
      t('summary.info.currentScores', {
        bullish: summary.scores.bullish.toFixed(1),
        bearish: summary.scores.bearish.toFixed(1),
        neutral: summary.scores.neutral.toFixed(1)
      }),
      t('summary.info.currentCoverage', { coverage: (summary.coverageFactor * 100).toFixed(0) }),
      t('summary.info.coverageNote')
    ]
  };
}

export function buildSignalCategoryExplanation(
  key: SignalCategoryKey,
  category: SignalCategorySummary,
  t: TranslateFn
): ExplanationContent {
  return {
    description: t(`summary.categoryInfo.${key}`),
    details: [
      t('summary.info.currentStatus', { status: t(`summary.categoryStatus.${category.status}`) }),
      t('summary.info.currentWeight', { weight: category.weight.toFixed(0) }),
      t('summary.info.currentContribution', {
        bullish: category.contribution.bullish.toFixed(1),
        bearish: category.contribution.bearish.toFixed(1),
        neutral: category.contribution.neutral.toFixed(1)
      })
    ]
  };
}

export function buildIndicatorExplanation(
  response: CandlesResponse | null | undefined,
  key: IndicatorToggleKey,
  t: TranslateFn,
  dateLocale: string
): ExplanationContent {
  const description = t(`indicator.info.${key}`);

  if (!response) {
    return { description, details: [] };
  }

  const latestCandle = response.candles.at(-1) ?? null;
  const latestClose = latestCandle?.close ?? null;

  switch (key) {
    case 'ema20':
    case 'ema50':
    case 'ema200': {
      const value = lastPoint(response.indicators[key])?.value ?? null;
      const label = t(`indicator.${key}`);
      const details = [t('indicator.current.value', { value: formatNumericValue(value) })];

      if (isPriceAbove(latestClose, value)) {
        details.push(t('indicator.current.priceAbove', { label }));
      } else if (isPriceBelow(latestClose, value)) {
        details.push(t('indicator.current.priceBelow', { label }));
      }

      return { description, details };
    }

    case 'bollinger': {
      const latestBand = [...response.indicators.bollinger].reverse().find((entry) => entry.width !== null) ?? null;
      const previousBand = response.indicators.bollinger.at(-2) ?? null;
      const width = latestBand?.width ?? null;
      const previousWidth = previousBand?.width ?? null;
      const details = [
        t('indicator.current.value', {
          value: width === null ? '--' : `${(width * 100).toFixed(1)}%`
        })
      ];

      if (width !== null && width < 0.05) {
        details.push(t('indicator.current.bollinger.squeeze'));
      } else if (width !== null && previousWidth !== null && width > previousWidth) {
        details.push(t('indicator.current.bollinger.expansion'));
      } else {
        details.push(t('indicator.current.bollinger.normal'));
      }

      return { description, details };
    }

    case 'vwap':
    case 'anchoredVwap': {
      const value = lastPoint(response.indicators[key])?.value ?? null;
      const label = key === 'vwap' ? t('indicator.vwap') : t('indicator.anchoredVwap');
      const details = [t('indicator.current.value', { value: formatNumericValue(value) })];

      if (isPriceAbove(latestClose, value)) {
        details.push(t('indicator.current.priceAbove', { label }));
      } else if (isPriceBelow(latestClose, value)) {
        details.push(t('indicator.current.priceBelow', { label }));
      }

      return { description, details };
    }

    case 'pdhPdl': {
      const { high, low } = response.analysisContext.previousDay;
      const details = [t('indicator.current.value', { value: `PDH ${formatNumericValue(high)} / PDL ${formatNumericValue(low)}` })];

      if (latestClose !== null && high !== null && latestClose > high) {
        details.push(t('indicator.current.prevDay.above'));
      } else if (latestClose !== null && low !== null && latestClose < low) {
        details.push(t('indicator.current.prevDay.below'));
      } else {
        details.push(t('indicator.current.prevDay.inside'));
      }

      return { description, details };
    }

    case 'openingRange': {
      const openingRange = response.analysisContext.openingRange;

      if (openingRange.status === 'restricted') {
        return { description, details: [t('indicator.current.openingRange.restricted')] };
      }

      if (openingRange.status !== 'ready') {
        return { description, details: [t('indicator.current.openingRange.unavailable')] };
      }

      const details = [
        t('indicator.current.value', {
          value: `ORH ${formatNumericValue(openingRange.high)} / ORL ${formatNumericValue(openingRange.low)}`
        })
      ];

      if (openingRange.breakState === 'breakout_up') {
        details.push(t('indicator.current.openingRange.breakoutUp'));
      } else if (openingRange.breakState === 'breakout_down') {
        details.push(t('indicator.current.openingRange.breakoutDown'));
      } else {
        details.push(t('indicator.current.openingRange.readyInside'));
      }

      return { description, details };
    }

    case 'volume':
      return {
        description,
        details: [
          t('indicator.current.value', {
            value: latestCandle ? formatCompactNumber(latestCandle.volume, dateLocale) : '--'
          })
        ]
      };

    case 'rsi': {
      const value = lastPoint(response.indicators.rsi14)?.value ?? null;
      const details = [t('indicator.current.value', { value: formatNumericValue(value) })];

      if (value !== null && value >= 70) {
        details.push(t('indicator.current.rsi.overbought'));
      } else if (value !== null && value <= 30) {
        details.push(t('indicator.current.rsi.oversold'));
      } else if (value !== null && value >= 50) {
        details.push(t('indicator.current.rsi.bullish'));
      } else {
        details.push(t('indicator.current.rsi.bearish'));
      }

      return { description, details };
    }

    case 'macd': {
      const macdPoint = [...response.indicators.macd]
        .reverse()
        .find((entry) => entry.macd !== null || entry.signal !== null || entry.histogram !== null);
      const details = [
        t('indicator.current.value', {
          value: `MACD ${formatNumericValue(macdPoint?.macd)} / Signal ${formatNumericValue(macdPoint?.signal)} / Hist ${formatNumericValue(macdPoint?.histogram)}`
        })
      ];

      if ((macdPoint?.macd ?? 0) > (macdPoint?.signal ?? 0) && (macdPoint?.histogram ?? 0) >= 0) {
        details.push(t('indicator.current.macd.bullish'));
      } else if ((macdPoint?.macd ?? 0) < (macdPoint?.signal ?? 0) && (macdPoint?.histogram ?? 0) <= 0) {
        details.push(t('indicator.current.macd.bearish'));
      } else {
        details.push(t('indicator.current.macd.neutral'));
      }

      return { description, details };
    }

    case 'adxDmi': {
      const adxPoint = [...response.indicators.adxDmi14]
        .reverse()
        .find((entry) => entry.adx !== null || entry.plusDi !== null || entry.minusDi !== null);
      const details = [
        t('indicator.current.value', {
          value: `ADX ${formatNumericValue(adxPoint?.adx)} / +DI ${formatNumericValue(adxPoint?.plusDi)} / -DI ${formatNumericValue(adxPoint?.minusDi)}`
        })
      ];

      if ((adxPoint?.adx ?? 0) < response.analysisContext.adxHeuristicThreshold) {
        details.push(t('indicator.current.adx.weak'));
      } else if ((adxPoint?.plusDi ?? 0) > (adxPoint?.minusDi ?? 0)) {
        details.push(t('indicator.current.adx.strongBullish'));
      } else if ((adxPoint?.minusDi ?? 0) > (adxPoint?.plusDi ?? 0)) {
        details.push(t('indicator.current.adx.strongBearish'));
      } else {
        details.push(t('indicator.current.adx.mixed'));
      }

      return { description, details };
    }

    case 'atr':
      return {
        description,
        details: [t('indicator.current.value', { value: formatIndicatorValue(response.indicators.atr14) })]
      };

    case 'rvol': {
      const value = lastPoint(response.indicators.rvol20)?.value ?? null;
      const details = [t('indicator.current.value', { value: formatNumericValue(value) })];

      if (response.analysisContext.participationMode === 'unavailable' || value === null) {
        details.push(t('indicator.current.rvol.unavailable'));
      } else if (value >= 1.5) {
        details.push(t('indicator.current.rvol.high'));
      } else if (value < 1) {
        details.push(t('indicator.current.rvol.low'));
      } else {
        details.push(t('indicator.current.rvol.normal'));
      }

      return { description, details };
    }

    case 'relativeStrength': {
      const relative = response.analysisContext.relative;
      if (relative.relativeNotApplicable) {
        return { description, details: [t('indicator.current.relative.notApplicable')] };
      }

      if (relative.benchmarkUnavailable) {
        return { description, details: [t('indicator.current.relative.unavailable')] };
      }

      const series = response.indicators.relativeStrength.filter((point) => point.value !== null);
      const latest = series.at(-1)?.value ?? null;
      const baseline = series.at(-6)?.value ?? null;
      const details = [t('indicator.current.value', { value: formatNumericValue(latest, 4) })];

      if (latest !== null && baseline !== null && latest > baseline) {
        details.push(t('indicator.current.relative.leading'));
      } else if (latest !== null && baseline !== null && latest < baseline) {
        details.push(t('indicator.current.relative.lagging'));
      } else {
        details.push(t('indicator.current.relative.mixed'));
      }

      return { description, details };
    }

    default:
      return { description, details: [] };
  }
}
