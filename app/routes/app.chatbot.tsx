import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import shopify from "../shopify.server";

type LoaderData = {
  shop: string;
  lowStockSummary: string;
};

export const meta: MetaFunction = () => [{ title: "AI 도우미 · 재고 Q&A" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await shopify.authenticate.admin(request);

  // 기본값
  let lowStockSummary = "인벤토리 조회 실패(권한/데이터 없음).";

  try {
    const query = `#graphql
      {
        productVariants(first: 50, query: "inventory_quantity:<10") {
          nodes {
            id
            title
            sku
            inventoryQuantity
            product { title }
          }
        }
      }
    `;

    const resp = await admin.graphql(query);
    const data = await resp.json();

    const nodes: Array<{
      title: string;
      sku: string | null;
      inventoryQuantity: number | null;
      product: { title: string };
    }> = data?.data?.productVariants?.nodes ?? [];

    if (nodes.length > 0) {
      const lines = nodes.map((v) => {
        const qty = v.inventoryQuantity ?? 0;
        const sku = v.sku || "-";
        return `- ${v.product.title} / ${v.title} (SKU ${sku}) : ${qty}개`;
      });
      lowStockSummary = `저재고 항목(${nodes.length}개)\n` + lines.join("\n");
    } else {
      lowStockSummary = "저재고 항목이 없습니다.";
    }
  } catch (e) {
    lowStockSummary = "인벤토리 조회 실패(권한/데이터 없음).";
  }

  return json<LoaderData>({
    shop: session.shop,
    lowStockSummary,
  });
}

export default function ChatbotPage() {
  const { shop, lowStockSummary } = useLoaderData<typeof loader>();
  const [question, setQuestion] = useState(
    "재고 요약을 참고해서 이번 주 발주량 추천해줘.",
  );
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function askAI() {
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          inventorySummary: lowStockSummary,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAnswer(data?.answer ?? "답변을 생성하지 못했어요.");
    } catch (e) {
      setAnswer("답변을 생성하지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        AI 도우미
      </h2>
      <p style={{ color: "#6b7280", marginBottom: 16 }}>
        아래는 현재 스토어에서 감지한 <b>저재고(10개 미만)</b> 요약입니다.
      </p>

      <div
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 12,
          whiteSpace: "pre-wrap",
          marginBottom: 20,
        }}
      >
        {lowStockSummary}
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "stretch",
          marginBottom: 14,
        }}
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{
            flex: 1,
            minHeight: 120,
            fontSize: 14,
            padding: 12,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
          }}
          placeholder="예) Hydrogen / S 사이즈 기준, 다음 주 발주량을 추천해줘"
        />
        <button
          onClick={askAI}
          disabled={loading}
          style={{
            width: 160,
            background: "#111827",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            padding: "0 16px",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "분석 중..." : "질문 보내기"}
        </button>
      </div>

      <section
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>AI 응답</div>
        <div style={{ color: "#111827", whiteSpace: "pre-wrap" }}>
          {answer ?? "아직 응답이 없습니다."}
        </div>
      </section>
    </main>
  );
}
