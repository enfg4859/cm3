# 기능: 실전형 기술분석 대시보드 P1

## 배경
사용자는 단일 화면에서 종목 검색, 가격 요약, 캔들 차트, 세션 기준 가격, 상대강도, 참여도, 추세 강도를 함께 확인할 수 있어야 한다.
지표 계산과 세션 판정은 서버에서 수행해야 하며, 공급자 API 키는 계속 프론트엔드에 노출되면 안 된다.

## 목표
- 종목 검색부터 차트 확인까지 한 화면에서 수행한다.
- 내부 표준 `Quote` / `Candle` / `InstrumentMeta` 타입으로 데이터를 정규화한다.
- 지표 계산과 세션 판정은 서버에서 수행하고 프론트는 `/api/*`만 호출한다.
- `mock`과 `twelvedata` 공급자를 교체 가능하게 유지한다.
- 기본 세션은 거래소 시간대와 거래 캘린더 기준으로 계산한다.

## 비목표
- 주문 실행, 브로커 연동
- 사용자 인증, 권한 관리
- 포트폴리오 저장 및 동기화
- DB 영속화
- 백테스트 엔진
- 조건 알림 자동 발송
- `Volume Profile` 시각화 (`P2`)

## 현재 상태
- 기본 대시보드는 `AAPL` 기준 `swing` 모드로 로드된다.
- `mock` 공급자는 항상 사용 가능하고, `twelvedata`는 서버 환경 변수로만 활성화된다.
- `/api/health`, `/api/search`, `/api/quote`, `/api/candles`가 프론트와 공급자 사이의 계약 경계를 이룬다.
- 메인 캔들 차트와 거래량, RSI14, MACD, ATR14, ADX/DMI, RVOL, RS Line 보조 패널을 제공한다.
- EMA20/50/200, Bollinger Bands, VWAP, Anchored VWAP, PDH/PDL, Opening Range 오버레이를 표시하거나 숨길 수 있다.
- `Signal Summary`는 bullish/bearish/neutral 점수와 coverage factor 기반으로 계산된다.
- `Signal Summary`는 점수 위에 상위 기여 카테고리 기준 설명 문구를 3개 이하로 노출하고, 각 문구에는 가중치와 주 기여 방향을 함께 표시한다.
- 각 지표와 시그널 카테고리에는 클릭형 설명 아이콘이 있어 정의와 현재 해석 기준을 팝오버로 확인할 수 있다.
- 분석 컨트롤의 `mode`, `session`, `benchmark`, `opening range`, `anchor`에도 클릭형 설명 아이콘이 있어 현재 선택값과 계산 영향 범위를 확인할 수 있다.
- 분석 컨트롤의 `session`, `benchmark`, `opening range`, `anchor`는 기본적으로 접힌 `고급 설정` 안에 배치되고, 현재 선택값은 요약 칩으로 먼저 보여준다.
- 우측 `표시 설정` 카드는 기본적으로 접힌 상태로 시작하고, 활성 오버레이/패널 개수는 요약 칩으로 먼저 보여준다.
- `Relative`는 US equities/ETF에서만 활성화되고, crypto/24h 자산은 `not_applicable` 처리된다.
- `Opening Range`는 서버 1분봉 기준으로 계산하고, `15min` 화면의 `OR 5m`는 제한한다.
- intraday `RVOL`은 `RVOL-TOD`, daily는 classic `RVOL`을 사용한다.
- `Anchored VWAP`의 preset anchor는 query range 기준으로 1회 결정되고 sticky하게 유지된다.

## 세션 규칙
- 세션은 `exchange timezone + trading calendar` 기준으로 계산한다.
- US equities 기본값은 `regular session only`다.
- extended hours 포함 여부는 별도 `session` 옵션으로 분리한다.
- `VWAP`, `Gap`, `PDH`, `PDL`, `Opening Range`는 같은 세션 정의를 공유한다.
- early close day는 거래 캘린더로 판정한다.
- `ADX 18` 컷은 표준 교과서 값이 아니라 제품 휴리스틱이다.

## 사용자 시나리오
- 사용자는 심볼을 검색하고 검색 결과에서 종목을 선택한다.
- 사용자는 `range`, `interval`, `mode`, `session`, `benchmark`, `OR minutes`, `anchor preset`을 바꾼다.
- 사용자는 분석 컨트롤 옆의 `i` 아이콘을 눌러 현재 모드, 세션, 오프닝 레인지, 앵커 설정이 어떤 계산에 영향을 주는지 확인한다.
- 사용자는 기본 접힘 상태의 `고급 설정`을 펼쳐 세션, 벤치마크, 오프닝 레인지, 앵커 상세 설정을 조정한다.
- 사용자는 기본 접힘 상태의 `표시 설정` 카드를 펼쳐 전체 표시 항목을 한 번에 조정한다.
- 사용자는 차트에서 manual anchor를 찍어 `Anchored VWAP` 기준점을 바꾼다.
- 사용자는 `EMA`, `Bollinger`, `VWAP`, `AVWAP`, `PDH/PDL`, `Opening Range`, `ADX/DMI`, `RVOL`, `RS Line` 표시를 켜고 끈다.
- 사용자는 각 지표와 시그널 옆의 `i` 아이콘을 눌러 무엇을 보는 지표인지와 현재 판정 근거를 확인한다.
- 사용자는 intraday에서 `RVOL-TOD`, swing에서 classic RVOL과 ATR 기반 변동성 판단을 확인한다.
- 사용자는 crypto/24h 자산에서 `Relative`가 비활성 또는 `not_applicable` 상태로 표시되는 것을 확인한다.

