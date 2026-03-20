import { ADX, ATR, BollingerBands, EMA, MACD, RSI, SMA } from 'technicalindicators';
import type {
  AnalysisContext,
  AnalysisMode,
  AnchorType,
  BenchmarkSymbol,
  Candle,
  CandleIndicators,
  IndicatorPoint,
  InstrumentMeta,
  OpeningRangeContext,
  OpeningRangeMinutes,
  SessionType,
  SignalBias,
  SignalCategoryKey,
  SignalCategoryState,
  SignalCategorySummary,
  SignalScoreVector,
  SignalSummary,
  SupportedInterval,
  SupportedRange
} from '@shared/market';
import { ANALYSIS_CONFIG } from './analysis-config';
import { getLatestSessionWindow, isIntradayInterval, splitCandlesBySession } from './session';

interface BuildAnalysisInput {
  rawCandles: Candle[];
  visibleBars: number;
  instrument: InstrumentMeta;
  range: SupportedRange;
  interval: SupportedInterval;
  mode: AnalysisMode;
  sessionType: SessionType;
  benchmark: BenchmarkSymbol | null;
  orMinutes: OpeningRangeMinutes | null;
  anchorType: AnchorType;
  anchorTime: number | null;
  benchmarkCandles?: Candle[];
  openingRangeCandles?: Candle[];
}

interface BuildAnalysisResult {
  candles: Candle[];
  indicators: CandleIndicators;
  analysisContext: AnalysisContext;
  signalSummary: SignalSummary;
}

type CategoryDraft = {
  status: SignalCategoryState;
  vector: SignalScoreVector;
  headline: string;
};

const INTRADAY_RVOL_INTERVALS = new Set<SupportedInterval>(['1min', '5min', '15min']);
const BASE_WEIGHTS: Record<AnalysisMode, Record<SignalCategoryKey, number>> = {
  intraday: {
    trend: 16,
    trendStrength: 16,
    momentum: 14,
    volatility: 10,
    participation: 12,
    relative: 8,
    structure: 8,
    session: 16
  },
  swing: {
    trend: 22,
    trendStrength: 16,
    momentum: 16,
    volatility: 10,
    participation: 10,
    relative: 12,
    structure: 6,
    session: 8
  }
};

function round(value: number | null, digits = 4) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
}

function createVector(bullish: number, bearish: number, neutral: number): SignalScoreVector {
  const total = bullish + bearish + neutral;
  if (!total) {
    return { bullish: 0, bearish: 0, neutral: 1 };
  }

  return {
    bullish: bullish / total,
    bearish: bearish / total,
    neutral: neutral / total
  };
}

function padSeries<T>(length: number, values: T[]) {
  return Array.from<T | null>({ length }, (_, index) => {
    const offset = index - (length - values.length);
    return offset >= 0 ? values[offset] : null;
  });
}

function toPointSeries(candles: Candle[], values: number[]): IndicatorPoint[] {
  const padded = padSeries(candles.length, values);
  return candles.map((candle, index) => ({
    time: candle.time,
    value: round(padded[index] as number | null)
  }));
}

function toMacdSeries(
  candles: Candle[],
  values: Array<{ MACD?: number; signal?: number; histogram?: number }>
) {
  const padded = padSeries(candles.length, values);

  return candles.map((candle, index) => {
    const point = padded[index];
    return {
      time: candle.time,
      macd: round(point?.MACD ?? null),
      signal: round(point?.signal ?? null),
      histogram: round(point?.histogram ?? null)
    };
  });
}

function toBollingerSeries(
  candles: Candle[],
  values: Array<{ upper: number; middle: number; lower: number }>
) {
  const padded = padSeries(candles.length, values);

  return candles.map((candle, index) => {
    const point = padded[index];
    const upper = round(point?.upper ?? null);
    const middle = round(point?.middle ?? null);
    const lower = round(point?.lower ?? null);

    return {
      time: candle.time,
      upper,
      middle,
      lower,
      width:
        upper !== null && middle !== null && lower !== null && middle !== 0
          ? round((upper - lower) / middle)
          : null
    };
  });
}

function toAdxDmiSeries(candles: Candle[], values: Array<{ adx: number; pdi: number; mdi: number }>) {
  const padded = padSeries(candles.length, values);

  return candles.map((candle, index) => {
    const point = padded[index];
    return {
      time: candle.time,
      adx: round(point?.adx ?? null),
      plusDi: round(point?.pdi ?? null),
      minusDi: round(point?.mdi ?? null)
    };
  });
}

function getLastValue(series: IndicatorPoint[]) {
  return [...series].reverse().find((point) => point.value !== null)?.value ?? null;
}

function getLastMacd(series: CandleIndicators['macd']) {
  return [...series]
    .reverse()
    .find((point) => point.macd !== null || point.signal !== null || point.histogram !== null);
}

function getLastAdx(series: CandleIndicators['adxDmi14']) {
  return [...series]
    .reverse()
    .find((point) => point.adx !== null || point.plusDi !== null || point.minusDi !== null);
}

function getLastBollinger(series: CandleIndicators['bollinger']) {
  return [...series]
    .reverse()
    .find((point) => point.upper !== null || point.middle !== null || point.lower !== null);
}

