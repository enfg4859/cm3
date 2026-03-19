# Chart Meister MVP

Vue 3 + Vite + Pinia + Vuetify 프론트엔드와 Nitro API 계층을 기반으로 한 주식 기술적 분석 MVP다. 시장 데이터는 정규화된 내부 계약으로 처리하며 `mock` / `twelvedata` 공급자를 교체 가능하게 유지한다.

## 폴더 구조

```text
.
├─ AGENTS.md                     # 에이전트용 저장소 운영 규칙
├─ design/                       # 참고용 디자인 자산
├─ docs/                         # 명세, ADR, 변경 이력, 작업 기록
├─ prompts/                      # 재사용 가능한 작업 프롬프트 템플릿
├─ shared/                       # 정규화된 Candle/Quote 타입과 zod 스키마
├─ server/
│  ├─ routes/api/                # /api/health, /api/search, /api/quote, /api/candles
│  ├─ providers/                 # 공급자 인터페이스 + mock + twelvedata
│  └─ utils/                     # 캐시, 지표 계산, 공급자 선택
├─ src/
│  ├─ components/                # 검색, 상태 UI, 차트, 요약, 토글
│  ├─ plugins/                   # Vuetify 설정
│  ├─ stores/                    # Pinia 상태 관리
│  ├─ styles/                    # 전역 테마
│  └─ utils/                     # 클라이언트 포맷팅 및 fetch 헬퍼
└─ tests/                        # vitest 및 playwright 테스트
```

## 핵심 설계

- 프론트엔드, 서버 프록시, 공급자 인터페이스를 `src`, `server/routes/api`, `server/providers`로 분리했다.
- 프론트엔드는 `/api/*`만 호출하며, Twelve Data 키는 서버에만 둔다.
- `shared/market.ts`는 모든 계층이 공유하는 내부 `Quote`, `Candle` 타입을 정의한다.
- `technicalindicators`로 EMA20/50/200, RSI14, MACD(12,26,9), Bollinger Bands(20,2), ATR14를 서버에서 계산한다.
- 앱은 `MARKET_DATA_PROVIDER=twelvedata`를 명시적으로 설정하지 않으면 `mock`으로 유지된다.
- Nitro 응답은 `API_CACHE_TTL_MS` 기준 메모리 캐시를 사용한다.

## 주요 기능

- 심볼 검색
- 가격 히어로 및 요약 카드
- Lightweight Charts 기반 캔들 차트
- 거래량, RSI, MACD, ATR 보조 패널
- EMA20/50/200 및 Bollinger Bands 오버레이
- 지표 on/off 토글
- 기간 제어: `1D/5D/1M/3M/6M/1Y`
- 인터벌 제어: `1min/5min/15min/1h/1day`
- 시그널 요약 카드
- 빈 상태, 로딩 상태, 에러 상태

## 환경 변수

`.env.example`을 복사해 `.env`를 만든다.

```bash
MARKET_DATA_PROVIDER=mock
TWELVEDATA_API_KEY=
API_CACHE_TTL_MS=60000
```

공급자 선택 규칙:

- `mock`: 항상 사용 가능
- `twelvedata`: `MARKET_DATA_PROVIDER=twelvedata`와 `TWELVEDATA_API_KEY`가 모두 있을 때만 사용

## API

- `GET /api/health`
- `GET /api/search?q=AAPL`
- `GET /api/quote?symbol=AAPL`
- `GET /api/candles?symbol=AAPL&range=3M&interval=1day`

## 실행

1. 의존성 설치

```bash
npm install
```

2. 프론트엔드와 Nitro 서버 실행

```bash
npm run dev
```

실데이터를 사용할 때만 아래 명령으로 라이브 모드를 켠다.

```bash
npm run dev:live
```

3. `http://localhost:5173`에서 앱을 연다.

Vite는 `/api/*`를 `http://localhost:3000`의 Nitro로 프록시한다.

## 테스트

```bash
npm test
```

## E2E 테스트

Playwright 브라우저를 한 번 설치한다.

```bash
npx playwright install chromium
```

기본 브라우저 E2E 실행:

```bash
npm run test:e2e
```

`npm run test:e2e`는 Twelve Data 크레딧 소모를 막기 위해 항상 `mock` 기준으로 동작한다.

실데이터 스모크 테스트는 정말 필요할 때만 수동으로 실행한다.

```bash
npm run test:e2e:live
```

라이브 스모크 테스트는 기본 심볼의 초기 대시보드 로드만 검증해 불필요한 외부 호출을 최소화한다.

## 검증 체크리스트

- `npm run dev`가 Vite와 Nitro를 함께 실행한다.
- `/api/health`가 `status: "ok"`를 반환한다.
- 검색이 `AAPL`, `NVDA`, `BTCUSD` 결과를 반환한다.
- `TWELVEDATA_API_KEY`가 없어도 앱이 `mock`으로 동작한다.
- 지표 토글이 오버레이와 보조 패널 표시를 제어한다.
- 기간 및 인터벌 변경 시 `/api/candles`가 다시 호출된다.
- `INVALID_SYM` 같은 잘못된 심볼에서 에러 UI가 표시된다.
- `npm test`가 스키마, 공급자, 지표 파이프라인 테스트를 통과한다.
- `npm run test:e2e`가 대시보드 로드, 언어 전환, 검색, 에러, 기간/인터벌 시나리오를 통과한다.
- `npm run test:e2e:live`는 유효한 `TWELVEDATA_API_KEY`가 있을 때만 실행한다.

## 저장소 운영 문서

- `AGENTS.md`: 에이전트용 저장소 운영 규칙
- `prompts/codex-task-template.md`: 재사용 가능한 작업 프롬프트 뼈대
- `docs/specs/current/*`: 현재 기대 동작과 수용 기준
- `docs/decisions/*`: 구조 결정과 트레이드오프 기록
- `docs/changelog/*`: 의미 있는 코드 또는 운영 변경 기록
- `docs/worklog/*`: 세션 인수인계를 위한 선택 메모
