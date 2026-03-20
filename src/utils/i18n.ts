import { computed, ref } from 'vue';
import type { AnchorContext, SignalSummary } from '@shared/market';

export type AppLocale = 'ko' | 'en';

const STORAGE_KEY = 'quant-atelier-locale';

const messages: Record<AppLocale, Record<string, string>> = {
  ko: {
    'lang.ko': 'KR',
    'lang.en': 'EN',
    'provider.live': 'Twelve Data 실시간',
    'provider.mock': '모의 데이터',
    'market.awaiting': '데이터 대기 중',
    'market.open': '장 운영 중',
    'market.always': '24시간 시장',
    'market.closed': '장 마감',
    'side.chart': '차트',
    'side.indicators': '지표',
    'side.alerts': '알림',
    'side.objects': '오브젝트',
    'side.layers': '레이어',
    'side.help': '도움말',
    'side.logs': '로그',
    'state.loading.label': '시스템 로딩',
    'state.error.label': '시스템 오류',
    'state.empty.label': 'Chart Meister',
    'state.retry': '다시 시도',
    'state.loadDemo': '데모 심볼 불러오기',
    'search.placeholder': '심볼 검색: AAPL, NVDA, BTCUSD',
    'search.noResults': '일치하는 심볼이 없습니다.',
    'search.genericError': '검색 결과를 불러오지 못했습니다.',
    'quote.versusPreviousClose': '전일 종가 대비',
    'controls.range': '기간',
    'controls.interval': '인터벌',
    'controls.mode': '모드',
    'controls.session': '세션',
    'controls.benchmark': '벤치마크',
    'controls.openingRange': '오프닝 레인지',
    'controls.anchor': '앵커',
    'controls.off': '끔',
    'controls.modeValue.intraday': '인트라데이',
    'controls.modeValue.swing': '스윙',
    'controls.sessionValue.regular': '정규장',
    'controls.sessionValue.extended': '시간외 포함',
    'controls.anchorType.manual': '수동',
    'controls.anchorType.gap': '갭',
    'controls.anchorType.breakout': '돌파',
    'controls.anchorType.swing_high': '스윙 고점',
    'controls.anchorType.swing_low': '스윙 저점',
    'controls.anchorHint.pick': '차트에서 앵커 시점을 선택하세요.',
    'controls.anchorHint.repick': '수동 앵커를 다시 찍으려면 차트를 클릭하세요.',
    'execution.title': '실행 레이어',
    'execution.provider': '공급자',
    'execution.cache': '캐시',
    'execution.cache.hit': '적중',
    'execution.cache.fresh': '신규 조회',
    'execution.apiStatus': 'API 상태',
    'execution.lastSync': '마지막 동기화',
    'execution.validated': 'zod 검증',
    'summary.title': '시그널 요약',
    'summary.confidence': '신뢰도',
    'summary.bias.strong_bullish': '강한 상승',
    'summary.bias.bullish': '상승',
    'summary.bias.neutral': '중립',
    'summary.bias.bearish': '하락',
    'summary.bias.strong_bearish': '강한 하락',
    'summary.confidence.low': '낮음',
    'summary.confidence.medium': '보통',
    'summary.confidence.high': '높음',
    'summary.score.bullish': '상승 점수',
    'summary.score.bearish': '하락 점수',
    'summary.score.neutral': '중립 점수',
    'summary.score.coverage': '커버리지',
    'summary.category.trend': '추세',
    'summary.category.trendStrength': '추세 강도',
    'summary.category.momentum': '모멘텀',
    'summary.category.volatility': '변동성',
    'summary.category.participation': '참여도',
    'summary.category.relative': '상대강도',
    'summary.category.structure': '구조',
    'summary.category.session': '세션',
    'summary.categoryStatus.bullish': '상승',
    'summary.categoryStatus.bearish': '하락',
    'summary.categoryStatus.neutral': '중립',
    'summary.categoryStatus.not_applicable': '해당 없음',
    'summary.categoryStatus.unavailable': '계산 불가',
    'summary.metric.emaTrend.bullish': '상승 추세',
    'summary.metric.emaTrend.bearish': '하락 추세',
    'summary.metric.emaTrend.mixed': '혼합 추세',
    'summary.metric.rsiState.oversold': '과매도 RSI',
    'summary.metric.rsiState.neutral': '중립 RSI',
    'summary.metric.rsiState.bullish': '상승 RSI',
    'summary.metric.rsiState.overbought': '과매수 RSI',
    'summary.metric.macdState.bullish': '상승 MACD',
    'summary.metric.macdState.bearish': '하락 MACD',
    'summary.metric.macdState.flat': '중립 MACD',
    'summary.metric.volatilityState.calm': '낮은 변동성',
    'summary.metric.volatilityState.normal': '보통 변동성',
    'summary.metric.volatilityState.elevated': '높은 변동성',
    'summary.bullet.emaTrend.bullish': '가격이 EMA 추세 클러스터 위에서 정렬되어 있습니다.',
    'summary.bullet.emaTrend.bearish': '가격이 EMA 추세 클러스터 아래에 머물고 있습니다.',
    'summary.bullet.emaTrend.mixed': 'EMA 정렬이 혼재되어 있어 추세 확신이 약합니다.',
    'summary.bullet.rsiState.oversold': 'RSI14가 과매도 구간에 있습니다.',
    'summary.bullet.rsiState.neutral': 'RSI14가 중립 구간에서 움직이고 있습니다.',
    'summary.bullet.rsiState.bullish': 'RSI14가 상승 모멘텀을 유지하고 있습니다.',
    'summary.bullet.rsiState.overbought': 'RSI14가 과매수 구간에 있습니다.',
    'summary.bullet.macdState.bullish': 'MACD가 상승 모멘텀을 가리키고 있습니다.',
    'summary.bullet.macdState.bearish': 'MACD가 하락 모멘텀을 가리키고 있습니다.',
    'summary.bullet.macdState.flat': 'MACD 방향성이 뚜렷하지 않습니다.',
    'summary.bullet.volatilityState.calm': '변동성은 낮은 편입니다.',
    'summary.bullet.volatilityState.normal': '변동성은 정상 범위입니다.',
    'summary.bullet.volatilityState.elevated': '변동성이 높아진 상태입니다.',
    'indicator.title': '표시 레이어',
    'indicator.group.overlay': '가격 오버레이',
    'indicator.group.lower': '하단 패널',
    'indicator.overlayControl': '오버레이 표시',
    'indicator.ema20': 'EMA 20',
    'indicator.ema50': 'EMA 50',
    'indicator.ema200': 'EMA 200',
    'indicator.bollinger': '볼린저 밴드',
    'indicator.volume': '거래량',
    'indicator.rsi': 'RSI 14',
    'indicator.macd': 'MACD',
    'indicator.atr': 'ATR 14',
    'indicator.vwap': 'VWAP',
    'indicator.anchoredVwap': '앵커 VWAP',
    'indicator.pdhPdl': '전일 고가 / 저가',
    'indicator.openingRange': '오프닝 레인지',
    'indicator.rvol': 'RVOL',
    'indicator.adxDmi': 'ADX / DMI',
    'indicator.relativeStrength': '상대강도 라인',
    'chart.legend.close': '종가',
    'chart.legend.bbMid': 'BB 중심',
    'chart.legend.vwap': 'VWAP',
    'chart.legend.avwap': 'AVWAP',
    'chart.panel.volume': '거래량',
    'chart.panel.rsi': 'RSI 14',
    'chart.panel.macd': 'MACD',
    'chart.panel.atr': 'ATR 14',
    'chart.panel.adxDmi': 'ADX / DMI',
    'chart.panel.rvol': 'RVOL',
    'chart.panel.rvolTod': 'RVOL-TOD',
    'chart.panel.rvolUnavailable': 'RVOL 사용 불가',
    'chart.panel.relativeStrength': '상대강도 라인',
    'chart.panel.infoLabel': '{label} 설명',
    'chart.panel.info.volume': '거래량은 각 캔들에서 체결된 수량을 보여주며, 현재 가격 움직임에 얼마나 많은 참여가 붙었는지 확인할 때 봅니다.',
    'chart.panel.info.rsi': 'RSI는 최근 14개 캔들의 상승 강도와 하락 강도를 0에서 100 사이로 압축한 모멘텀 지표입니다. 보통 70 이상은 과매수, 30 이하는 과매도로 해석합니다.',
    'chart.panel.info.macd': 'MACD는 단기와 장기 EMA의 차이로 추세 변화와 모멘텀을 봅니다. 히스토그램은 MACD와 시그널 라인의 간격을 보여줍니다.',
    'chart.panel.info.atr': 'ATR은 최근 14개 구간의 평균 실제 변동폭입니다. 방향보다는 현재 변동성의 크기를 읽는 데 사용합니다.',
    'chart.panel.info.adxDmi': 'ADX와 +DI/-DI로 추세의 강도와 방향 우위를 함께 읽습니다.',
    'chart.panel.info.rvol': '현재 거래량이 평소 대비 얼마나 강한지 보여줍니다.',
    'chart.panel.info.relativeStrength': '벤치마크 대비 종목의 상대 강도를 추적합니다.',
    'quote.card.volume': '거래량',
    'quote.card.updated': '업데이트',
    'quote.card.dayHigh': '당일 고가',
    'quote.card.dayLow': '당일 저가',
    'quote.note.latestPrint': '최신 체결',
    'quote.note.intradayResistance': '당일 저항',
    'quote.note.intradaySupport': '당일 지지',
    'dashboard.loading.title': '시장 구조를 불러오는 중입니다.',
    'dashboard.loading.description': '서버 프록시가 시세와 캔들 데이터를 정규화하고 지표를 계산하는 중입니다.',
    'dashboard.error.title': '심볼을 찾을 수 없습니다.',
    'dashboard.empty.title': '분석을 시작할 준비가 되었습니다.',
    'dashboard.empty.description': '심볼을 검색하면 정규화된 시세, 기술 지표, 동기화된 멀티 패널 차트를 불러옵니다.',
    'context.title': '분석 컨텍스트',
    'context.session': '세션',
    'context.timezone': '시간대',
    'context.earlyClose': '조기 종료',
    'context.anchor': '앵커',
    'context.relative': '상대강도',
    'context.openingRange': '오프닝 레인지',
    'context.relative.notApplicable': '해당 없음',
    'context.relative.benchmarkUnavailable': '벤치마크 불가',
    'context.status.ready': '준비됨',
    'context.status.unavailable': '사용 불가',
    'context.status.not_applicable': '해당 없음',
    'context.status.restricted': '제한됨',
    'context.anchorPending': '선택 대기',
    'context.anchorWithTime': '{type} · {time}',
    'common.yes': '예',
    'common.no': '아니오',
    'common.apiStatus.ok': '정상',
    'common.apiStatus.degraded': '저하',
    'error.symbolNotFound': '요청한 심볼을 찾을 수 없습니다.',
    'error.network': '서버에 연결하지 못했습니다.',
    'error.unknown': '알 수 없는 오류가 발생했습니다.'
  },
  en: {
    'lang.ko': 'KR',
    'lang.en': 'EN',
    'provider.live': 'Twelve Data Live',
    'provider.mock': 'Mock Provider',
    'market.awaiting': 'Awaiting feed',
    'market.open': 'Market Open',
    'market.always': 'Always On',
    'market.closed': 'Market Closed',
    'side.chart': 'Chart',
    'side.indicators': 'Indicators',
    'side.alerts': 'Alerts',
    'side.objects': 'Objects',
    'side.layers': 'Layers',
    'side.help': 'Help',
    'side.logs': 'Logs',
    'state.loading.label': 'System Loading',
    'state.error.label': 'System Error',
    'state.empty.label': 'Chart Meister',
    'state.retry': 'Retry Request',
    'state.loadDemo': 'Load Demo Symbol',
    'search.placeholder': 'Search symbols: AAPL, NVDA, BTCUSD',
    'search.noResults': 'No matching symbols.',
    'search.genericError': 'Unable to load search results.',
    'quote.versusPreviousClose': 'versus previous close',
    'controls.range': 'Range',
    'controls.interval': 'Interval',
    'controls.mode': 'Mode',
    'controls.session': 'Session',
    'controls.benchmark': 'Benchmark',
    'controls.openingRange': 'Opening Range',
    'controls.anchor': 'Anchor',
    'controls.off': 'Off',
    'controls.modeValue.intraday': 'Intraday',
    'controls.modeValue.swing': 'Swing',
    'controls.sessionValue.regular': 'Regular',
    'controls.sessionValue.extended': 'Extended',
    'controls.anchorType.manual': 'Manual',
    'controls.anchorType.gap': 'Gap',
    'controls.anchorType.breakout': 'Breakout',
    'controls.anchorType.swing_high': 'Swing High',
    'controls.anchorType.swing_low': 'Swing Low',
    'controls.anchorHint.pick': 'Pick an anchor point on the chart.',
    'controls.anchorHint.repick': 'Click the chart to place a new manual anchor.',
    'execution.title': 'Execution Layer',
    'execution.provider': 'Provider',
    'execution.cache': 'Cache',
    'execution.cache.hit': 'Hit',
    'execution.cache.fresh': 'Fresh',
    'execution.apiStatus': 'API status',
    'execution.lastSync': 'Last sync',
    'execution.validated': 'zod validated',
    'summary.title': 'Signal Summary',
    'summary.confidence': 'Confidence',
    'summary.bias.strong_bullish': 'Strong Bullish',
    'summary.bias.bullish': 'Bullish',
    'summary.bias.neutral': 'Neutral',
    'summary.bias.bearish': 'Bearish',
    'summary.bias.strong_bearish': 'Strong Bearish',
    'summary.confidence.low': 'Low',
    'summary.confidence.medium': 'Medium',
    'summary.confidence.high': 'High',
    'summary.score.bullish': 'Bullish',
    'summary.score.bearish': 'Bearish',
    'summary.score.neutral': 'Neutral',
    'summary.score.coverage': 'Coverage',
    'summary.category.trend': 'Trend',
    'summary.category.trendStrength': 'Trend Strength',
    'summary.category.momentum': 'Momentum',
    'summary.category.volatility': 'Volatility',
    'summary.category.participation': 'Participation',
    'summary.category.relative': 'Relative',
    'summary.category.structure': 'Structure',
    'summary.category.session': 'Session',
    'summary.categoryStatus.bullish': 'Bullish',
    'summary.categoryStatus.bearish': 'Bearish',
    'summary.categoryStatus.neutral': 'Neutral',
    'summary.categoryStatus.not_applicable': 'Not applicable',
    'summary.categoryStatus.unavailable': 'Unavailable',
    'summary.metric.emaTrend.bullish': 'bullish trend',
    'summary.metric.emaTrend.bearish': 'bearish trend',
    'summary.metric.emaTrend.mixed': 'mixed trend',
    'summary.metric.rsiState.oversold': 'oversold RSI',
    'summary.metric.rsiState.neutral': 'neutral RSI',
    'summary.metric.rsiState.bullish': 'bullish RSI',
    'summary.metric.rsiState.overbought': 'overbought RSI',
    'summary.metric.macdState.bullish': 'bullish MACD',
    'summary.metric.macdState.bearish': 'bearish MACD',
    'summary.metric.macdState.flat': 'flat MACD',
    'summary.metric.volatilityState.calm': 'calm volatility',
    'summary.metric.volatilityState.normal': 'normal volatility',
    'summary.metric.volatilityState.elevated': 'elevated volatility',
    'summary.bullet.emaTrend.bullish': 'Price is stacked above the EMA trend cluster.',
    'summary.bullet.emaTrend.bearish': 'Price remains below the EMA trend cluster.',
    'summary.bullet.emaTrend.mixed': 'EMA alignment is mixed and trend conviction is limited.',
    'summary.bullet.rsiState.oversold': 'RSI14 is in oversold territory.',
    'summary.bullet.rsiState.neutral': 'RSI14 is trading in neutral territory.',
    'summary.bullet.rsiState.bullish': 'RSI14 is holding bullish momentum.',
    'summary.bullet.rsiState.overbought': 'RSI14 is in overbought territory.',
    'summary.bullet.macdState.bullish': 'MACD is pointing to bullish momentum.',
    'summary.bullet.macdState.bearish': 'MACD is pointing to bearish momentum.',
    'summary.bullet.macdState.flat': 'MACD momentum is flat.',
    'summary.bullet.volatilityState.calm': 'Volatility remains calm.',
    'summary.bullet.volatilityState.normal': 'Volatility is in a normal range.',
    'summary.bullet.volatilityState.elevated': 'Volatility is elevated.',
    'indicator.title': 'Visible Layers',
    'indicator.group.overlay': 'Price Overlay',
    'indicator.group.lower': 'Lower Panes',
    'indicator.overlayControl': 'Overlay control',
    'indicator.ema20': 'EMA 20',
    'indicator.ema50': 'EMA 50',
    'indicator.ema200': 'EMA 200',
    'indicator.bollinger': 'Bollinger Bands',
    'indicator.volume': 'Volume',
    'indicator.rsi': 'RSI 14',
    'indicator.macd': 'MACD',
    'indicator.atr': 'ATR 14',
    'indicator.vwap': 'VWAP',
    'indicator.anchoredVwap': 'Anchored VWAP',
    'indicator.pdhPdl': 'PDH / PDL',
    'indicator.openingRange': 'Opening Range',
    'indicator.rvol': 'RVOL',
    'indicator.adxDmi': 'ADX / DMI',
    'indicator.relativeStrength': 'RS Line',
    'chart.legend.close': 'Close',
    'chart.legend.bbMid': 'BB Mid',
    'chart.legend.vwap': 'VWAP',
    'chart.legend.avwap': 'AVWAP',
    'chart.panel.volume': 'Volume',
    'chart.panel.rsi': 'RSI 14',
    'chart.panel.macd': 'MACD',
    'chart.panel.atr': 'ATR 14',
    'chart.panel.adxDmi': 'ADX / DMI',
    'chart.panel.rvol': 'RVOL',
    'chart.panel.rvolTod': 'RVOL-TOD',
    'chart.panel.rvolUnavailable': 'RVOL unavailable',
    'chart.panel.relativeStrength': 'RS Line',
    'chart.panel.infoLabel': 'About {label}',
    'chart.panel.info.volume': 'Volume shows how much traded during each candle and helps judge how much participation is behind the current price move.',
    'chart.panel.info.rsi': 'RSI compresses the last 14 candles of buying and selling strength into a 0 to 100 momentum oscillator. Readings above 70 are commonly treated as overbought and below 30 as oversold.',
    'chart.panel.info.macd': 'MACD compares short and long EMAs to track momentum and trend shifts. The histogram shows the gap between the MACD line and the signal line.',
    'chart.panel.info.atr': 'ATR measures the average true range over the last 14 periods. It is used to read volatility size rather than direction.',
    'chart.panel.info.adxDmi': 'ADX with +DI/-DI shows trend strength and directional dominance together.',
    'chart.panel.info.rvol': 'Shows how unusual current participation is relative to normal volume.',
    'chart.panel.info.relativeStrength': 'Tracks symbol strength versus the selected benchmark.',
    'quote.card.volume': 'Volume',
    'quote.card.updated': 'Updated',
    'quote.card.dayHigh': 'Day High',
    'quote.card.dayLow': 'Day Low',
    'quote.note.latestPrint': 'Latest print',
    'quote.note.intradayResistance': 'Intraday resistance',
    'quote.note.intradaySupport': 'Intraday support',
    'dashboard.loading.title': 'Streaming market structure.',
    'dashboard.loading.description': 'The server proxy is normalizing quote and candle data and preparing technical overlays.',
    'dashboard.error.title': 'Symbol could not be resolved.',
    'dashboard.empty.title': 'Ready for deep analysis.',
    'dashboard.empty.description': 'Search a symbol to load normalized quote data, technical overlays, and a synchronized multi-panel chart workspace.',
    'context.title': 'Analysis Context',
    'context.session': 'Session',
    'context.timezone': 'Timezone',
    'context.earlyClose': 'Early Close',
    'context.anchor': 'Anchor',
    'context.relative': 'Relative',
    'context.openingRange': 'Opening Range',
    'context.relative.notApplicable': 'Not applicable',
    'context.relative.benchmarkUnavailable': 'Benchmark unavailable',
    'context.status.ready': 'Ready',
    'context.status.unavailable': 'Unavailable',
    'context.status.not_applicable': 'Not applicable',
    'context.status.restricted': 'Restricted',
    'context.anchorPending': 'Pending',
    'context.anchorWithTime': '{type} · {time}',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.apiStatus.ok': 'OK',
    'common.apiStatus.degraded': 'Degraded',
    'error.symbolNotFound': 'The requested symbol could not be found.',
    'error.network': 'Unable to reach the server.',
    'error.unknown': 'An unknown error occurred.'
  }
};