function sliceIndicators(indicators: CandleIndicators, size: number): CandleIndicators {
  return {
    ema20: indicators.ema20.slice(-size),
    ema50: indicators.ema50.slice(-size),
    ema200: indicators.ema200.slice(-size),
    rsi14: indicators.rsi14.slice(-size),
    macd: indicators.macd.slice(-size),
    bollinger: indicators.bollinger.slice(-size),
    atr14: indicators.atr14.slice(-size),
    vwap: indicators.vwap.slice(-size),
    anchoredVwap: indicators.anchoredVwap.slice(-size),
    adxDmi14: indicators.adxDmi14.slice(-size),
    rvol20: indicators.rvol20.slice(-size),
    relativeStrength: indicators.relativeStrength.slice(-size)
  };
}

function calculateVwapSeries(candles: Candle[], instrument: InstrumentMeta, sessionType: SessionType) {
  const sessions = splitCandlesBySession(candles, instrument, sessionType);
  const vwapMap = new Map<number, number | null>();

  sessions.forEach(({ candles: sessionCandles }) => {
    let cumulativeVolume = 0;
    let cumulativePriceVolume = 0;

    sessionCandles.forEach((candle) => {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      cumulativeVolume += candle.volume;
      cumulativePriceVolume += typicalPrice * candle.volume;
      vwapMap.set(candle.time, round(cumulativePriceVolume / cumulativeVolume));
    });
  });

  return candles.map((candle) => ({
    time: candle.time,
    value: vwapMap.get(candle.time) ?? null
  }));
}

function resolveGapAnchor(candles: Candle[], instrument: InstrumentMeta, sessionType: SessionType) {
  const sessions = splitCandlesBySession(candles, instrument, sessionType);
  for (let index = sessions.length - 1; index > 0; index -= 1) {
    const current = sessions[index];
    const previous = sessions[index - 1];
    const first = current.candles[0];
    const previousClose = previous.candles.at(-1)?.close;

    if (!first || previousClose === undefined || previousClose === 0) {
      continue;
    }

    const gapPercent = Math.abs(((first.open - previousClose) / previousClose) * 100);
    if (gapPercent >= ANALYSIS_CONFIG.gapThresholdPercent) {
      return {
        time: first.time,
        label: `Gap ${gapPercent.toFixed(1)}%`
      };
    }
  }

  return null;
}

function resolveBreakoutAnchor(candles: Candle[]) {
  for (let index = candles.length - 1; index >= ANALYSIS_CONFIG.breakoutLookback; index -= 1) {
    const prior = candles.slice(index - ANALYSIS_CONFIG.breakoutLookback, index);
    const current = candles[index];
    const priorHigh = Math.max(...prior.map((candle) => candle.high));
    const priorLow = Math.min(...prior.map((candle) => candle.low));

    if (current.close > priorHigh || current.close < priorLow) {
      return {
        time: current.time,
        label: current.close > priorHigh ? 'Breakout up' : 'Breakout down'
      };
    }
  }

  return null;
}

function resolveSwingAnchor(candles: Candle[], direction: 'high' | 'low') {
  for (let index = candles.length - 6; index >= 5; index -= 1) {
    const current = candles[index];
    const left = candles.slice(index - 5, index);
    const right = candles.slice(index + 1, index + 6);
    const compareValue = direction === 'high' ? current.high : current.low;
    const leftCheck = left.every((candle) => (direction === 'high' ? compareValue >= candle.high : compareValue <= candle.low));
    const rightCheck = right.every((candle) =>
      direction === 'high' ? compareValue >= candle.high : compareValue <= candle.low
    );

    if (leftCheck && rightCheck) {
      return {
        time: current.time,
        label: direction === 'high' ? 'Swing high' : 'Swing low'
      };
    }
  }

  return null;
}

function resolveAnchor(
  candles: Candle[],
  instrument: InstrumentMeta,
  sessionType: SessionType,
  anchorType: AnchorType,
  stickyAnchorTime: number | null,
  range: SupportedRange
) {
  if (anchorType === 'manual') {
    return {
      anchorTime: stickyAnchorTime,
      label: stickyAnchorTime ? 'Manual anchor' : 'Manual anchor pending',
      anchorType,
      anchorSourceRange: range
    };
  }

  if (stickyAnchorTime) {
    return {
      anchorTime: stickyAnchorTime,
      label: `${anchorType} anchor`,
      anchorType,
      anchorSourceRange: range
    };
  }

  const resolved =
    anchorType === 'gap'
      ? resolveGapAnchor(candles, instrument, sessionType)
      : anchorType === 'breakout'
        ? resolveBreakoutAnchor(candles)
        : anchorType === 'swing_high'
          ? resolveSwingAnchor(candles, 'high')
          : resolveSwingAnchor(candles, 'low');

  return {
    anchorTime: resolved?.time ?? null,
    label: resolved?.label ?? `${anchorType} anchor unavailable`,
    anchorType,
    anchorSourceRange: range
  };
}

function calculateAnchoredVwapSeries(candles: Candle[], anchorTime: number | null) {
  if (!anchorTime) {
    return candles.map((candle) => ({
      time: candle.time,
      value: null
    }));
  }

  let cumulativeVolume = 0;
  let cumulativePriceVolume = 0;
  let started = false;

  return candles.map((candle) => {
    if (candle.time >= anchorTime) {
      started = true;
    }

    if (!started) {
      return {
        time: candle.time,
        value: null
      };
    }

    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeVolume += candle.volume;
    cumulativePriceVolume += typicalPrice * candle.volume;

    return {
      time: candle.time,
      value: round(cumulativePriceVolume / cumulativeVolume)
    };
  });
}

