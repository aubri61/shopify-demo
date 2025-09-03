// app/routes/app._index.tsx
import { Link } from "@remix-run/react";
import { useState } from "react";
import styles from "./_index/styles.module.css"; // CSS Module (links() 불필요)

export default function Index() {
  const [question, setQuestion] = useState("다음 주 보드 재고가 부족할까요?");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function askAI() {
    setLoading(true);
    setAnswer(null);
    try {
      const shop = (window as any)?.Shopify?.shop as string | undefined;
      const url = shop ? `https://${shop}/apps/ai-chat` : "/apps/ai-chat";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = res.ok ? await res.json() : null;
      setAnswer(data?.answer ?? "답변을 생성하지 못했어요.");
    } catch {
      setAnswer(
        "데모 응답: 최근 4주 판매 추세 기준 다음 주 ‘Hydrogen’ 모델이 소진 예상입니다. 3일 내 25개 추가 발주를 추천해요."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.container}>
      <header className={styles.hero}>
        <span className={styles.badge}>Inventoria AI</span>
        <h1>AI로 재고 결정을 더 빠르고, 더 정확하게</h1>
        <p className={styles.subtitle}>
          판매 추세를 학습해 <b>수요 예측</b>, <b>소진 경보</b>, <b>자동 발주 제안</b>까지. 운영자는 제품에만 집중하세요.
        </p>

        {/* 바로가기 3종 */}
        <div className={styles.ctaRow}>
          <Link className={`${styles.btn} ${styles.primary}`} to="/app/products">상품 페이지</Link>
          <Link className={`${styles.btn} ${styles.ghost}`} to="/app/dashboard">대시보드</Link>
          <Link className={`${styles.btn} ${styles.secondary}`} to="/app/chatbot">AI 도우미</Link>
        </div>

        {/* 인덱스 페이지에서도 바로 데모 질문 */}
        <div className={styles.quickAsk}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="예) ‘Hydrogen’ 보드 S 사이즈, 다음 주 발주량 추천해줘"
          />
          <button className={`${styles.btn} ${styles.primary}`} onClick={askAI} disabled={loading}>
            {loading ? "분석 중..." : "질문 보내기"}
          </button>
        </div>

        {answer && (
          <div className={styles.answer}>
            <div className={styles.answerTitle}>AI 응답</div>
            <p>{answer}</p>
          </div>
        )}
      </header>

      <section className={styles.grid}>
        <article className={styles.card}>
          <h3>실시간 재고 인사이트</h3>
          <p>SKU/옵션 단위 소진 속도, 안전재고 이탈을 실시간으로 집계합니다.</p>
          <ul>
            <li>안전재고 하회 시 즉시 알림</li>
            <li>채널·국가·옵션별 뎁스 분석</li>
          </ul>
        </article>

        <article className={styles.card}>
          <h3>AI 수요 예측</h3>
          <p>시즌성·프로모션·트렌드를 반영한 주간/월간 수요를 예측합니다.</p>
          <ul>
            <li>예측 오차 자동 보정</li>
            <li>품절/과잉재고 비용 최소화</li>
          </ul>
        </article>

        <article className={styles.card}>
          <h3>자동 발주 추천</h3>
          <p>리드타임·MOQ를 고려해 최적 발주량을 제안합니다.</p>
          <ul>
            <li>상품/벤더별 리드타임 모델링</li>
            <li>Webhook으로 ERP/구글시트 연동</li>
          </ul>
        </article>
      </section>

      <footer className={styles.footer}>
        © {new Date().getFullYear()} Inventoria AI · 재고 인텔리전스 플랫폼
      </footer>
    </main>
  );
}
