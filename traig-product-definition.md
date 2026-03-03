# traig — Product Definition

## 한 줄 요약

크립토 자동 트레이딩 웹앱. 연속적(piecewise linear) 레시피 기반, 100% non-custodial, AI 챗봇으로 전략 관리.

---

## 포지셔닝

- traig는 글로벌 제품. Korbital은 traig의 코빗(Korbit) 특화 브랜딩일 뿐.
- 현재 베타 단계. 과거 + Live 데이터 수록 예정.
- 타겟: 개인 트레이더 + 기관/펀드 (B2C + B2B)

---

## 핵심 개념: 레시피 (Recipe)

레시피는 traig의 트레이딩 전략 단위이다.

### 구성 요소
1. **세그먼트(Segment)**: 가격 구간별 행동을 정의하는 piecewise linear 함수. 가격 → allocation(비중) 매핑이 연속적.
2. **액션 타입(Action Type)**:
   - Buy-only: 매수만 실행
   - Sell-only: 매도만 실행
   - Smoothness 적용 후 매매 등
3. **트랜지션(Transition)**: 레시피 간 자동 전환. 조건 충족 시 하나의 레시피에서 다른 레시피로 자동 이동.

### 레시피 vs 그리드 봇

| | 그리드 봇 | traig 레시피 |
|---|---|---|
| 가격-행동 매핑 | 이산적 (계단) — 균등 간격 격자마다 동일한 주문 | 연속적 (경사로) — 가격별 비중이 매끄럽게 변화 |
| 범위 이탈 시 | 아무 행동 없음 | 항상 정의된 행동 존재 |
| 구간별 강도 조절 | 불가 (모든 격자 동일) | 가능 ("여기선 공격적, 여기선 보수적") |
| 전략 전환 | 수동 (봇 중지 → 새 봇 시작) | 자동 트랜지션 (조건 기반) |
| 직관성 | 처음엔 직관적이나 한계 빠르게 체감 | 처음엔 덜 직관적이나 이해도 높아질수록 더 직관적 |
| 느낌 | 기계적, 정적 | 자연스럽고 살아 있는 느낌 |

---

## 핵심 기능

### 1. Automated Rebalancing
- 레시피에 따라 maker 주문으로 자동 리밸런싱
- 초 단위로 동작
- maker-only 실행 → 수수료 최적화 (taker fee 회피)

### 2. AI 챗봇
- 레시피 생성, 수정, 관리를 대화로 수행
- 세그먼트 설정, 액션 타입 변경, 트랜지션 조건 설정 등 모든 동작을 질의로 가능
- API에 넣는 모든 프롬프트를 수정/공개 예정 → 투명성 확보

### 3. Backtesting
- 과거 분봉 데이터로 레시피 성과 시뮬레이션
- maker 주문 기준, OHLC 범위 내 체결 가정 (보수적 하한)

### 4. Market Monitoring (AI 시장 감시자)
- AI 기반 시장 상황 모니터링
- (상세 기능 추후 정의)

### 5. 수수료 Compensation
- 거래 수수료 보상 지원
- (상세 구조 추후 정의)

---

## 아키텍처

### 제품 형태
- **웹앱**

### Non-Custodial 구조
- 사용자가 거래소 API 키를 직접 입력
- traig는 자산을 보관하지 않음
- AI 프롬프트까지 전부 공개 → **100% PURE non-custodial** 달성 목표
  - 사용자가 AI가 뭘 하는지 완전히 검증 가능

### 데이터 인프라
- 분봉 데이터: 독립 collector 앱이 MongoDB에 수집
- 거래소 오픈 시점부터 전체 분봉 보유
- 저장소 최적화 검토 예정 (MongoDB vs 대안)

---

## 거래소 지원

- 현재: 코빗(Korbit) — Korbital 브랜딩
- 글로벌 확장: waitlist에서 원하는 거래소 수집 후 우선순위 정해서 순차 지원 예정
- 예상 후보: Binance, Bybit, OKX, Bitget 등

---

## 타겟 언어

- 영어 (English)
- 한국어 (Korean)
- 베트남어 (Vietnamese)

---

## 경쟁 환경 요약

### 주요 경쟁 제품군
- 그리드 봇 서비스: 3Commas, Pionex, Bitsgap, Cryptohopper
- DCA 봇, 시그널 기반 봇 등

### traig 차별점
1. **연속적 전략**: 그리드의 이산적 한계를 넘은 piecewise linear 매핑
2. **100% non-custodial + 투명성**: AI 프롬프트까지 공개
3. **AI-native**: 전략 관리가 챗봇 기반, 모든 조작이 대화로 가능
4. **자동 트랜지션**: 조건 기반 레시피 전환, 수동 개입 최소화
5. **수수료 compensation**: maker-only + 수수료 보상

---

## 현재 상태

- **Korbital**: 베타 (코빗 특화)
- **traig**: 사이트 구축 단계 (waitlist 수집 예정)
- **Backtest tool**: 스펙 정의 완료, 구현 예정