function calculateRvolClassic(candles: Candle[]) {
  const volumes = candles.map((candle) => candle.volume);
  const smaSeries = padSeries(candles.length, SMA.calculate({ period: 20, values: volumes }));

  return candles.map((candle, index) => {
    const baseline = smaSeries[index] as number | null;
    return {
      time: candle.time,
      value: baseline && baseline !== 0 ? round(candle.volume / baseline) : null
    };
  });
}

function calculateRelativeStrengthSeries(candles: Candle[], benchmarkCandles: Candle[] | undefined) {
  if (!benchmarkCandles?.length) {
    return candles.map((candle) => ({
      time: candle.time,
      value: null
    }));
  }

  const benchmarkMap = new Map(benchmarkCandles.map((candle) => [candle.time, candle.close]));
  return candles.map((candle) => {
    const benchmarkClose = benchmarkMap.get(candle.time);
    return {
      time: candle.time,
      value: benchmarkClose ? round(candle.close / benchmarkClose, 6) : null
    };
  });
}

function calculateRvolTod(
  candles: Candle[],
  instrument: InstrumentMeta,
  sessionType: SessionType,
  interval: SupportedInterval
) {
  if (!INTRADAY_RVOL_INTERVALS.has(interval)) {
    return candles.map((candle) => ({
      time: candle.time,
      value: null
    }));
  }

  const sessions = splitCandlesBySession(candles, instrument, sessionType);
  const valueMap = new Map<number, number | null>();

  sessions.forEach(({ candles: sessionCandles }, sessionIndex) => {
    let cumulativeVolume = 0;

    sessionCandles.forEach((candle, barIndex) => {
      cumulativeVolume += candle.volume;

      const comparisons = sessions
        .slice(Math.max(0, sessionIndex - ANALYSIS_CONFIG.rvolTodLookbackSessions), sessionIndex)
        .map((session) => {
          let priorCumulative = 0;
          for (let index = 0; index <= barIndex && index < session.candles.length; index += 1) {
            priorCumulative += session.candles[index].volume;
          }
          return priorCumulative;
        })
        .filter((value) => value > 0);

      if (!comparisons.length) {
        valueMap.set(candle.time, null);
        return;
      }

      const average = comparisons.reduce((sum, value) => sum + value, 0) / comparisons.length;
      valueMap.set(candle.time, average ? round(cumulativeVolume / average) : null);
    });
  });

  return candles.map((candle) => ({
    time: candle.time,
    value: valueMap.get(candle.time) ?? null
  }));
}

function calculateIndicators(
  candles: Candle[],
  instrument: InstrumentMeta,
  sessionType: SessionType,
  anchorTime: number | null,
  benchmarkCandles?: Candle[]
): CandleIndicators {
  const closes = candles.map((candle) => candle.close);
  const highs = candles.map((candle) => candle.high);
  const lows = candles.map((candle) => candle.low);

  return {
    ema20: toPointSeries(candles, EMA.calculate({ period: 20, values: closes })),
    ema50: toPointSeries(candles, EMA.calculate({ period: 50, values: closes })),
    ema200: toPointSeries(candles, EMA.calculate({ period: 200, values: closes })),
    rsi14: toPointSeries(candles, RSI.calculate({ period: 14, values: closes })),
    macd: toMacdSeries(
      candles,
      MACD.calculate({
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
        values: closes
      })
    ),
    bollinger: toBollingerSeries(
      candles,
      BollingerBands.calculate({
        period: 20,
        stdDev: 2,
        values: closes
      })
    ),
    atr14: toPointSeries(
      candles,
      ATR.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: 14
      })
    ),
    vwap: calculateVwapSeries(candles, instrument, sessionType),
    anchoredVwap: calculateAnchoredVwapSeries(candles, anchorTime),
    adxDmi14: toAdxDmiSeries(
      candles,
      ADX.calculate({
        close: closes,
        high: highs,
        low: lows,
        period: 14
      })
    ),
    rvol20: candles.map((candle) => ({ time: candle.time, value: null })),
    relativeStrength: calculateRelativeStrengthSeries(candles, benchmarkCandles)
  };
}

function getAllowedOpeningRangeMinutes(interval: SupportedInterval): OpeningRangeMinutes[] {
  if (interval === '1h' || interval === '1day') {
    return [];
  }

  if (interval === '15min') {
    return [15, 30];
  }

  return [5, 15, 30];
}

