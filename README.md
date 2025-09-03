# 🛒 Inventoria AI — Shopify AI App, Extension (Toy Project)

Shopify App/Theme Extension 구조를 이해하고, 실제로 **App Proxy와 Theme Extension**을 활용해  
기본적인 **재고 조회 + AI 발주 추천 챗봇**을 시도한 토이 프로젝트입니다.  

---

## ✨ 구현한 기능
- **Shopify App Proxy 사용**
  - `/apps/ai-chat` 엔드포인트를 만들어 기본적인 프록시 요청 처리
  - 프론트엔드에서 API 요청 → Proxy → 백엔드로 전달되는 흐름 학습

- **Theme App Extension**
  - 상점에 챗봇 위젯을 임베드(App Embed)로 삽입
  - Liquid 블록과 JS 번들링을 통해 간단한 인터랙션 구현

- **Inventory API 실험**
  - Shopify Admin API의 인벤토리 요약(summary) 조회 시도
  - Admin GraphQL API와 연결 흐름 확인

- **AI 연동 데모 챗봇**
  - Gemini API를 연결해 간단한 질의응답 챗봇 형태 구현
  - 테스트 재고 데이터와 연동 UX 프로토타입 확인

---

## 🛠️ 기술 스택
- **Frontend:** React, Remix (Shopify App Template 기반), Polaris UI
- **Extension:** Liquid, App Embed Block, JS 번들링 (esbuild)
- **Backend:** App Proxy (Node.js/Remix 기본 서버)

---

## 📌 프로젝트 의의
- Shopify 앱 생태계(Embedded App, Theme Extension, App Proxy)의 **전체 흐름**을 처음부터 직접 경험, 구조 이해
- **토이 프로젝트 수준**이지만, 실제 Shopify Dev Store에서 동작하는 **AI 챗봇 위젯** 구현  
- 단순히 React만 다루는 게 아니라, Shopify 특유의 **Admin API / App Proxy / Liquid**까지 다뤄봄  

---

## 💡 배운 점
- Shopify 앱은 단순한 프론트엔드 SPA가 아니라, **스토어(Admin)와 상점(Storefront) 양쪽에 확장 포인트**가 있다는 점을 이해  
- App Proxy, GraphQL Admin API, Polaris UI 등 Shopify 생태계의 주요 개념을 실습  
- 향후에는 **실제 재고 데이터와 AI 분석을 완전히 연동**하는 방향으로 확장 가능성을 확인
- 전반적인 흐름과 개발 실습을 통해 실제 현업에서도 빠르게 적용하고 개발 가능
