# 바이브 코딩 실습 자료: 나만의 주식 PWA 만들기

## 1. 실습 개요

이 실습은 바이브 코딩 방식으로 **나만의 주식 포트폴리오 앱**을 만들고, Vercel에 배포한 뒤 아이폰 홈 화면에 앱처럼 설치하는 과정을 다룹니다.

완성 앱의 이름은 **MyStock Lab**입니다.

최종 결과물은 다음 기능을 가집니다.

- 미국 주식 회사명 검색
- 국내 주식 회사명 검색
- 실시간 또는 지연 시세 조회
- 조회 성공 종목만 포트폴리오 추가
- 보유 수량과 평균 매수가 입력
- 평가금액, 손익률, 총 손익 계산
- 1분마다 자동 가격 새로고침
- PWA 설치 지원
- Vercel 배포
- 아이폰 홈 화면에 앱처럼 추가

---

## 2. 최종 앱 구조

최종 앱은 다음 구조로 동작합니다.

```text
사용자 스마트폰 / 브라우저
→ React PWA
→ Vercel Serverless Function
→ 외부 주식 API
→ 앱 화면에 시세 표시
```

사용한 API는 다음과 같습니다.

| 시장 | API | 성격 |
|---|---|---|
| 미국 주식 | Finnhub | 실시간 quote |
| 국내 주식 | Yahoo Finance | 무료 지연 시세 |

국내 주식은 무료로 진짜 실시간 시세를 제공하는 안정적인 API를 찾기 어렵기 때문에, 수업용 앱에서는 **Yahoo Finance 무료 지연 시세**를 사용했습니다.

---

## 3. 실습에서 배울 내용

이 실습을 통해 학생들은 다음을 경험합니다.

1. 자연어 프롬프트로 앱 요구사항 정의하기
2. React + Vite 프로젝트 만들기
3. 서버리스 API 함수 만들기
4. 외부 API 키를 안전하게 숨기기
5. 회사명 검색 기능 만들기
6. API 조회 성공 여부에 따라 UI 제어하기
7. 포트폴리오 계산 로직 구현하기
8. localStorage로 데이터 저장하기
9. PWA 설정하기
10. GitHub에 올리기
11. Vercel에 배포하기
12. 아이폰 홈 화면에 앱 설치하기

---

## 4. 최종 파일 구조

현재 프로젝트의 핵심 파일 구조는 다음과 같습니다.

```text
바이브코딩/
├─ api/
│  ├─ quote.js
│  └─ search.js
├─ public/
│  ├─ sw.js
│  └─ icons/
│     ├─ icon-192.png
│     └─ icon-512.png
├─ src/
│  ├─ main.tsx
│  └─ styles.css
├─ .env.example
├─ .gitignore
├─ index.html
├─ manifest.webmanifest
├─ package.json
├─ package-lock.json
├─ tsconfig.json
└─ stock-pwa-workshop.md
```

각 파일의 역할은 다음과 같습니다.

| 파일 | 역할 |
|---|---|
| `src/main.tsx` | React 앱 전체 기능 |
| `src/styles.css` | 앱 디자인 |
| `api/search.js` | 회사명/종목명 검색 API |
| `api/quote.js` | 주식 시세 조회 API |
| `manifest.webmanifest` | PWA 앱 정보 |
| `public/sw.js` | 서비스워커 |
| `public/icons/` | 홈 화면 앱 아이콘 |
| `.env.example` | 필요한 환경변수 예시 |
| `package.json` | 실행/빌드 스크립트 |

---

## 5. 개발 환경 준비

### 5.1 Node.js 확인

터미널에서 다음 명령을 실행합니다.

```bash
node -v
npm -v
```

Windows PowerShell에서 `npm`이 실행 정책 때문에 막히면 `npm.cmd`를 사용합니다.

```bash
npm.cmd -v
```

---

## 6. 프로젝트 생성

### 6.1 기본 프롬프트

처음 AI에게 요청할 때는 아래처럼 말할 수 있습니다.

```text
React와 Vite를 사용해서 주식 포트폴리오 PWA를 만들어줘.
앱 이름은 MyStock Lab이야.
모바일에서 보기 좋은 디자인으로 만들고,
관심 종목을 추가하고 평가금액과 수익률을 계산할 수 있게 해줘.
나중에 Vercel에 배포하고 아이폰 홈 화면에 추가할 수 있도록 PWA 설정도 포함해줘.
```

### 6.2 프로젝트 의존성