function buildOpeningRangeContext(
  candles: Candle[],
  oneMinuteCandles: Candle[] | undefined,
  instrument: InstrumentMeta,
  sessionType: SessionType,
  interval: SupportedInterval,
  requestedMinutes: OpeningRangeMinutes | null
): OpeningRangeContext {
  const allowedMinutes = getAllowedOpeningRangeMinutes(interval);

  if (!requestedMinutes) {
    return {
      status: 'not_applicable',
      minutes: null,
      high: null,
      low: null,
      breakState: 'not_applicable',
      sourceInterval: 'none',
      allowedMinutes
    };
  }

  if (!allowedMinutes.includes(requestedMinutes)) {
    return {
      status: 'restricted',
      minutes: requestedMinutes,
      high: null,
      low: null,
      breakState: 'not_applicable',
      sourceInterval: oneMinuteCandles?.length ? '1min' : 'none',
      allowedMinutes
    };
  }

  if (!oneMinuteCandles?.length) {
    return {
      status: 'unavailable',
      minutes: requestedMinutes,
      high: null,
      low: null,
      breakState: 'not_applicable',
      sourceInterval: 'none',
      allowedMinutes
    };
  }

  const sessions = splitCandlesBySession(oneMinuteCandles, instrument, sessionType);
  const latestSession = sessions.at(-1);
  const latestVisibleCandle = candles.at(-1);

  if (!latestSession || !latestVisibleCandle) {
    return {
      status: 'unavailable',
      minutes: requestedMinutes,
      high: null,
      low: null,
      breakState: 'not_applicable',
      sourceInterval: '1min',
      allowedMinutes
    };
  }

  const sessionStart = latestSession.session.sessionStart;
  const sessionEnd = sessionStart + requestedMinutes * 60;
  const orCandles = latestSession.candles.filter((candle) => candle.time >= sessionStart && candle.time < sessionEnd);

  if (!orCandles.length) {
    return {
      status: 'unavailable',
      minutes: requestedMinutes,
      high: null,
      low: null,
      breakState: 'not_applicable',
      sourceInterval: '1min',
      allowedMinutes
    };
  }

  const high = Math.max(...orCandles.map((candle) => candle.high));
  const low = Math.min(...orCandles.map((candle) => candle.low));
  const breakState =
    latestVisibleCandle.close > high
      ? 'breakout_up'
      : latestVisibleCandle.close < low
        ? 'breakout_down'
        : 'inside';

  return {
    status: 'ready',
    minutes: requestedMinutes,
    high: round(high),
    low: round(low),
    breakState,
    sourceInterval: '1min',
    allowedMinutes
  };
}

function buildPreviousDayContext(candles: Candle[], instrument: InstrumentMeta, sessionType: SessionType) {
  const sessions = splitCandlesBySession(candles, instrument, sessionType);
  const previousSession = sessions.at(-2);

  if (!previousSession) {
    return {
      high: null,
      low: null,
      sessionStart: null,
      sessionEnd: null
    };
  }

  return {
    high: round(Math.max(...previousSession.candles.map((candle) => candle.high))),
    low: round(Math.min(...previousSession.candles.map((candle) => candle.low))),
    sessionStart: previousSession.session.sessionStart,
    sessionEnd: previousSession.session.sessionEnd
  };
}

function buildGapContext(candles: Candle[], instrument: InstrumentMeta, sessionType: SessionType) {
  const sessions = splitCandlesBySession(candles, instrument, sessionType);
  const currentSession = sessions.at(-1);
  const previousSession = sessions.at(-2);

  if (!currentSession || !previousSession) {
    return {
      direction: 'not_applicable' as const,
      percent: null,
      filled: null,
      thresholdPercent: ANALYSIS_CONFIG.gapThresholdPercent
    };
  }

  const currentOpen = currentSession.candles[0]?.open;
  const previousClose = previousSession.candles.at(-1)?.close;

  if (!currentOpen || !previousClose) {
    return {
      direction: 'not_applicable' as const,
      percent: null,
      filled: null,
      thresholdPercent: ANALYSIS_CONFIG.gapThresholdPercent
    };
  }

  const gapPercent = ((currentOpen - previousClose) / previousClose) * 100;
  const direction = Math.abs(gapPercent) < 0.01 ? 'flat' : gapPercent > 0 ? 'up' : 'down';
  const filled =
    direction === 'flat'
      ? true
      : direction === 'up'
        ? currentSession.candles.some((candle) => candle.low <= previousClose)
        : currentSession.candles.some((candle) => candle.high >= previousClose);

  return {
    direction,
    percent: round(gapPercent),
    filled,
    thresholdPercent: ANALYSIS_CONFIG.gapThresholdPercent
  };
}

function createUnavailableCategory(headline: string): CategoryDraft {
  return {
    status: 'unavailable',
    vector: createVector(0, 0, 1),
    headline
  };
}

function createNotApplicableCategory(headline: string): CategoryDraft {
  return {
    status: 'not_applicable',
    vector: createVector(0, 0, 1),
    headline
  };
}

function buildTrendStrengthCategory(indicators: CandleIndicators): CategoryDraft {
  const latest = getLastAdx(indicators.adxDmi14);
  const previous = indicators.adxDmi14.at(-2);

  if (!latest || latest.adx === null || latest.plusDi === null || latest.minusDi === null) {
    return createUnavailableCategory('ADX/DMI unavailable');
  }

  const rising = previous?.adx !== null && previous?.adx !== undefined ? latest.adx >= previous.adx : true;
  const dominantBull = latest.plusDi > latest.minusDi;
  const dominantBear = latest.minusDi > latest.plusDi;

  if (latest.adx < ANALYSIS_CONFIG.adxHeuristicThreshold) {
    return {
      status: 'neutral',
      vector: createVector(0.15, 0.15, 0.7),
      headline: 'Weak trend regime'
    };
  }

  if (latest.adx >= 25 && rising && dominantBull) {
    return {
      status: 'bullish',
      vector: createVector(0.9, 0.05, 0.05),
      headline: 'ADX confirms bullish trend'
    };
  }

  if (latest.adx >= 25 && rising && dominantBear) {
    return {
      status: 'bearish',
      vector: createVector(0.05, 0.9, 0.05),
      headline: 'ADX confirms bearish trend'
    };
  }

  if (dominantBull) {
    return {
      status: 'bullish',
      vector: createVector(0.6, 0.15, 0.25),
      headline: 'DMI leans bullish'
    };
  }

  if (dominantBear) {
    return {
      status: 'bearish',
      vector: createVector(0.15, 0.6, 0.25),
      headline: 'DMI leans bearish'
    };
  }

  return {
    status: 'neutral',
    vector: createVector(0.2, 0.2, 0.6),
    headline: 'ADX mixed'
  };
}

