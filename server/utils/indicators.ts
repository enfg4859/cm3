import { ATR, BollingerBands, EMA, MACD, RSI } from 'technicalindicators';
import type {
  BollingerPoint,
  Candle,
  CandleIndicators,
  IndicatorPoint,
  MacdPoint,
  SignalBias,
  SignalSummary
} from '@shared/market';

function round(value: number | null, digits = 4) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
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
): MacdPoint[] {
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
): BollingerPoint[] {
  const padded = padSeries(candles.length, values);

  return candles.map((candle, index) => {
    const point = padded[index];
    return {
      time: candle.time,
      upper: round(point?.upper ?? null),
      middle: round(point?.middle ?? null),
      lower: round(point?.lower ?? null)
    };
  });
}

function getLastValue(series: IndicatorPoint[]) {
  return [...series].reverse().find((point) => point.value !== null)?.value ?? null;
}

function getLastMacd(series: MacdPoint[]) {
  return [...series]
    .reverse()
    .find((point) => point.macd !== null || point.signal !== null || point.histogram !== null);
}

function getLastBollinger(series: BollingerPoint[]) {
  return [...series]
    .reverse()
    .find((point) => point.upper !== null || point.middle !== null || point.lower !== null);
}

function mapBias(score: number): SignalBias {
  if (score >= 4) {
    return 'strong_bullish';
  }

  if (score >= 2) {
    return 'bullish';
  }

  if (score <= -4) {
    return 'strong_bearish';
  }

  if (score <= -2) {
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

export function calculateIndicators(candles: Candle[]): CandleIndicators {
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
    )
  };
}

export function trimIndicators(indicators: CandleIndicators, size: number): CandleIndicators {
  return {
    ema20: indicators.ema20.slice(-size),
    ema50: indicators.ema50.slice(-size),
    ema200: indicators.ema200.slice(-size),
    rsi14: indicators.rsi14.slice(-size),
    macd: indicators.macd.slice(-size),
    bollinger: indicators.bollinger.slice(-size),
    atr14: indicators.atr14.slice(-size)
  };
}

export function buildSignalSummary(candles: Candle[], indicators: CandleIndicators): SignalSummary {
  const latestCandle = candles.at(-1);
  const ema20 = getLastValue(indicators.ema20);
  const ema50 = getLastValue(indicators.ema50);
  const ema200 = getLastValue(indicators.ema200);
  const rsi = getLastValue(indicators.rsi14);
  const atr = getLastValue(indicators.atr14);
  const macd = getLastMacd(indicators.macd);
  const band = getLastBollinger(indicators.bollinger);

  if (!latestCandle) {
    return {
      bias: 'neutral',
      label: 'Neutral',
      confidence: 'low',
      bullets: ['No market data available.'],
      metrics: {
        emaTrend: 'mixed',
        rsiState: 'neutral',
        macdState: 'flat',
        volatilityState: 'normal'
      }
    };
  }

  let score = 0;

  if (ema20 !== null && ema50 !== null && ema200 !== null) {
    if (latestCandle.close > ema20 && ema20 > ema50 && ema50 > ema200) {
      score += 3;
    } else if (latestCandle.close < ema20 && ema20 < ema50 && ema50 < ema200) {
      score -= 3;
    } else if (latestCandle.close > ema20) {
      score += 1;
    } else {
      score -= 1;
    }
  }

  let rsiState: SignalSummary['metrics']['rsiState'] = 'neutral';
  if (rsi !== null) {
    if (rsi >= 70) {
      score -= 1;
      rsiState = 'overbought';
    } else if (rsi <= 30) {
      score += 1;
      rsiState = 'oversold';
    } else if (rsi >= 55) {
      score += 1;
      rsiState = 'bullish';
    }
  }

  let macdState: SignalSummary['metrics']['macdState'] = 'flat';
  if (macd && macd.macd !== null && macd.signal !== null) {
    if (macd.macd > macd.signal && (macd.histogram ?? 0) >= 0) {
      score += 2;
      macdState = 'bullish';
    } else if (macd.macd < macd.signal && (macd.histogram ?? 0) <= 0) {
      score -= 2;
      macdState = 'bearish';
    }
  }

  if (band) {
    if (band.upper !== null && latestCandle.close > band.upper) {
      score -= 1;
    }

    if (band.lower !== null && latestCandle.close < band.lower) {
      score += 1;
    }
  }

  const emaTrend =
    ema20 !== null && ema50 !== null && ema200 !== null
      ? ema20 > ema50 && ema50 > ema200
        ? 'bullish'
        : ema20 < ema50 && ema50 < ema200
          ? 'bearish'
          : 'mixed'
      : 'mixed';

  const volatilityRatio = atr && latestCandle.close ? atr / latestCandle.close : 0;
  const volatilityState =
    volatilityRatio > 0.035 ? 'elevated' : volatilityRatio < 0.015 ? 'calm' : 'normal';

  const bias = mapBias(score);
  const confidence = Math.abs(score) >= 4 ? 'high' : Math.abs(score) >= 2 ? 'medium' : 'low';

  return {
    bias,
    label: toLabel(bias),
    confidence,
    bullets: [
      emaTrend === 'bullish'
        ? 'Price structure is stacked above the EMA trend cluster.'
        : emaTrend === 'bearish'
          ? 'Price structure remains below the EMA trend cluster.'
          : 'EMA alignment is mixed, so trend conviction is limited.',
      rsi !== null
        ? `RSI14 is ${rsi.toFixed(1)}, signaling ${rsiState.replace('_', ' ')} momentum.`
        : 'RSI14 has insufficient history for a reliable read.',
      macd?.histogram !== null && macd?.histogram !== undefined
        ? `MACD histogram is ${macd.histogram.toFixed(2)}, keeping momentum ${macdState}.`
        : 'MACD needs more history before momentum can be classified.',
      atr !== null
        ? `ATR14 is ${atr.toFixed(2)}, which implies ${volatilityState} volatility.`
        : 'ATR14 is not available yet.'
    ],
    metrics: {
      emaTrend,
      rsiState,
      macdState,
      volatilityState
    }
  };
}