const savedLocale =
  typeof window !== 'undefined' ? (window.localStorage.getItem(STORAGE_KEY) as AppLocale | null) : null;
const localeRef = ref<AppLocale>(savedLocale === 'en' || savedLocale === 'ko' ? savedLocale : 'ko');

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) {
    return template;
  }

  return Object.entries(params).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function setLocale(locale: AppLocale) {
  localeRef.value = locale;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, locale);
  }
}

export function t(key: string, params?: Record<string, string | number>) {
  const message = messages[localeRef.value][key] ?? messages.en[key] ?? key;
  return interpolate(message, params);
}

export function useI18n() {
  return {
    locale: computed({
      get: () => localeRef.value,
      set: (value: AppLocale) => setLocale(value)
    }),
    dateLocale: computed(() => (localeRef.value === 'ko' ? 'ko-KR' : 'en-US')),
    t
  };
}

export function translateErrorMessage(message: string | null) {
  if (!message) {
    return '';
  }

  if (/not found/i.test(message) || /could not be resolved/i.test(message)) {
    return t('error.symbolNotFound');
  }

  if (/failed to fetch/i.test(message) || /unable to reach/i.test(message)) {
    return t('error.network');
  }

  if (/unknown/i.test(message)) {
    return t('error.unknown');
  }

  return message;
}