function buildTrendCategory(latestCandle: Candle, indicators: CandleIndicators, trendStrength: CategoryDraft): CategoryDraft {
  const ema20 = getLastValue(indicators.ema20);
  const ema50 = getLastValue(indicators.ema50);
  const ema200 = getLastValue(indicators.ema200);

  if (ema20 === null || ema50 === null || ema200 === null) {
    return createUnavailableCategory('EMA trend unavailable');
  }

  const previousEma20 = indicators.ema20.at(-2)?.value ?? ema20;
  const previousEma50 = indicators.ema50.at(-2)?.value ?? ema50;
  const previousEma200 = indicators.ema200.at(-2)?.value ?? ema200;

  let bullish = 0;
  let bearish = 0;
  let neutral = 0;

  if (latestCandle.close > ema20 && ema20 > ema50 && ema50 > ema200) {
    bullish += 0.45;
  } else if (latestCandle.close < ema20 && ema20 < ema50 && ema50 < ema200) {
    bearish += 0.45;
  } else {
    neutral += 0.45;
  }

  const bullishSlopeCount = [
    ema20 - previousEma20,
    ema50 - previousEma50,
    ema200 - previousEma200
  ].filter((value) => value > 0).length;
  const bearishSlopeCount = [
    ema20 - previousEma20,
    ema50 - previousEma50,
    ema200 - previousEma200
  ].filter((value) => value < 0).length;

  if (bullishSlopeCount >= 2) {
    bullish += 0.3;
  } else if (bearishSlopeCount >= 2) {
    bearish += 0.3;
  } else {
    neutral += 0.3;
  }

  if (latestCandle.close > ema20 && latestCandle.close > ema50) {
    bullish += 0.25;
  } else if (latestCandle.close < ema20 && latestCandle.close < ema50) {
    bearish += 0.25;
  } else {
    neutral += 0.25;
  }

  let vector = createVector(bullish, bearish, neutral);
  if (trendStrength.status === 'neutral') {
    vector = createVector(vector.bullish * 0.4, vector.bearish * 0.4, vector.neutral + 0.6);
  }

  return {
    status:
      vector.bullish > vector.bearish && vector.bullish > vector.neutral
        ? 'bullish'
        : vector.bearish > vector.bullish && vector.bearish > vector.neutral
          ? 'bearish'
          : 'neutral',
    vector,
    headline: 'Trend composite'
  };
}

function buildMomentumCategory(indicators: CandleIndicators): CategoryDraft {
  const rsi = getLastValue(indicators.rsi14);
  const macd = getLastMacd(indicators.macd);

  if (rsi === null || !macd || macd.macd === null || macd.signal === null || macd.histogram === null) {
    return createUnavailableCategory('Momentum unavailable');
  }

  let rsiVector = createVector(0.2, 0.2, 0.6);
  if (rsi >= 55 && rsi <= 70) {
    rsiVector = createVector(0.75, 0.1, 0.15);
  } else if (rsi > 70) {
    rsiVector = createVector(0.4, 0.2, 0.4);
  } else if (rsi <= 45 && rsi >= 30) {
    rsiVector = createVector(0.1, 0.75, 0.15);
  } else if (rsi < 30) {
    rsiVector = createVector(0.2, 0.4, 0.4);
  }

  let macdVector = createVector(0.2, 0.2, 0.6);
  if (macd.macd > macd.signal && macd.histogram >= 0) {
    macdVector = macd.macd >= 0 ? createVector(0.85, 0.05, 0.1) : createVector(0.65, 0.1, 0.25);
  } else if (macd.macd < macd.signal && macd.histogram <= 0) {
    macdVector = macd.macd <= 0 ? createVector(0.05, 0.85, 0.1) : createVector(0.1, 0.65, 0.25);
  }

  const vector = createVector(
    rsiVector.bullish * 0.4 + macdVector.bullish * 0.6,
    rsiVector.bearish * 0.4 + macdVector.bearish * 0.6,
    rsiVector.neutral * 0.4 + macdVector.neutral * 0.6
  );

  return {
    status:
      vector.bullish > vector.bearish && vector.bullish > vector.neutral
        ? 'bullish'
        : vector.bearish > vector.bullish && vector.bearish > vector.neutral
          ? 'bearish'
          : 'neutral',
    vector,
    headline: 'Momentum composite'
  };
}

function buildVolatilityCategory(indicators: CandleIndicators): CategoryDraft {
  const atr = getLastValue(indicators.atr14);
  const band = getLastBollinger(indicators.bollinger);
  const previousBand = indicators.bollinger.at(-2);

  if (atr === null || !band || band.width === null) {
    return createUnavailableCategory('Volatility unavailable');
  }

  const previousWidth = previousBand?.width ?? band.width;
  const expanding = band.width > previousWidth;

  if (band.width < 0.05 && !expanding) {
    return {
      status: 'neutral',
      vector: createVector(0.2, 0.2, 0.6),
      headline: 'Bollinger squeeze'
    };
  }

  if (expanding) {
    return {
      status: 'neutral',
      vector: createVector(0.3, 0.3, 0.4),
      headline: 'Volatility expansion'
    };
  }

  return {
    status: 'neutral',
    vector: createVector(0.2, 0.2, 0.6),
    headline: 'Volatility normal'
  };
}

