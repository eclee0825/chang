# 나만의 주식 PWA 제작부터 GitHub 업로드, Vercel 배포 준비까지

## 1. 전체 목표

이번 작업의 목표는 **바이브 코딩 강의에서 사용할 수 있는 개인 주식 앱을 만들고, 스마트폰에서 앱처럼 설치할 수 있는 상태까지 준비하는 것**입니다.

최종적으로 만들고자 한 흐름은 다음과 같습니다.

```text
주식 앱 제작
→ PWA 설정
→ GitHub 저장소 업로드
→ Vercel 배포
→ 아이폰 Safari에서 URL 접속
→ 홈 화면에 추가
→ 실제 앱 아이콘처럼 실행
```

여기서 핵심은 단순히 웹페이지를 만드는 것이 아니라, **웹앱을 스마트폰 홈 화면에 설치 가능한 PWA로 만드는 것**입니다.

---

## 2. 현재 완료된 상태

현재까지 완료된 작업은 다음과 같습니다.

```text
React + Vite 프로젝트 생성
주식 포트폴리오 앱 구현
미국 주식 API 후보 조사 및 Twelve Data 선택
국내 주식 API는 데모 데이터 방식으로 결정
PWA manifest 생성
service worker 생성
앱 아이콘 생성
localStorage 저장 기능 구현
프로덕션 빌드 성공
로컬 브라우저 테스트 성공
Git 커밋 생성
GitHub 저장소 push 성공
Vercel import 화면 진입
```

GitHub 저장소:

```text
https://github.com/eclee0825/chang
```

현재 Vercel import 화면:

```text
https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Feclee0825%2Fchang
```

---

## 3. 만든 앱 개요

앱 이름은 **MyStock Lab**입니다.

스마트폰에서 개인 포트폴리오를 관리하는 느낌의 주식 앱으로 만들었습니다.

주요 목적은 다음과 같습니다.

- 학부생이 개인 실습으로 따라 만들 수 있음
- API가 없어도 데모 데이터로 정상 동작함
- API 키가 있으면 미국 주식 조회까지 확장 가능함
- 모바일 화면에서 보기 좋게 구성됨
- PWA로 설치 가능함
- Vercel에 쉽게 배포 가능함

---

## 4. 사용 기술 스택

| 구분 | 사용 기술 |
|---|---|
| 프론트엔드 | React |
| 빌드 도구 | Vite |
| 언어 | TypeScript |
| 아이콘 | lucide-react |
| 저장 방식 | localStorage |
| PWA | manifest, service worker, app icons |
| 배포 | Vercel |
| Git 저장소 | GitHub |
| 미국 주식 API | Twelve Data |
| 국내 주식 데이터 | 데모 데이터 |

---

## 5. API 조사 및 결정

### 5.1 API 선택 기준

주식 앱에 사용할 API를 고를 때 다음 기준을 사용했습니다.

1. 수업 중 사용하기 쉬운가
2. 무료 또는 실습용 플랜이 있는가
3. 문서가 명확한가
4. 프론트엔드 앱에서 호출하기 쉬운가
5. API 키 관리가 지나치게 복잡하지 않은가
6. 호출 실패 시 대체 동작을 만들 수 있는가

---

### 5.2 미국 주식 API

미국 주식은 **Twelve Data**를 선택했습니다.

선택 이유:

- `/quote` 엔드포인트로 현재가, 종목명, 변동률 등을 조회할 수 있음
- Basic 무료 플랜이 있음
- 미국 주식과 ETF 실시간 조회를 시작하기 쉬움
- API 문서가 비교적 이해하기 쉬움
- 수업용 실습에 적합함

참고 문서:

- [Twelve Data API Documentation](https://twelvedata.com/docs)
- [Twelve Data Pricing](https://twelvedata.com/pricing)

앱에서는 사용자가 Twelve Data API Key를 입력하면 미국 주식 가격을 API로 조회합니다.

---

### 5.3 국내 주식 API

국내 주식은 실시간 API를 바로 붙이지 않고 **데모 데이터 방식**으로 구현했습니다.

이유는 다음과 같습니다.

- 국내 증권사 Open API는 앱키와 앱 시크릿이 필요함
- OAuth 토큰 발급 과정이 필요함
- 프론트엔드 앱에 앱 시크릿을 넣으면 보안상 위험함
- 증권 계좌 또는 별도 API 신청이 필요한 경우가 많음
- 학생마다 API 발급 상태가 달라 수업 진행이 불안정할 수 있음

따라서 현재 앱의 정책은 다음과 같습니다.

| 시장 | 처리 방식 |
|---|---|
| 미국 주식 | Twelve Data API Key가 있으면 API 조회 |
| 국내 주식 | 데모 가격 데이터 사용 |
| API 실패 | 데모 가격으로 자동 전환 |

국내 주식을 실제 API로 붙이려면 다음 구조가 더 안전합니다.

```text
React PWA
→ 백엔드 서버 또는 서버리스 함수
→ 국내 증권사 Open API
```

이렇게 해야 앱 시크릿과 접근 토큰을 브라우저에 노출하지 않을 수 있습니다.

---

## 6. 구현한 주요 기능

### 6.1 포트폴리오 대시보드

앱 상단에서 다음 정보를 보여줍니다.

- 총 평가금액
- USD 환산 금액
- 총 손익
- 총 수익률
- 오늘의 강세 종목

---

### 6.2 관심 종목 카드

각 종목 카드에는 다음 정보가 표시됩니다.

- 시장 구분
- 종목 코드
- 종목명
- 현재가
- 평가금액
- 손익률
- 미니 차트
- 삭제 버튼

---

### 6.3 종목 추가

사용자는 다음 값을 입력해서 종목을 추가할 수 있습니다.

| 입력값 | 예시 |
|---|---|
| 시장 | 미국 주식, 국내 주식 |
| 티커/종목코드 | AAPL, MSFT, NVDA, 005930 |
| 보유 수량 | 3 |
| 평균 매수가 | 180 |

---

### 6.4 가격 새로고침

가격 새로고침 버튼을 누르면 다음 방식으로 동작합니다.

```text
Twelve Data API Key 있음 + 미국 주식
→ API로 현재가 조회

API Key 없음
→ 데모 가격 사용

API 호출 실패
→ 데모 가격으로 자동 전환
```

이렇게 만든 이유는 수업 중 API 문제로 앱 전체가 멈추는 상황을 막기 위해서입니다.

---

### 6.5 localStorage 저장

앱 데이터는 브라우저 localStorage에 저장됩니다.

저장되는 항목은 다음과 같습니다.

```text
mystock-lab-holdings
mystock-lab-twelvedata-key
```

덕분에 새로고침 후에도 관심 종목이 유지됩니다.

---

### 6.6 API/PWA 설정 화면

앱에는 `API/PWA` 탭이 있습니다.

이 화면에서는 다음 내용을 확인하거나 입력할 수 있습니다.

- Twelve Data API Key 입력
- 미국 주식 API 사용 안내
- 국내 주식 데모 데이터 사용 이유
- PWA 설치 안내

---

## 7. PWA 구현

PWA 설치를 위해 다음 파일을 추가했습니다.

```text
manifest.webmanifest
public/sw.js
public/icons/icon-192.png
public/icons/icon-512.png
```

---

### 7.1 manifest.webmanifest

`manifest.webmanifest`는 앱 이름, 아이콘, 시작 경로, 실행 방식 등을 정의합니다.

핵심 설정:

```json
{
  "name": "MyStock Lab",
  "short_name": "StockLab",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#f5f7f8",
  "theme_color": "#101820"
}
```

가장 중요한 값은 다음입니다.

```json
"display": "standalone"
```

이 설정이 있어야 아이폰 홈 화면에서 실행했을 때 Safari 주소창 없이 앱처럼 열릴 수 있습니다.

---

### 7.2 앱 아이콘

스마트폰 홈 화면에 표시될 아이콘을 만들었습니다.

```text
public/icons/icon-192.png
public/icons/icon-512.png
```

PWA에서는 보통 `192x192`, `512x512` 아이콘을 준비합니다.

---

### 7.3 service worker

서비스워커 파일은 다음 위치에 있습니다.

```text
public/sw.js
```

역할:

- 앱 기본 파일 캐시
- 오프라인 상황에서 기본 화면 제공
- PWA 설치 조건 충족에 도움

현재 캐시 대상:

```js
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];
```

---

## 8. 프로젝트 파일 구조

현재 주요 파일 구조는 다음과 같습니다.

```text
바이브코딩/
├─ .gitignore
├─ index.html
├─ manifest.webmanifest
├─ package.json
├─ package-lock.json
├─ stock-pwa-guide.md
├─ stock-pwa-full-progress.md
├─ tsconfig.json
├─ public/
│  ├─ sw.js
│  └─ icons/
│     ├─ icon-192.png
│     └─ icon-512.png
└─ src/
   ├─ main.tsx
   └─ styles.css
```

파일별 역할:

| 파일 | 역할 |
|---|---|
| `index.html` | 앱 진입 HTML |
| `src/main.tsx` | React 앱 기능 구현 |
| `src/styles.css` | 앱 디자인 |
| `manifest.webmanifest` | PWA 앱 정보 |
| `public/sw.js` | 서비스워커 |
| `public/icons/` | 홈 화면 앱 아이콘 |
| `package.json` | 실행/빌드 스크립트 |
| `.gitignore` | Git 제외 파일 설정 |
| `stock-pwa-guide.md` | 앱 제작 가이드 |
| `stock-pwa-full-progress.md` | 전체 진행 기록 |

---

## 9. 실행 및 빌드

### 9.1 의존성 설치

Windows PowerShell에서는 실행 정책 때문에 `npm` 명령이 막힐 수 있습니다.

그래서 `npm.cmd`를 사용했습니다.

```bash
npm.cmd install
```

설치 결과:

```text
added 67 packages
found 0 vulnerabilities
```

---

### 9.2 로컬 개발 서버 실행

```bash
npm.cmd run dev -- --port 5173
```

로컬 실행 주소:

```text
http://127.0.0.1:5173/
```

---

### 9.3 프로덕션 빌드

Vercel 배포 전 빌드 확인을 진행했습니다.

```bash
npm.cmd run build
```

빌드 결과:

```text
vite build 성공
dist/ 생성 완료
```

---

## 10. 로컬 테스트 결과

로컬 브라우저에서 다음 항목을 확인했습니다.

| 확인 항목 | 결과 |
|---|---|
| 앱 첫 화면 렌더링 | 성공 |
| 대시보드 표시 | 성공 |
| 관심 종목 카드 표시 | 성공 |
| 종목 추가 | 성공 |
| MSFT 추가 테스트 | 성공 |
| 데모 가격 fallback | 성공 |
| manifest 접근 | 성공 |
| service worker 접근 | 성공 |
| 앱 아이콘 접근 | 성공 |
| 프로덕션 빌드 | 성공 |

확인한 URL:

```text
http://127.0.0.1:5173/
http://127.0.0.1:5173/manifest.webmanifest
http://127.0.0.1:5173/sw.js
http://127.0.0.1:5173/icons/icon-192.png
```

PWA 관련 파일은 모두 `200` 응답을 확인했습니다.

---

## 11. Git 작업 진행 과정

### 11.1 초기 Git 상태

처음에는 Git 저장소는 있었지만 아직 커밋은 없는 상태였습니다.

```text
No commits yet on master
```

추적되지 않은 파일들이 있었습니다.

```text
.gitignore
index.html
manifest.webmanifest
package-lock.json
package.json
public/
src/
stock-pwa-guide.md
tsconfig.json
```

---

### 11.2 파일 스테이징

다음 파일들을 Git에 추가했습니다.

```bash
git add .gitignore index.html manifest.webmanifest package-lock.json package.json public src stock-pwa-guide.md tsconfig.json
```

이후 `stock-pwa-full-progress.md`도 새로 추가했습니다.

---

### 11.3 첫 커밋 시도 중 발생한 문제

처음 커밋을 만들 때 Git 사용자 이름과 이메일이 설정되어 있지 않아 실패했습니다.

오류 메시지:

```text
Author identity unknown

Please tell me who you are.
```

해결 방법:

```bash
git config user.name "eclee0825"
git config user.email "eclee0825@users.noreply.github.com"
```

전역 설정이 아니라 **현재 저장소에만 적용되는 로컬 설정**으로 처리했습니다.

---

### 11.4 커밋 생성

첫 커밋을 만들었습니다.

```bash
git commit -m "Create stock portfolio PWA"
```

이후 GitHub 계정을 `eclee0825` 기준으로 맞추기 위해 커밋 작성자를 수정했습니다.

```bash
git commit --amend --reset-author --no-edit
```

최종 커밋:

```text
Create stock portfolio PWA
```

---

## 12. GitHub 원격 저장소 연결

사용할 GitHub 저장소는 다음으로 결정했습니다.

```text
https://github.com/eclee0825/chang
```

원격 저장소를 연결했습니다.

```bash
git remote add origin https://github.com/eclee0825/chang.git
```

브랜치 이름은 `main`으로 변경했습니다.

```bash
git branch -M main
```

---

## 13. GitHub push 중 발생한 인증 문제

처음 push를 시도했을 때 다음 오류가 발생했습니다.

```text
remote: Permission to eclee0825/chang.git denied to myungmee.
fatal: unable to access 'https://github.com/eclee0825/chang.git/': The requested URL returned error: 403
```

의미:

```text
현재 PC에 저장된 GitHub 인증 계정이 myungmee였고,
myungmee 계정은 eclee0825/chang 저장소에 push 권한이 없었다.
```

해결 방법:

1. Windows 자격 증명 관리자 실행
2. Windows 자격 증명 선택
3. `github.com` 또는 `git:https://github.com` 관련 항목 삭제
4. 다시 push 실행
5. GitHub 로그인 창에서 `eclee0825` 계정으로 로그인

---

## 14. GitHub push 성공

자격 증명을 삭제한 뒤 다시 push를 실행했습니다.

```bash
git push -u origin main
```

성공 결과:

```text
To https://github.com/eclee0825/chang.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
```

이제 로컬 `main` 브랜치는 GitHub의 `origin/main`을 추적합니다.

GitHub 저장소:

```text
https://github.com/eclee0825/chang
```

---

## 15. Vercel 배포 준비

GitHub push가 성공한 뒤 Vercel import 화면으로 이동했습니다.

현재 열린 Vercel URL:

```text
https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Feclee0825%2Fchang
```

Vercel 화면 제목:

```text
New Project – Vercel
```

즉, GitHub 저장소를 Vercel 프로젝트로 가져올 수 있는 상태까지 도달했습니다.

---

## 16. Vercel에서 해야 할 작업

이제 Vercel 화면에서 다음 순서로 진행하면 됩니다.

```text
New Project 화면
→ GitHub 저장소 eclee0825/chang 선택
→ Framework Preset 확인
→ Deploy 클릭
```

Vite 프로젝트이므로 일반적으로 Vercel이 자동으로 설정을 잡습니다.

확인할 설정:

| 항목 | 값 |
|---|---|
| Framework Preset | Vite |
| Build Command | npm run build |
| Output Directory | dist |
| Install Command | npm install |

배포가 성공하면 다음과 같은 URL이 생성됩니다.

```text
https://프로젝트이름.vercel.app
```

---

## 17. 아이폰에서 앱처럼 설치하는 방법

아이폰에서는 앱을 파일처럼 다운로드하는 것이 아니라, Safari에서 **홈 화면에 추가**합니다.

Vercel 배포 URL이 생긴 뒤 다음 순서로 진행합니다.

### 17.1 Safari에서 접속

아이폰에서 Safari를 열고 Vercel 배포 URL로 접속합니다.

예시:

```text
https://프로젝트이름.vercel.app
```

주의:

```text
http://127.0.0.1:5173/
```

이 주소는 내 컴퓨터 안에서만 동작하는 로컬 주소라 아이폰에서 사용할 수 없습니다.

아이폰에서는 반드시 Vercel 배포 URL로 접속해야 합니다.

---

### 17.2 홈 화면에 추가

Safari에서 다음 순서로 진행합니다.

```text
공유 버튼
→ 홈 화면에 추가
→ 이름 확인
→ 추가
```

그러면 아이폰 홈 화면에 `StockLab` 또는 `MyStock Lab` 아이콘이 생깁니다.

---

### 17.3 앱처럼 실행

홈 화면에 생긴 아이콘을 누르면 앱이 실행됩니다.

현재 PWA manifest에 다음 설정이 들어가 있습니다.

```json
"display": "standalone"
```

따라서 Safari 주소창 없이 앱처럼 열릴 수 있습니다.

---

## 18. 지금까지 발생한 주요 이슈와 해결

| 문제 | 원인 | 해결 |
|---|---|---|
| `npm` 실행 실패 | PowerShell 실행 정책 때문에 `npm.ps1` 차단 | `npm.cmd` 사용 |
| 첫 커밋 실패 | Git user.name, user.email 미설정 | 저장소 로컬 Git config 설정 |
| GitHub push 403 | PC 인증 계정이 `myungmee`로 되어 있음 | Windows 자격 증명 삭제 후 `eclee0825`로 재로그인 |
| 국내 주식 API 직접 연동 보류 | 앱 시크릿/OAuth 필요 | 데모 데이터로 구현 |
| 아이폰에서 localhost 접속 불가 | `127.0.0.1`은 PC 내부 주소 | Vercel 배포 URL 사용 |

---

## 19. 현재 남은 작업

남은 작업은 다음과 같습니다.

1. 새로 만든 이 문서 `stock-pwa-full-progress.md`를 Git에 추가하고 push
2. Vercel에서 GitHub 저장소 import
3. Deploy 실행
4. 배포 URL 확인
5. 아이폰 Safari에서 배포 URL 접속
6. 홈 화면에 추가
7. 앱 아이콘 실행 확인

---

## 20. 강의 자료로 사용할 때 설명 흐름

이 실습은 다음 흐름으로 설명하면 좋습니다.

```text
1. 웹앱과 PWA의 차이 설명
2. 주식 앱 아이디어 정의
3. API 선택 기준 설명
4. 미국 주식은 Twelve Data 선택
5. 국내 주식은 보안 문제 때문에 데모 데이터 처리
6. React 앱 구현
7. localStorage로 데이터 저장
8. PWA manifest/service worker 추가
9. GitHub에 업로드
10. Vercel로 배포
11. 아이폰에서 홈 화면에 추가
```

이 흐름은 학부생에게 “내가 만든 웹앱이 실제 스마트폰 앱처럼 보이는 과정”을 보여줄 수 있어서 실습 만족도가 높습니다.

---

## 21. 핵심 정리

이번 작업의 핵심은 다음 한 문장으로 정리할 수 있습니다.

```text
바이브 코딩으로 주식 웹앱을 만들고, PWA 설정과 Vercel 배포를 통해 아이폰 홈 화면에서 앱처럼 실행할 수 있게 준비했다.
```

현재 GitHub 업로드까지 완료되었고, Vercel 배포 버튼을 누르는 단계까지 도달했습니다.

다음 단계는 Vercel에서 프로젝트를 배포하고, 생성된 URL을 아이폰 Safari에서 열어 홈 화면에 추가하는 것입니다.