export function localizeSignalSummary(summary: SignalSummary) {
  return {
    label: t(`summary.bias.${summary.bias}`),
    confidence: t(`summary.confidence.${summary.confidence}`),
    metricChips: [],
    bullets: summary.bullets
  };
}

export function localizeSignalCategory(key: string) {
  return t(`summary.category.${key}`);
}

export function localizeSignalCategoryStatus(status: string) {
  return t(`summary.categoryStatus.${status}`);
}

export function localizeAnalysisStatus(status: string) {
  return t(`context.status.${status}`);
}

export function localizeSessionType(sessionType: string) {
  return t(`controls.sessionValue.${sessionType}`);
}

export function localizeAnchorType(anchorType: string) {
  return t(`controls.anchorType.${anchorType}`);
}

export function localizeAnchorContext(anchor: AnchorContext, formatTime: (time: number) => string) {
  const typeLabel = localizeAnchorType(anchor.anchorType);

  if (anchor.anchorTime === null) {
    return anchor.anchorType === 'manual'
      ? `${typeLabel} (${t('context.anchorPending')})`
      : `${typeLabel} (${t('context.status.unavailable')})`;
  }

  return t('context.anchorWithTime', { type: typeLabel, time: formatTime(anchor.anchorTime) });
}

export function localizeApiStatus(status: string) {
  return t(`common.apiStatus.${status}`);
}