function buildParticipationCategory(
  interval: SupportedInterval,
  indicators: CandleIndicators,
  openingRange: OpeningRangeContext
): CategoryDraft {
  const latestRvol = getLastValue(indicators.rvol20);

  if (interval === '1h') {
    return createUnavailableCategory('Participation unavailable on 1h');
  }

  if (latestRvol === null) {
    return createUnavailableCategory('RVOL unavailable');
  }

  if (openingRange.breakState === 'breakout_up') {
    if (latestRvol >= 1.5) {
      return {
        status: 'bullish',
        vector: createVector(0.85, 0.05, 0.1),
        headline: 'Breakout backed by RVOL'
      };
    }

    if (latestRvol < 1) {
      return {
        status: 'neutral',
        vector: createVector(0.25, 0.15, 0.6),
        headline: 'Breakout lacks RVOL'
      };
    }
  }

  if (openingRange.breakState === 'breakout_down') {
    if (latestRvol >= 1.5) {
      return {
        status: 'bearish',
        vector: createVector(0.05, 0.85, 0.1),
        headline: 'Breakdown backed by RVOL'
      };
    }

    if (latestRvol < 1) {
      return {
        status: 'neutral',
        vector: createVector(0.15, 0.25, 0.6),
        headline: 'Breakdown lacks RVOL'
      };
    }
  }

  if (latestRvol >= 1.2) {
    return {
      status: 'neutral',
      vector: createVector(0.35, 0.35, 0.3),
      headline: 'Participation elevated'
    };
  }

  return {
    status: 'neutral',
    vector: createVector(0.2, 0.2, 0.6),
    headline: 'Participation normal'
  };
}

function buildRelativeCategory(
  indicators: CandleIndicators,
  benchmarkUnavailable: boolean,
  relativeNotApplicable: boolean
): CategoryDraft {
  if (relativeNotApplicable) {
    return createNotApplicableCategory('Relative strength not applicable');
  }

  if (benchmarkUnavailable) {
    return createUnavailableCategory('Benchmark unavailable');
  }

  const series = indicators.relativeStrength.filter((point) => point.value !== null);
  if (series.length < ANALYSIS_CONFIG.relativeBreakoutLookbackBars) {
    return createUnavailableCategory('Relative strength unavailable');
  }

  const latest = series.at(-1)!.value as number;
  const slopeBase = series.at(-1 - ANALYSIS_CONFIG.relativeSlopeLookbackBars)?.value as number | undefined;
  const priorWindow = series.slice(-ANALYSIS_CONFIG.relativeBreakoutLookbackBars - 1, -1).map((point) => point.value as number);
  const priorHigh = Math.max(...priorWindow);
  const priorLow = Math.min(...priorWindow);

  if (slopeBase !== undefined && latest > slopeBase && latest >= priorHigh) {
    return {
      status: 'bullish',
      vector: createVector(0.8, 0.05, 0.15),
      headline: 'Relative strength leads higher'
    };
  }

  if (slopeBase !== undefined && latest < slopeBase && latest <= priorLow) {
    return {
      status: 'bearish',
      vector: createVector(0.05, 0.8, 0.15),
      headline: 'Relative strength lags'
    };
  }

  return {
    status: 'neutral',
    vector: createVector(0.2, 0.2, 0.6),
    headline: 'Relative strength mixed'
  };
}

function buildStructureCategory(latestCandle: Candle, previousDay: AnalysisContext['previousDay']): CategoryDraft {
  if (previousDay.high === null || previousDay.low === null) {
    return createUnavailableCategory('PDH/PDL unavailable');
  }

  if (latestCandle.close > previousDay.high) {
    return {
      status: 'bullish',
      vector: createVector(0.8, 0.05, 0.15),
      headline: 'Price holds above PDH'
    };
  }

  if (latestCandle.close < previousDay.low) {
    return {
      status: 'bearish',
      vector: createVector(0.05, 0.8, 0.15),
      headline: 'Price breaks below PDL'
    };
  }

  return {
    status: 'neutral',
    vector: createVector(0.2, 0.2, 0.6),
    headline: 'Price inside PDH/PDL'
  };
}

function buildSessionCategory(
  latestCandle: Candle,
  indicators: CandleIndicators,
  openingRange: OpeningRangeContext,
  gap: AnalysisContext['gap']
): CategoryDraft {
  const vwap = getLastValue(indicators.vwap);
  const anchoredVwap = getLastValue(indicators.anchoredVwap);

  if (vwap === null && anchoredVwap === null && openingRange.status !== 'ready') {
    return createUnavailableCategory('Session context unavailable');
  }

  let bullish = 0;
  let bearish = 0;
  let neutral = 0.2;

  if (vwap !== null) {
    if (latestCandle.close > vwap) {
      bullish += 0.3;
    } else {
      bearish += 0.3;
    }
  }

  if (anchoredVwap !== null) {
    if (latestCandle.close > anchoredVwap) {
      bullish += 0.3;
    } else {
      bearish += 0.3;
    }
  }

  if (openingRange.status === 'ready') {
    if (openingRange.breakState === 'breakout_up') {
      bullish += 0.3;
    } else if (openingRange.breakState === 'breakout_down') {
      bearish += 0.3;
    } else {
      neutral += 0.2;
    }
  }

  if (gap.direction === 'up' && gap.filled === false) {
    bullish += 0.2;
  } else if (gap.direction === 'down' && gap.filled === false) {
    bearish += 0.2;
  } else {
    neutral += 0.1;
  }

  const vector = createVector(bullish, bearish, neutral);
  return {
    status:
      vector.bullish > vector.bearish && vector.bullish > vector.neutral
        ? 'bullish'
        : vector.bearish > vector.bullish && vector.bearish > vector.neutral
          ? 'bearish'
          : 'neutral',
    vector,
    headline: 'Session structure'
  };
}

