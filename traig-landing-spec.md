# traig — Landing Page Spec

## Overview

traig는 Korbital의 해외(글로벌) 버전이다. 크립토 트레이딩 자동화 제품으로, 개인 트레이더와 기관 투자자 모두를 타겟으로 한다. 현재 단계에서는 제품 소개 + waitlist 수집이 목적이다.

---

## Tech Stack

| 항목 | 선택 | 비고 |
|------|------|------|
| Framework | HTML + Tailwind CSS (CDN) | 순수 정적, 빌드 불필요 |
| 배포 | GitHub Pages | 무료, 간단 |
| 스타일링 | Tailwind CSS (CDN) | 다크 테마 기본 |
| Waitlist 폼 | Tally (embed) | 무료, 깔끔, 임베드 용이 |
| 애니메이션 | CSS transitions | 최소한으로 사용, 별도 라이브러리 불필요 |

---

## Brand Guide

### Tone
- **테크/미니멀**: 깔끔하고 군더더기 없는 인상
- 신뢰감 + 전문성. 과장된 마케팅 문구 지양
- 타겟이 개인+기관 모두이므로, 너무 캐주얼하지 않게

### Color Palette (Dark Theme)

| 용도 | Color | Hex |
|------|-------|-----|
| Background (primary) | Near Black | `#0A0A0F` |
| Background (secondary) | Dark Gray | `#14141B` |
| Surface / Card | Charcoal | `#1C1C26` |
| Text (primary) | White | `#F0F0F5` |
| Text (secondary) | Light Gray | `#8A8A9A` |
| Accent (primary) | Electric Blue | `#3B82F6` |
| Accent (hover) | Light Blue | `#60A5FA` |
| Accent (success/CTA) | Emerald | `#10B981` |
| Border | Subtle Gray | `#2A2A36` |

### Typography
- 헤딩: `Inter` 또는 `Geist` (sans-serif, geometric)
- 본문: `Inter`
- 모노스페이스 (숫자/데이터): `JetBrains Mono` 또는 `Geist Mono`
- 큰 제목: font-weight 700, 작은 텍스트: 400

### Logo
- 텍스트 로고: "traig" (소문자)
- 폰트: Geist 또는 Inter Bold
- 필요 시 심볼: 추후 결정. 일단 워드마크만으로 진행

---

## Page Structure

### 1. Hero Section
- **Headline**: 제품의 핵심 가치를 한 줄로 (예: "Automate your crypto trading strategy")
- **Subheadline**: 1~2줄 부연 설명
- **CTA 버튼**: "Join the Waitlist" → 폼 섹션으로 스크롤
- **Hero Screenshot**: 제품 메인 화면 스크린샷 1장 (placeholder로 빈 영역 확보)
- 배경: 다크 + 미니멀한 그래디언트 또는 미묘한 그리드 패턴

### 2. Features Section
- 3~4개 핵심 기능 카드:
  1. **Continuous Strategy** — 연속적 piecewise linear 레시피. 그리드 봇의 계단식 한계를 넘은 자연스러운 매매.
  2. **AI-Powered Management** — 챗봇으로 레시피 생성·수정·트랜지션 관리. 대화만으로 전략 운용.
  3. **Backtesting** — 과거 데이터로 전략 검증. 배포 전에 확인.
  4. **100% Non-Custodial** — API 키 직접 입력, AI 프롬프트 전부 공개. 완전한 투명성.
- 각 카드: 아이콘 + 제목 + 1줄 설명 + **스크린샷 슬롯** (해당 기능의 실제 UI 캡처)
- 간결하게. 장황한 설명 없이.

### 2-1. Screenshot Gallery / Product Tour Section
- Features 아래 또는 사이사이에 **풀폭 스크린샷 쇼케이스** 영역
- 레이아웃 옵션:
  - 좌 텍스트 + 우 스크린샷 (교대 배치)
  - 또는 중앙 정렬 큰 스크린샷 + 아래 캡션
- 이미지에 다크 배경 + 미묘한 그림자/보더로 프레임 처리
- **Placeholder 구현**: 실제 이미지 들어가기 전까지 회색 박스 + "Screenshot coming soon" 텍스트
- 이미지 경로: `/images/screenshots/` 디렉토리에 정리