이번 프로젝트에서는 다음 패키지를 사용했습니다.

```json
{
  "dependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "vite": "^7.0.0",
    "typescript": "^5.8.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.468.0"
  }
}
```

설치 명령:

```bash
npm.cmd install
```

실행 명령:

```bash
npm.cmd run dev -- --port 5173
```

로컬 접속 주소:

```text
http://127.0.0.1:5173/
```

---

## 7. 첫 번째 앱 요구사항 만들기

### 7.1 요구사항 프롬프트

다음 프롬프트를 사용하면 앱의 기본 구조를 만들 수 있습니다.

```text
주식 포트폴리오 앱을 만들어줘.

기능:
- 포트폴리오 대시보드
- 총 평가금액
- 총 손익
- 오늘의 강세 종목
- 종목 추가 탭
- API/PWA 설정 탭
- 보유 종목 카드 목록
- 보유 수량, 평균 매수가 입력
- 현재가, 평가금액, 손익률 계산
- localStorage 저장

디자인:
- 모바일 우선
- 금융 앱처럼 깔끔하고 읽기 쉽게
- 카드 반경은 8px 이하
- 버튼에는 lucide-react 아이콘 사용
- 첫 화면은 랜딩페이지가 아니라 바로 앱 화면
```

### 7.2 구현 포인트

React 앱에서는 종목 정보를 다음 구조로 관리했습니다.

```ts
type Holding = {
  id: string;
  market: "US" | "KR";
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  price: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  changePercent: number;
  lastUpdated?: string;
  provider?: string;
  quoteState: "pending" | "live" | "error";
  errorMessage?: string;
};
```

여기서 중요한 점은 `quoteState`입니다.

```text
pending → 아직 조회 전
live    → API 조회 성공
error   → API 조회 실패
```

---

## 8. 미국 주식 API 붙이기

### 8.1 API 선택

미국 주식은 Finnhub API를 사용했습니다.

사용한 API:

```text
GET https://finnhub.io/api/v1/search
GET https://finnhub.io/api/v1/quote
```

Finnhub 공식 문서:

[https://www.finnhub.io/docs/api](https://www.finnhub.io/docs/api)

### 8.2 API 키 발급

1. [Finnhub](https://finnhub.io/) 가입
2. Dashboard 이동
3. API Key 복사
4. Vercel 환경변수에 등록

환경변수 이름:

```text
FINNHUB_API_KEY
```

### 8.3 프롬프트 예시

```text
미국 주식은 Finnhub API를 사용하고 싶어.
브라우저에서 API 키가 노출되지 않도록 Vercel 서버리스 함수로 감싸줘.

요구사항:
- /api/search?q=Apple&market=US 로 회사명 검색
- /api/quote?symbol=AAPL&market=US 로 실시간 quote 조회
- Finnhub API 키는 FINNHUB_API_KEY 환경변수에서 읽기
- quote 조회가 실패하면 종목 추가를 막기
- 성공한 종목만 포트폴리오에 추가
```

### 8.4 서버리스 검색 API

`api/search.js`에서 미국 주식 검색은 Finnhub를 호출합니다.

핵심 흐름:

```text
앱에서 /api/search 호출
→ Vercel 함수가 FINNHUB_API_KEY 읽음
→ Finnhub /search 호출
→ 검색 결과를 앱에 반환
```

### 8.5 서버리스 quote API

`api/quote.js`에서 미국 주식 quote는 Finnhub를 호출합니다.

Finnhub quote 응답의 주요 필드:

```text
c  현재가
h  당일 고가
l  당일 저가
o  당일 시가
pc 전일 종가
t  timestamp
```

앱에서는 이 값을 아래 형태로 변환합니다.

```js
{
  symbol,
  name,
  price,
  open,
  high,
  low,
  previousClose,
  changePercent,
  lastUpdated,
  provider: "Finnhub",
  market: "US"
}
```

---

## 9. 국내 주식 API 검토 과정

### 9.1 처음 고려한 API

국내 주식은 처음에 Twelve Data KRX를 검토했습니다.

예시:

```text
005930:KRX
035720:KRX
```

하지만 실제로 사용해보니 무료 플랜에서는 다음 메시지가 나왔습니다.

```text
This symbol is available starting with the Pro or Venture plan.
```

즉, 무료 플랜에서는 KRX 국내 주식 quote가 제한되었습니다.

---

### 9.2 KIS Open API 검토

한국투자증권 KIS Open API도 검토했습니다.

장점:

- 국내 주식 현재가 조회 가능
- 공식 증권사 API
- REST 기반이라 Vercel 서버리스와 궁합이 좋음

단점:

- 한국투자증권 계좌 필요
- App Key / App Secret 필요
- OAuth 접근토큰 발급 필요
- 수업 시간에 모든 학생이 준비하기 어려움

따라서 이번 수업용 앱에서는 제외했습니다.

---

### 9.3 최종 선택: Yahoo Finance 지연 시세

계좌 없이 국내 주식 가격을 보여주기 위해 Yahoo Finance를 사용했습니다.

중요:

```text
Yahoo Finance 국내 주식 데이터는 실시간이 아니라 지연 시세입니다.
```

예시 심볼:

```text
삼성전자 → 005930.KS
카카오   → 035720.KS
현대차   → 005380.KS
```

국내 주식 quote 호출은 서버리스 함수에서 처리합니다.

```text
GET https://query1.finance.yahoo.com/v8/finance/chart/005930.KS?interval=1m&range=1d
```

---

## 10. 국내 주식 검색 구현

Yahoo Finance 검색 API를 직접 안정적으로 쓰기보다는, 수업용으로 대표 종목 목록을 서버에 넣었습니다.

`api/search.js`에는 다음과 같은 국내 종목 목록이 있습니다.

```js
const koreanStocks = [
  { symbol: "005930", name: "삼성전자", type: "Common Stock" },
  { symbol: "000660", name: "SK하이닉스", type: "Common Stock" },
  { symbol: "035420", name: "NAVER", type: "Common Stock" },
  { symbol: "035720", name: "카카오", type: "Common Stock" },
  { symbol: "005380", name: "현대차", type: "Common Stock" },
  { symbol: "000270", name: "기아", type: "Common Stock" },
  { symbol: "068270", name: "셀트리온", type: "Common Stock" }
];
```

### 10.1 국내 주식 추가 프롬프트

```text
국내 주식도 추가하고 싶어.
계좌 개설 없이 사용할 수 있는 무료 데이터가 필요해.
진짜 실시간 API가 없으면 Yahoo Finance 지연 시세로 처리해줘.

요구사항:
- 국내 주식은 Yahoo Finance chart endpoint 사용
- 005930은 005930.KS로 변환
- 국내 주식은 무료 지연 시세라고 명확히 표시
- 검색은 삼성전자, 카카오, 현대차 같은 회사명으로 가능하게
- 검색 결과에서 선택한 뒤 quote 조회가 성공해야만 포트폴리오 추가 가능
- 데모 가격은 사용하지 않기
```

---

## 11. 종목 추가 화면 개선

### 11.1 최종 종목 추가 흐름

현재 종목 추가는 다음 순서로 동작합니다.

```text
시장 선택
→ 회사명 또는 종목코드 입력
→ 검색
→ 검색 결과에서 종목 선택
→ quote 조회
→ 조회 성공 시 보유 수량/평균 매수가 입력
→ 포트폴리오 추가
```

### 11.2 중요한 UI 정책

조회 실패 종목은 추가할 수 없습니다.

```tsx
<button className="primaryButton" type="submit" disabled={!quotePreview}>
  <Plus size={18} />
  실시간 확인 종목 추가
</button>
```

즉, `quotePreview`가 있어야 추가 버튼이 활성화됩니다.

---

## 12. 포트폴리오 카드 개선

처음에는 국내 주식 카드 제목에 `005930`, `035720` 같은 코드가 크게 보였습니다.

이를 기업명 중심으로 바꿨습니다.

변경 전:

```text
005930
삼성전자 · 실시간 시세
```

변경 후:

```text
삼성전자
005930 · 실시간 시세
```

프롬프트 예시:

```text
포트폴리오 카드에서 국내 주식은 코드가 크게 보여서 어색해.
미국 주식처럼 기업명을 큰 제목으로 보여주고,
종목코드는 아래 보조 텍스트로 내려줘.

예:
삼성전자
005930 · 실시간 시세
```

---

## 13. 포트폴리오 계산 로직

### 13.1 평가금액

```text
평가금액 = 보유 수량 × 현재가
```

### 13.2 투자 원금

```text
투자 원금 = 보유 수량 × 평균 매수가
```

### 13.3 손익

```text
손익 = 평가금액 - 투자 원금
```

### 13.4 손익률

```text
손익률 = 손익 / 투자 원금 × 100
```

### 13.5 미국/국내 통합 합계

미국 주식은 USD, 국내 주식은 KRW입니다.

앱에서는 단순화를 위해 고정 환율을 사용했습니다.

```ts
const USD_KRW_RATE = 1350;
```

합계 계산:

```ts
function toUsd(value: number, market: Market) {
  return market === "KR" ? value / USD_KRW_RATE : value;
}

function toKrw(value: number, market: Market) {
  return market === "KR" ? value : value * USD_KRW_RATE;
}
```

---

## 14. 자동 새로고침

앱은 1분마다 가격을 다시 조회합니다.

```ts
const QUOTE_REFRESH_MS = 60_000;
```

자동 새로고침은 설정 탭에서 켜고 끌 수 있습니다.

```tsx
<input
  type="checkbox"
  checked={autoRefresh}
  onChange={(event) => setAutoRefresh(event.target.checked)}
/>
```

### 14.1 미국장 시간이 헷갈렸던 문제

미국 주식 카드에서 업데이트 시간이 `오전 05:00`으로 보였습니다.

이유:

```text
미국 정규장 마감 시간이 한국 기준 오전 5시 전후이기 때문
```

즉, 한국 낮에 새로고침해도 미국장이 닫혀 있으면 가격이 바뀌지 않는 것이 정상입니다.

---

## 15. PWA 설정

PWA 설치를 위해 다음 파일을 만들었습니다.

```text
manifest.webmanifest
public/sw.js
public/icons/icon-192.png
public/icons/icon-512.png
```

### 15.1 manifest.webmanifest

핵심 설정:

```json
{
  "name": "MyStock Lab",
  "short_name": "StockLab",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f5f7f8",
  "theme_color": "#101820"
}
```

중요한 값:

```json
"display": "standalone"
```

이 설정이 있어야 아이폰 홈 화면에서 앱처럼 실행됩니다.

### 15.2 서비스워커

`public/sw.js`는 기본 앱 shell을 캐시합니다.

```js
const CACHE_NAME = "mystock-lab-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];
```

---

## 16. GitHub 업로드

### 16.1 Git 초기 상태 확인

```bash
git status --short --branch
```

### 16.2 파일 추가

```bash
git add .
```

### 16.3 커밋

```bash
git commit -m "Create stock portfolio PWA"
```

### 16.4 원격 저장소 연결

```bash
git remote add origin https://github.com/eclee0825/chang.git
git branch -M main
git push -u origin main
```

### 16.5 GitHub 인증 문제

처음에는 PC의 GitHub 인증 계정이 다른 계정으로 잡혀 있어서 push가 실패했습니다.

오류:

```text
Permission to eclee0825/chang.git denied
```

해결:

```text
Windows 자격 증명 관리자
→ github.com 관련 자격 증명 삭제
→ 다시 push
→ 올바른 GitHub 계정으로 로그인
```

---

## 17. Vercel 배포

### 17.1 Vercel 프로젝트 가져오기

1. Vercel 로그인
2. `Add New Project`
3. GitHub 저장소 선택
4. Framework Preset: `Vite`
5. Build Command: `npm run build`
6. Output Directory: `dist`
7. Deploy

### 17.2 필요한 환경변수

현재 최종 버전에서는 미국 주식 조회를 위해 Finnhub API 키만 필요합니다.

```text
FINNHUB_API_KEY=발급받은 Finnhub API Key
```

Vercel 설정 위치:

```text
Project
→ Settings
→ Environment Variables
```

환경변수 추가 후 반드시 재배포해야 합니다.

```text
Deployments
→ 최신 배포
→ Redeploy
```

---

## 18. 아이폰 홈 화면에 앱 추가

Vercel 배포 URL이 생성되면 아이폰 Safari에서 접속합니다.

```text
https://프로젝트이름.vercel.app
```

아이폰에서:

```text
공유 버튼
→ 홈 화면에 추가
→ 이름 확인
→ 추가
```

그러면 아이폰 홈 화면에 앱 아이콘이 생깁니다.

---

## 19. 수업 중 자주 나오는 문제

### 19.1 API Key is not configured

원인:

```text
Vercel 환경변수에 API 키가 없음
```

해결:

```text
Vercel Settings
→ Environment Variables
→ FINNHUB_API_KEY 추가
→ Redeploy
```

---

### 19.2 미국 주식 가격이 안 바뀜

원인:

```text
미국장이 닫혀 있으면 가격이 그대로 유지됨
```

한국 시간 기준 미국 정규장은 보통 밤 10:30부터 다음날 오전 5:00 전후입니다.

---

### 19.3 국내 주식이 실시간이 아님

원인:

```text
무료 국내 주식 데이터는 대부분 지연 시세
```

수업에서는 다음처럼 설명합니다.

```text
미국 주식: Finnhub 실시간 시세
국내 주식: Yahoo Finance 무료 지연 시세
```

---

### 19.4 Twelve Data가 Pro 계정 요구

원인:

```text
Twelve Data KRX quote는 무료 플랜에서 제한될 수 있음
```

그래서 최종 앱에서는 Twelve Data를 제거하고 Yahoo Finance 지연 시세를 사용했습니다.

---

## 20. 전체 실습 프롬프트 모음

### 20.1 앱 초안 생성

```text
React + Vite + TypeScript로 주식 포트폴리오 PWA를 만들어줘.
앱 이름은 MyStock Lab이야.
첫 화면은 랜딩페이지가 아니라 바로 사용할 수 있는 포트폴리오 앱이어야 해.
모바일 우선 디자인으로 만들고, Vercel 배포와 아이폰 홈 화면 추가가 가능하도록 PWA 설정도 포함해줘.
```

### 20.2 미국 주식 API 추가

```text
미국 주식은 Finnhub API를 사용해서 회사명 검색과 실시간 quote 조회를 하고 싶어.
API 키는 브라우저에 노출하지 말고 Vercel 서버리스 함수에서 FINNHUB_API_KEY 환경변수로 읽어줘.
/api/search와 /api/quote를 만들어줘.
quote 조회가 성공한 종목만 포트폴리오에 추가되게 해줘.
```

### 20.3 국내 주식 추가

```text
국내 주식도 추가하고 싶어.
계좌 개설 없이 무료로 사용할 수 있는 방식이어야 해.
진짜 실시간 API가 어렵다면 Yahoo Finance 지연 시세로 처리해줘.
국내 주식은 무료 지연 시세라고 앱에 명확히 표시해줘.
삼성전자, 카카오, 현대차 같은 회사명으로 검색되게 해줘.
```

### 20.4 종목 추가 UX 개선

```text
종목 추가 화면을 실제 주식 앱처럼 다듬어줘.
시장 선택, 회사명 검색, 검색 결과 선택, 현재가 확인, 보유 수량 입력, 평균 매수가 입력, 예상 평가금액 확인 순서로 만들어줘.
실제 API 조회가 성공한 종목만 추가 버튼이 활성화되게 해줘.
```

### 20.5 포트폴리오 카드 개선

```text
포트폴리오 카드에서 종목코드가 크게 보이는 게 어색해.
기업명을 큰 제목으로 보여주고, 종목코드는 아래 보조 텍스트로 내려줘.
예: 삼성전자 / 005930 · 실시간 시세
```

### 20.6 PWA 설치 안내 추가

```text
앱을 PWA로 설치할 수 있게 manifest와 service worker를 추가해줘.
아이폰 Safari에서 홈 화면에 추가했을 때 앱 아이콘처럼 실행되게 해줘.
```

---

## 21. 최종 앱 요약

최종 앱은 다음과 같습니다.

```text
MyStock Lab

미국 주식:
회사명 검색 → Finnhub 실시간 quote → 포트폴리오 추가

국내 주식:
회사명 검색 → Yahoo Finance 무료 지연 시세 → 포트폴리오 추가

공통:
조회 성공 종목만 추가
평가금액/손익률 계산
1분 자동 새로고침
PWA 설치
Vercel 배포
```

---

## 22. 강의에서 강조할 점

이 실습의 핵심은 “AI가 코드를 대신 짜준다”가 아닙니다.

중요한 것은 다음입니다.

```text
원하는 앱을 명확히 설명하고
API 제약을 확인하고
실패한 부분을 다시 질문하고
실제 동작 기준으로 요구사항을 수정하고
배포 가능한 앱으로 완성하는 과정
```

바이브 코딩은 한 번에 완성하는 방식이 아니라, 다음 루프를 반복하는 방식입니다.

```text
요구사항 말하기
→ 코드 생성
→ 실행
→ 오류 확인
→ 원인 질문
→ 수정 요청
→ 다시 검증
```

이번 실습은 이 반복 과정을 학생들이 실제 앱 결과물로 경험할 수 있게 해주는 예제입니다.