function mapBias(score: number): SignalBias {
  if (score >= 24) {
    return 'strong_bullish';
  }

  if (score >= 12) {
    return 'bullish';
  }

  if (score <= -24) {
    return 'strong_bearish';
  }

  if (score <= -12) {
    return 'bearish';
  }

  return 'neutral';
}

function toLabel(bias: SignalBias) {
  switch (bias) {
    case 'strong_bullish':
      return 'Strong Bullish';
    case 'bullish':
      return 'Bullish';
    case 'strong_bearish':
      return 'Strong Bearish';
    case 'bearish':
      return 'Bearish';
    default:
      return 'Neutral';
  }
}

function scaleVector(vector: SignalScoreVector, weight: number): SignalScoreVector {
  return {
    bullish: round(vector.bullish * weight, 4) ?? 0,
    bearish: round(vector.bearish * weight, 4) ?? 0,
    neutral: round(vector.neutral * weight, 4) ?? 0
  };
}

function normalizeCategories(mode: AnalysisMode, drafts: Record<SignalCategoryKey, CategoryDraft>) {
  const baseWeights = BASE_WEIGHTS[mode];
  const eligibleKeys = (Object.keys(drafts) as SignalCategoryKey[]).filter(
    (key) => drafts[key].status !== 'not_applicable' && drafts[key].status !== 'unavailable'
  );
  const eligibleWeight = eligibleKeys.reduce((sum, key) => sum + baseWeights[key], 0);
  const totalWeight = Object.values(baseWeights).reduce((sum, weight) => sum + weight, 0);

  const categories = {} as Record<SignalCategoryKey, SignalCategorySummary>;
  let bullish = 0;
  let bearish = 0;
  let neutral = 0;

  (Object.keys(drafts) as SignalCategoryKey[]).forEach((key) => {
    const draft = drafts[key];
    const effectiveWeight =
      draft.status === 'not_applicable' || draft.status === 'unavailable' || eligibleWeight === 0
        ? 0
        : (baseWeights[key] / eligibleWeight) * 100;
    const contribution = scaleVector(draft.vector, effectiveWeight);

    bullish += contribution.bullish;
    bearish += contribution.bearish;
    neutral += contribution.neutral;

    categories[key] = {
      status: draft.status,
      weight: round(effectiveWeight, 2) ?? 0,
      contribution,
      headline: draft.headline
    };
  });

  const orderedScores = [bullish, bearish, neutral].sort((left, right) => right - left);
  const margin = orderedScores[0] - orderedScores[1];
  const coverageFactor = eligibleWeight / totalWeight;
  const confidenceValue = Math.max(0, Math.min(1, (margin / 100) * coverageFactor));
  const confidence = confidenceValue >= 0.22 ? 'high' : confidenceValue >= 0.12 ? 'medium' : 'low';
  const bias = mapBias(bullish - bearish);

  return {
    categories,
    scores: {
      bullish: round(bullish, 2) ?? 0,
      bearish: round(bearish, 2) ?? 0,
      neutral: round(neutral, 2) ?? 0
    },
    bias,
    label: toLabel(bias),
    confidence,
    confidenceValue: round(confidenceValue, 4) ?? 0,
    coverageFactor: round(coverageFactor, 4) ?? 0
  };
}

function buildBullets(categories: Record<SignalCategoryKey, SignalCategorySummary>) {
  return (Object.values(categories) as SignalCategorySummary[])
    .filter((category) => category.weight > 0)
    .sort((left, right) => {
      const leftStrength = Math.max(left.contribution.bullish, left.contribution.bearish) - left.contribution.neutral;
      const rightStrength = Math.max(right.contribution.bullish, right.contribution.bearish) - right.contribution.neutral;
      return rightStrength - leftStrength;
    })
    .slice(0, 4)
    .map((category) => category.headline);
}