### Screenshot 가이드
- 파일 형식: PNG (투명 배경 불필요, 크롬 캡처 그대로)
- 권장 해상도: 가로 1920px 이상 (Retina 대응)
- 네이밍 규칙: `hero-main.png`, `feature-rebalancing.png`, `feature-backtest.png`, `feature-monitoring.png`, `feature-execution.png`, `gallery-01.png` ...
- `/images/screenshots/` 폴더에 저장

### 3. How It Works (선택)
- 간단한 3-step 다이어그램 또는 flow
  1. Connect your exchange (API key)
  2. Create a recipe with AI
  3. Deploy & monitor
- 있으면 좋지만 v1에서는 생략 가능

### 3-1. Grid Bot vs traig (비교 섹션)
- 좌우 비교 레이아웃 또는 테이블
- 그리드 = 계단(이산적), traig = 경사로(연속적) 시각적으로 표현
- 비교 포인트:
  - 가격-행동 매핑: 이산 vs 연속
  - 범위 이탈: 무반응 vs 항상 정의된 행동
  - 전략 전환: 수동 vs 자동 트랜지션
  - 관리 방식: 파라미터 입력 vs AI 대화
- 간단한 차트/일러스트: 계단 함수 vs 부드러운 곡선 그래프
- **스크린샷 슬롯**: 실제 레시피 편집 화면 캡처 자리

### 4. Target Audience Section
- 두 타겟 명시:
  - **Individual Traders**: "Stop watching charts 24/7"
  - **Institutions & Funds**: "Systematic execution at scale"
- 각각 1~2줄 설명

### 5. Waitlist Form Section
- Tally 폼 임베드
- 배경 약간 다르게 (surface color) 해서 구분
- 섹션 타이틀: "Get Early Access" 또는 "Join the Waitlist"

### 6. Footer
- © traig 2026
- 소셜 링크 (있으면)
- 간단한 내비게이션 링크

---

## Waitlist Form Fields (Tally)

| 필드 | 타입 | 필수 | 비고 |
|------|------|------|------|
| Email | email | ✅ | |
| Name | text | ✅ | |
| Role | select | ✅ | Individual Trader / Institution / Fund / Other |
| Current Exchange(s) | multi-select / checkbox | ❌ | Binance, Bybit, OKX, Upbit, Bitget, Other |
| Interested Features | multi-select / checkbox | ❌ | Automated Trading, Backtesting, Market Monitoring, Portfolio Analytics, API Access |
| AUM Range | select | ❌ | < $10K / $10K–$100K / $100K–$1M / $1M–$10M / $10M+ / Prefer not to say |
| Anything else? | textarea | ❌ | 자유 입력 (선택) |

---

## i18n (다국어)

- 지원 언어: English, 한국어, Tiếng Việt
- 구현 방식: 정적 사이트이므로 `/en/`, `/ko/`, `/vi/` 디렉토리 또는 `index.html`, `ko.html`, `vi.html` 파일 분리
- 언어 선택: 헤더에 언어 스위처 (EN / KO / VI)
- 기본 언어: English

---

## SEO & Meta

```
title: traig — Automated Crypto Trading
description: Systematic crypto trading for individuals and institutions. Join the waitlist for early access.
og:image: (추후 제작)
```

---

## Deployment

- Repository: GitHub (public — GitHub Pages free tier 조건)
- Hosting: GitHub Pages
- Domain: traig.io 또는 traig.com (확보 상태 확인 필요, 커스텀 도메인 연결 가능)
- Analytics: Plausible 또는 Google Analytics

---

## TODO

- [ ] 도메인 확보 확인
- [ ] Tally 폼 생성
- [ ] Hero 카피 확정 (한/영 둘 다? 영어 only?)
- [ ] OG 이미지 제작
- [ ] GitHub repo 생성 + GitHub Pages 활성화
- [ ] 페이지 구현
- [ ] 마케팅 채널 결정 (Twitter/X, Product Hunt, Discord 등)