## 입력 / 출력
- 입력:
  - `symbol`
  - `range`
  - `interval`
  - `mode`
  - `session`
  - `benchmark`
  - `orMinutes`
  - `anchorType`
  - `anchorTime`
  - 지표 표시 상태
  - 언어 설정
- 출력:
  - 정규화된 시세 요약
  - 동기화된 캔들 및 보조 지표 차트
  - `analysisContext`
  - `Signal Summary`
  - 로딩, 에러, 빈 상태 UI

## API 계약
- `GET /api/health`
- `GET /api/search?q=AAPL`
- `GET /api/quote?symbol=AAPL`
- `GET /api/candles?symbol=AAPL&range=1D&interval=5min&mode=intraday&session=regular&benchmark=SPY&orMinutes=15&anchorType=gap`

`/api/candles` 응답은 아래를 포함해야 한다.
- `instrument`
- `candles`
- `indicators`
- `analysisContext`
- `signalSummary`
- `anchorTime`

## 예외 / 실패 케이스
- 존재하지 않는 심볼 검색 또는 조회 시 에러 상태를 표시한다.
- 네트워크 실패 시 프론트는 오류 메시지를 표시한다.
- `Opening Range`가 허용되지 않는 조합이면 `restricted` 상태를 반환한다.
- 1분봉 보조 조회가 불가능하면 OR는 `unavailable` 처리한다.
- benchmark 조회 실패 시 `analysisContext.relative.benchmarkUnavailable`를 반환한다.
- crypto/24h 자산은 `analysisContext.relative.relativeNotApplicable`를 반환한다.
- `TWELVEDATA_API_KEY`가 없거나 `MARKET_DATA_PROVIDER`가 `mock`이면 `mock`으로 동작한다.

## 수용 기준
- [ ] 프론트는 외부 공급자를 직접 호출하지 않는다.
- [ ] `/api/health`, `/api/search`, `/api/quote`, `/api/candles` 계약이 유지된다.
- [ ] 세션 정의는 거래소 시간대와 거래 캘린더 기준으로 계산된다.
- [ ] 지표와 세션 컨텍스트는 서버에서 계산되어 응답에 포함된다.
- [ ] intraday는 `RVOL-TOD`, daily는 classic RVOL을 사용한다.
- [ ] `Opening Range`는 서버 1분봉 기준으로 계산된다.
- [ ] `15min` 화면의 `OR 5m`는 제한된다.
- [ ] `Anchored VWAP` preset anchor는 sticky하게 유지된다.
- [ ] `Signal Summary`는 top1-top2 margin과 coverage factor를 사용한다.
- [ ] `Signal Summary`는 점수 위에 상위 기여 카테고리 설명 문구를 3개 이하로 노출하고, 가중치와 주 기여 방향을 함께 보여준다.
- [ ] `not_applicable / unavailable` 카테고리는 가중치 재정규화 대상이다.
- [ ] 지표 토글, 보조 패널, 시그널 요약에서 클릭형 설명 팝오버가 열린다.
- [ ] 분석 컨트롤의 `mode`, `session`, `benchmark`, `opening range`, `anchor`에서도 클릭형 설명 팝오버가 열린다.
- [ ] 분석 컨트롤의 고급 설정은 기본 접힘 상태이며, 현재 선택값 요약 칩을 보여준다.
- [ ] `표시 설정` 카드는 기본 접힘 상태이며, 활성 오버레이/패널 개수 요약 칩을 보여준다.
- [ ] crypto/24h 자산은 relative가 비활성 또는 `not_applicable` 처리된다.
- [ ] early close day 테스트가 있다.
- [ ] 한국어 기본 UI와 영어 전환이 동작한다.
- [ ] 기본 테스트는 외부 실데이터 호출 없이 실행 가능하다.

## 영향 범위
- UI: `src/App.vue`, `src/components/*`, `src/styles/main.css`
- API: `server/routes/api/*`
- 공급자: `server/providers/*`, `server/utils/provider.ts`
- 계산: `server/utils/indicators.ts`, `server/utils/session.ts`, `server/utils/analysis-config.ts`
- 공용 계약: `shared/*`
- 테스트: `tests/*`, `playwright.config.ts`
- 문서: `README.md`, `docs/specs/current/*`, `docs/changelog/*`