export function buildAnalysis(input: BuildAnalysisInput): BuildAnalysisResult {
  const resolvedAnchor = resolveAnchor(
    input.rawCandles,
    input.instrument,
    input.sessionType,
    input.anchorType,
    input.anchorTime,
    input.range
  );
  const baseIndicators = calculateIndicators(
    input.rawCandles,
    input.instrument,
    input.sessionType,
    resolvedAnchor.anchorTime,
    input.benchmarkCandles
  );
  const participationMode =
    INTRADAY_RVOL_INTERVALS.has(input.interval) && isIntradayInterval(input.interval)
      ? 'rvol_tod'
      : input.interval === '1day'
        ? 'rvol_classic'
        : 'unavailable';

  baseIndicators.rvol20 =
    participationMode === 'rvol_tod'
      ? calculateRvolTod(input.rawCandles, input.instrument, input.sessionType, input.interval)
      : input.interval === '1day'
        ? calculateRvolClassic(input.rawCandles)
        : input.rawCandles.map((candle) => ({ time: candle.time, value: null }));

  const visibleCandles = input.rawCandles.slice(-input.visibleBars);
  const indicators = sliceIndicators(baseIndicators, visibleCandles.length);
  const latestCandle = visibleCandles.at(-1);
  const previousDay = buildPreviousDayContext(input.rawCandles, input.instrument, input.sessionType);
  const gap = buildGapContext(input.rawCandles, input.instrument, input.sessionType);
  const openingRange = buildOpeningRangeContext(
    visibleCandles,
    input.openingRangeCandles,
    input.instrument,
    input.sessionType,
    input.interval,
    input.orMinutes
  );
  const relativeNotApplicable = !input.instrument.supportsRelativeStrength;
  const benchmarkUnavailable = Boolean(
    input.instrument.supportsRelativeStrength && input.benchmark && !input.benchmarkCandles?.length
  );

  const activeSession = latestCandle
    ? getLatestSessionWindow(input.instrument, latestCandle.time, input.sessionType)
    : {
        sessionStart: null,
        sessionEnd: null,
        isEarlyClose: false
      };

  const analysisContext: AnalysisContext = {
    mode: input.mode,
    sessionDefinition: {
      exchangeTimezone: input.instrument.exchangeTimezone,
      calendarId: input.instrument.calendarId,
      sessionType: input.sessionType,
      sessionStart: activeSession.sessionStart,
      sessionEnd: activeSession.sessionEnd,
      isEarlyClose: activeSession.isEarlyClose
    },
    anchor: {
      anchorType: resolvedAnchor.anchorType,
      anchorTime: resolvedAnchor.anchorTime,
      anchorSourceRange: resolvedAnchor.anchorSourceRange,
      isSticky: true,
      label: resolvedAnchor.label
    },
    previousDay,
    gap,
    openingRange,
    relative: {
      benchmark: relativeNotApplicable ? null : input.benchmark,
      benchmarkUnavailable,
      relativeNotApplicable
    },
    participationMode,
    gapThresholdPercent: ANALYSIS_CONFIG.gapThresholdPercent,
    adxHeuristicThreshold: ANALYSIS_CONFIG.adxHeuristicThreshold
  };

  if (!latestCandle) {
    const emptyCategories = {
      trend: { status: 'unavailable', weight: 0, contribution: { bullish: 0, bearish: 0, neutral: 0 }, headline: 'Trend unavailable' },
      trendStrength: { status: 'unavailable', weight: 0, contribution: { bullish: 0, bearish: 0, neutral: 0 }, headline: 'Trend strength unavailable' },
      momentum: { status: 'unavailable', weight: 0, contribution: { bullish: 0, bearish: 0, neutral: 0 }, headline: 'Momentum unavailable' },
      volatility: { status: 'unavailable', weight: 0, contribution: { bullish: 0, bearish: 0, neutral: 0 }, headline: 'Volatility unavailable' },
      participation: { status: 'unavailable', weight: 0, contribution: { bullish: 0, bearish: 0, neutral: 0 }, headline: 'Participation unavailable' },
      relative: { status: 'unavailable', weight: 0, contribution: { bullish: 0, bearish: 0, neutral: 0 }, headline: 'Relative unavailable' },
      structure: { status: 'unavailable', weight: 0, contribution: { bullish: 0, bearish: 0, neutral: 0 }, headline: 'Structure unavailable' },
      session: { status: 'unavailable', weight: 0, contribution: { bullish: 0, bearish: 0, neutral: 0 }, headline: 'Session unavailable' }
    } as Record<SignalCategoryKey, SignalCategorySummary>;

    return {
      candles: visibleCandles,
      indicators,
      analysisContext,
      signalSummary: {
        bias: 'neutral',
        label: 'Neutral',
        confidence: 'low',
        confidenceValue: 0,
        coverageFactor: 0,
        scores: { bullish: 0, bearish: 0, neutral: 100 },
        categories: emptyCategories,
        bullets: ['No market data available.']
      }
    };
  }

  const trendStrength = buildTrendStrengthCategory(indicators);
  const drafts: Record<SignalCategoryKey, CategoryDraft> = {
    trend: buildTrendCategory(latestCandle, indicators, trendStrength),
    trendStrength,
    momentum: buildMomentumCategory(indicators),
    volatility: buildVolatilityCategory(indicators),
    participation: buildParticipationCategory(input.interval, indicators, openingRange),
    relative: buildRelativeCategory(indicators, benchmarkUnavailable, relativeNotApplicable),
    structure: buildStructureCategory(latestCandle, previousDay),
    session: buildSessionCategory(latestCandle, indicators, openingRange, gap)
  };

  const normalized = normalizeCategories(input.mode, drafts);

  return {
    candles: visibleCandles,
    indicators,
    analysisContext,
    signalSummary: {
      bias: normalized.bias,
      label: normalized.label,
      confidence: normalized.confidence,
      confidenceValue: normalized.confidenceValue,
      coverageFactor: normalized.coverageFactor,
      scores: normalized.scores,
      categories: normalized.categories,
      bullets: buildBullets(normalized.categories)
    }
  };
}
