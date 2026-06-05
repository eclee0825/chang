# 바이브 코딩으로 나만의 주식 PWA 만들기

## 1. 실습 목표

이번 실습의 목표는 **웹으로 만든 주식 앱을 스마트폰에서 실제 앱처럼 실행할 수 있게 만드는 것**입니다.

전체 흐름은 다음과 같습니다.

```text
주식 앱 제작
→ PWA 설정
→ Vercel 배포
→ 스마트폰에서 URL 접속
→ 홈 화면에 추가
→ 앱 아이콘처럼 실행
```

완성 결과물은 일반 웹사이트가 아니라 **PWA, Progressive Web App** 형태입니다.

PWA는 App Store나 Play Store에 등록하는 네이티브 앱은 아니지만, 스마트폰 홈 화면에 아이콘으로 추가할 수 있고 앱처럼 실행할 수 있습니다.

---

## 2. 현재까지 만든 앱 개요

앱 이름은 **MyStock Lab**입니다.

학부생 대상 바이브 코딩 실습에 맞춰, 처음부터 너무 복잡한 실시간 투자 앱을 만드는 대신 다음 기준으로 설계했습니다.

- 개인별로 혼자 완성 가능해야 함
- API가 없어도 앱이 정상 동작해야 함
- API 키가 있으면 미국 주식 시세 조회까지 확장 가능해야 함
- 스마트폰에서 앱처럼 실행 가능해야 함
- Vercel에 쉽게 배포 가능해야 함
- 강의 중 오류가 나도 데모 데이터로 실습을 계속할 수 있어야 함

---

## 3. 사용 기술

| 구분 | 사용 기술 |
|---|---|
| 프론트엔드 | React |
| 빌드 도구 | Vite |
| 언어 | TypeScript |
| 아이콘 | lucide-react |
| 저장 방식 | localStorage |
| PWA 구성 | manifest, service worker, app icons |
| 배포 | Vercel |
| 주식 API | Twelve Data |

---

## 4. 주식 API 선택 기준

주식 앱을 만들 때 가장 먼저 결정해야 하는 것은 **어떤 시세 API를 사용할 것인가**입니다.

수업용 API를 고를 때는 다음 기준이 중요합니다.

1. 무료 또는 실습용 플랜이 있는가
2. API 문서가 이해하기 쉬운가
3. 브라우저 앱에서 호출하기 쉬운가
4. 호출 제한이 너무 빡빡하지 않은가
5. API 키 관리가 복잡하지 않은가
6. 수업 중 실패하더라도 대체 흐름을 만들 수 있는가

---

## 5. 미국 주식 API 결정

미국 주식 API는 **Twelve Data**를 선택했습니다.

Twelve Data를 선택한 이유는 다음과 같습니다.

- `/quote` 엔드포인트로 현재가, 변동률, 종목명 등을 조회할 수 있음
- Basic 무료 플랜이 있음
- 미국 주식과 ETF 실시간 조회를 시작하기 쉬움
- 문서가 비교적 명확함
- 프론트엔드 실습에서 사용하기 쉬움

앱에서는 API 키를 입력하면 미국 주식 조회에 Twelve Data를 사용합니다.

현재 구현된 API 호출 코드는 다음 파일에 있습니다.

```text
src/main.tsx
```

핵심 함수는 `fetchQuote`입니다.

```ts
async function fetchQuote(symbol: string, apiKey: string) {
  const url = new URL("https://api.twelvedata.com/quote");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url);
  if (!response.ok) throw new Error("quote request failed");

  const data = await response.json();
  if (data.status === "error" || !data.close) throw new Error(data.message || "quote unavailable");

  return {
    name: data.name || symbol,
    price: Number(data.close),
    changePercent: Number(data.percent_change || 0)
  };
}
```

참고 문서:

- [Twelve Data API Documentation](https://twelvedata.com/docs)
- [Twelve Data Pricing](https://twelvedata.com/pricing)

---

## 6. 국내 주식 API 판단

국내 주식은 실습 앱에서 바로 실시간 API를 붙이지 않고, **데모 데이터 기반으로 구현**했습니다.

이유는 다음과 같습니다.

- 국내 증권사 Open API는 대부분 앱키와 앱 시크릿이 필요함
- OAuth 접근 토큰 발급 과정이 필요함
- 프론트엔드에 앱 시크릿을 직접 넣으면 보안상 위험함
- 일부 API는 증권 계좌 개설 또는 별도 신청이 필요함
- 수업 중 학생 개인별 발급 상황이 달라 실습 진행이 불안정할 수 있음

따라서 현재 앱 구조는 다음과 같습니다.

| 시장 | 처리 방식 |
|---|---|
| 미국 주식 | Twelve Data API 키가 있으면 실시간 조회 |
| 국내 주식 | 데모 가격 데이터 사용 |
| API 실패 | 데모 가격으로 자동 전환 |

국내 주식까지 실제 API로 붙이고 싶다면, 프론트엔드 단독 앱이 아니라 다음 구조가 더 적합합니다.

```text
React PWA
→ 백엔드 서버 또는 서버리스 함수
→ 국내 증권사 Open API
```

이렇게 해야 앱 시크릿과 토큰을 안전하게 숨길 수 있습니다.

---

## 7. 현재 앱 기능

현재까지 구현된 기능은 다음과 같습니다.

### 7.1 포트폴리오 대시보드

앱 첫 화면에서 다음 정보를 보여줍니다.

- 총 평가금액
- USD 환산 금액
- 총 손익
- 총 수익률
- 오늘의 강세 종목

### 7.2 관심 종목 목록

각 종목 카드에는 다음 정보가 표시됩니다.

- 시장 구분
- 종목 코드
- 종목명
- 현재가
- 평가금액
- 손익률
- 미니 차트 형태의 시각 요소
- 삭제 버튼

### 7.3 종목 추가

사용자는 다음 값을 입력해서 종목을 추가할 수 있습니다.

- 시장: 미국 주식 또는 국내 주식
- 티커 또는 종목코드
- 보유 수량
- 평균 매수가

예시:

| 시장 | 입력 예시 |
|---|---|
| 미국 주식 | AAPL, MSFT, NVDA, TSLA |
| 국내 주식 | 005930, 000660, 035420 |

### 7.4 가격 새로고침

포트폴리오 화면의 새로고침 버튼을 누르면 가격이 업데이트됩니다.

동작 방식은 다음과 같습니다.

```text
Twelve Data API 키 있음 + 미국 주식
→ API로 가격 조회

API 키 없음
→ 데모 가격 사용

API 호출 실패
→ 데모 가격으로 자동 전환
```

### 7.5 localStorage 저장

추가한 종목은 브라우저의 localStorage에 저장됩니다.

따라서 새로고침을 해도 관심 종목 목록이 유지됩니다.

사용한 저장 키는 다음과 같습니다.

```text
mystock-lab-holdings
mystock-lab-twelvedata-key
```

### 7.6 API 설정 화면

`API/PWA` 탭에서 Twelve Data API Key를 입력할 수 있습니다.

API 키를 입력하지 않아도 앱은 데모 모드로 정상 동작합니다.

---

## 8. PWA 구현 내용

PWA로 설치 가능하게 만들기 위해 다음 파일을 추가했습니다.

```text
manifest.webmanifest
public/sw.js
public/icons/icon-192.png
public/icons/icon-512.png
```

### 8.1 manifest.webmanifest

`manifest.webmanifest`는 앱의 이름, 아이콘, 실행 방식 등을 정의합니다.

현재 설정은 다음과 같습니다.

```json
{
  "name": "MyStock Lab",
  "short_name": "StockLab",
  "description": "관심 종목과 모의 포트폴리오를 관리하는 바이브 코딩 실습용 PWA",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#f5f7f8",
  "theme_color": "#101820"
}
```

중요한 설정은 `display`입니다.

```json
"display": "standalone"
```

이 설정이 있어야 홈 화면에서 실행했을 때 일반 브라우저 탭이 아니라 앱처럼 열릴 수 있습니다.

### 8.2 앱 아이콘

PWA 설치를 위해 다음 크기의 아이콘을 생성했습니다.

```text
public/icons/icon-192.png
public/icons/icon-512.png
```

아이콘은 스마트폰 홈 화면에 표시됩니다.

### 8.3 service worker

서비스워커 파일은 다음 위치에 있습니다.

```text
public/sw.js
```

서비스워커는 앱 shell을 캐시하고, 오프라인 상황에서도 기본 화면을 열 수 있게 도와줍니다.

현재 캐시 대상은 다음과 같습니다.

```js
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];
```

---

## 9. 프로젝트 파일 구조

현재 프로젝트의 주요 파일 구조는 다음과 같습니다.

```text
바이브코딩/
├─ index.html
├─ manifest.webmanifest
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ .gitignore
├─ public/
│  ├─ sw.js
│  └─ icons/
│     ├─ icon-192.png
│     └─ icon-512.png
└─ src/
   ├─ main.tsx
   └─ styles.css
```

각 파일의 역할은 다음과 같습니다.

| 파일 | 역할 |
|---|---|
| `index.html` | 앱 진입 HTML |
| `src/main.tsx` | React 앱 전체 기능 |
| `src/styles.css` | 앱 디자인 |
| `manifest.webmanifest` | PWA 앱 정보 |
| `public/sw.js` | 서비스워커 |
| `public/icons/` | 앱 아이콘 |
| `package.json` | 실행/빌드 스크립트와 의존성 |
| `.gitignore` | Git에서 제외할 파일 설정 |

---

## 10. 설치한 패키지

현재 `package.json`의 주요 의존성은 다음과 같습니다.

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

---

## 11. 실행 방법

### 11.1 의존성 설치

Windows PowerShell에서 `npm` 명령이 실행 정책 때문에 막힐 수 있습니다.

그래서 이번 작업에서는 `npm.cmd`를 사용했습니다.

```bash
npm.cmd install
```

### 11.2 개발 서버 실행

```bash
npm.cmd run dev
```

포트를 지정해서 실행하려면 다음처럼 실행할 수 있습니다.

```bash
npm.cmd run dev -- --port 5173
```

현재 로컬 접속 주소는 다음과 같습니다.

```text
http://127.0.0.1:5173/
```

### 11.3 프로덕션 빌드

Vercel 배포 전에 반드시 빌드를 확인합니다.

```bash
npm.cmd run build
```

현재 빌드는 성공했습니다.

---

## 12. 확인한 내용

현재까지 직접 확인한 내용은 다음과 같습니다.

| 확인 항목 | 결과 |
|---|---|
| React 앱 첫 화면 렌더링 | 성공 |
| 포트폴리오 대시보드 표시 | 성공 |
| 관심 종목 카드 표시 | 성공 |
| 종목 추가 | 성공 |
| localStorage 저장 | 성공 |
| manifest 접근 | 성공 |
| service worker 파일 접근 | 성공 |
| 앱 아이콘 접근 | 성공 |
| 프로덕션 빌드 | 성공 |

확인한 PWA 리소스 URL:

```text
http://127.0.0.1:5173/manifest.webmanifest
http://127.0.0.1:5173/sw.js
http://127.0.0.1:5173/icons/icon-192.png
```

모두 `200` 응답을 확인했습니다.

---

## 13. Vercel 배포 방법

Vercel에 배포하는 일반적인 흐름은 다음과 같습니다.

### 13.1 GitHub에 프로젝트 업로드

먼저 GitHub 저장소를 만들고 프로젝트를 업로드합니다.

주의할 점은 `node_modules`와 `dist`는 Git에 올리지 않는 것입니다.

이를 위해 `.gitignore`에 다음 내용을 추가했습니다.

```gitignore
node_modules/
dist/
.env
.env.local
.DS_Store
```

### 13.2 Vercel에서 프로젝트 가져오기

Vercel에 로그인한 뒤 다음 순서로 진행합니다.

```text
Add New Project
→ GitHub 저장소 선택
→ Framework Preset: Vite 자동 인식
→ Build Command: npm run build
→ Output Directory: dist
→ Deploy
```

Vercel은 Vite 프로젝트를 공식적으로 지원합니다.

참고 문서:

- [Vercel Vite Documentation](https://vercel.com/docs/frameworks/frontend/vite)

---

## 14. 스마트폰에서 앱처럼 설치하는 방법

Vercel 배포가 끝나면 HTTPS URL이 생성됩니다.

예시:

```text
https://my-stock-lab.vercel.app
```

### 14.1 Android Chrome

1. Chrome에서 Vercel URL 접속
2. 오른쪽 위 메뉴 클릭
3. `앱 설치` 또는 `홈 화면에 추가` 선택
4. 홈 화면에 `StockLab` 아이콘 생성
5. 아이콘을 눌러 앱처럼 실행

### 14.2 iPhone Safari

1. Safari에서 Vercel URL 접속
2. 공유 버튼 클릭
3. `홈 화면에 추가` 선택
4. 이름 확인 후 추가
5. 홈 화면에서 앱 아이콘 실행

---

## 15. 수업에서 설명하면 좋은 포인트

### 15.1 웹사이트와 앱의 차이

학생들에게 다음처럼 설명하면 좋습니다.

```text
일반 웹사이트:
브라우저 안에서 실행된다.

PWA:
웹 기술로 만들지만 스마트폰 홈 화면에 설치되고 앱처럼 실행된다.
```

### 15.2 API 키 보안

프론트엔드 앱에 API 키를 넣는 것은 항상 조심해야 합니다.

이번 실습에서는 수업용으로 Twelve Data API Key를 브라우저에서 입력하는 구조를 사용했습니다.

하지만 실제 서비스라면 다음 구조가 더 안전합니다.

```text
프론트엔드
→ 백엔드 서버 또는 서버리스 함수
→ 외부 API
```

이렇게 하면 API 키와 앱 시크릿을 사용자 브라우저에 노출하지 않을 수 있습니다.

### 15.3 국내 주식 API를 데모로 처리한 이유

국내 주식 API는 공식 Open API를 사용하는 것이 좋지만, 보통 앱키, 앱 시크릿, 접근 토큰이 필요합니다.

따라서 수업 초반에는 국내 주식도 데모 데이터로 진행하고, 심화 과정에서 백엔드 연동을 추가하는 방식이 좋습니다.

### 15.4 바이브 코딩 관점

이 실습은 코드를 처음부터 외워서 작성하는 것이 아니라, 다음 흐름을 연습하기 위한 것입니다.

```text
만들고 싶은 앱 설명
→ AI에게 초안 생성 요청
→ 실행
→ 오류 확인
→ 기능 단위로 수정 요청
→ 디자인 개선
→ 배포
→ 스마트폰에서 실제 사용
```

학생들에게 중요한 것은 “AI가 코드를 만들어줬다”가 아니라, **내가 원하는 결과를 정확히 설명하고, 결과를 검증하고, 개선 방향을 지시하는 것**입니다.

---

## 16. 현재 앱에서 확장할 수 있는 기능

시간이 남으면 다음 기능을 추가할 수 있습니다.

### 쉬운 확장

- 종목 검색 자동완성
- 보유 종목 정렬
- 수익률 기준 필터
- 전체 삭제 버튼
- 다크 모드
- 메모 기능

### 중간 난이도 확장

- 차트 라이브러리 적용
- 매수/매도 기록
- 총 자산 변화 그래프
- 환율 설정
- 종목별 태그
- 관심 종목과 보유 종목 분리

### 심화 확장

- 백엔드 서버 추가
- 국내 주식 Open API 연동
- 서버리스 함수로 API 키 숨기기
- 로그인 기능
- 클라우드 DB 저장
- 푸시 알림

---

## 17. 수업용 추천 진행 순서

수업에서는 다음 순서로 진행하면 좋습니다.

### 1단계: 앱 아이디어 설명

```text
오늘 만들 앱은 스마트폰에 설치할 수 있는 나만의 주식 포트폴리오 앱입니다.
```

### 2단계: 기본 UI 생성

대시보드, 탭, 종목 카드부터 만듭니다.

### 3단계: 데이터 구조 만들기

종목 데이터를 다음 구조로 관리합니다.

```ts
type Holding = {
  id: string;
  market: "US" | "KR";
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  price: number;
  changePercent: number;
};
```

### 4단계: 종목 추가 기능 만들기

폼을 만들고 입력한 종목을 배열에 추가합니다.

### 5단계: 수익률 계산

평가금액과 손익률을 계산합니다.

```text
평가금액 = 보유 수량 × 현재가
투자금액 = 보유 수량 × 평균 매수가
손익 = 평가금액 - 투자금액
손익률 = 손익 / 투자금액 × 100
```

### 6단계: localStorage 저장

새로고침 후에도 데이터가 유지되게 합니다.

### 7단계: API 연동

Twelve Data API Key를 입력하고 미국 주식 가격을 조회합니다.

### 8단계: PWA 설정

manifest, service worker, icon을 추가합니다.

### 9단계: Vercel 배포

Vercel에 배포한 뒤 스마트폰에서 접속합니다.

### 10단계: 홈 화면에 추가

스마트폰에서 앱 아이콘처럼 실행되는지 확인합니다.

---

## 18. 현재 상태 요약

현재까지 완료된 작업은 다음과 같습니다.

```text
React + Vite 프로젝트 생성
주식 포트폴리오 앱 구현
미국 주식 Twelve Data API 연동 구조 추가
국내 주식 데모 데이터 추가
가격 fallback 로직 추가
localStorage 저장 추가
PWA manifest 추가
service worker 추가
앱 아이콘 생성
모바일 UI 적용
프로덕션 빌드 성공
로컬 브라우저 테스트 성공
```

현재 로컬 실행 주소:

```text
http://127.0.0.1:5173/
```

---

## 19. 다음에 할 일

다음 단계는 다음 중 하나입니다.

1. GitHub 저장소에 업로드
2. Vercel 배포
3. 스마트폰에서 PWA 설치 테스트
4. 수업용 프롬프트 예시 문서 작성
5. 학생용 실습지 작성
6. Twelve Data API Key 발급 가이드 작성

---

## 20. 핵심 정리

이번 실습의 핵심은 단순히 주식 앱을 만드는 것이 아닙니다.

핵심은 다음입니다.

```text
웹앱을 만들고
데이터를 저장하고
API를 붙이고
PWA로 설치 가능하게 만들고
Vercel로 배포해서
스마트폰에서 앱처럼 실행하는 전체 흐름을 경험하는 것
```

이 과정은 바이브 코딩 강의에서 매우 좋은 실습 주제가 됩니다.

학생들은 코딩 문법을 전부 외우지 않아도, AI와 함께 앱을 만들고 실행하고 배포하는 전체 과정을 직접 경험할 수 있습니다.
