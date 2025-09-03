import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import shopify from "../shopify.server"; // ← 여기서 .api를 안 씀

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function j(data: any, init?: number | ResponseInit) {
  const base: ResponseInit =
    typeof init === "number" ? { status: init, headers: {} } : (init ?? {});
  return json(data, {
    ...base,
    headers: { ...(base.headers as any), ...CORS },
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method === "OPTIONS") return j({ ok: true }, 200);
  return j({ ok: false, message: "Use POST" }, 405);
}

/** Admin GraphQL 호출 헬퍼 (.api 없이 직접 호출) */
async function adminGraphQL(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, any>,
  apiVersion = "2025-01", // 사용중인 버전으로 맞추세요
) {
  const resp = await fetch(
    `https://${shop}/admin/api/${apiVersion}/graphql.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    },
  );
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Admin GraphQL ${resp.status}: ${text}`);
  }
  return resp.json();
}

/** 예시: 저재고 요약 */
async function buildLowStockSummary(shop: string, token: string) {
  let lowStockSummary = "인벤토리 조회 실패(권한/데이터 없음).";
  try {
    const query = /* GraphQL */ `
      {
        productVariants(first: 50, query: "inventory_quantity:<10") {
          nodes {
            id
            title
            sku
            inventoryQuantity
            product {
              title
            }
          }
        }
      }
    `;
    const data = await adminGraphQL(shop, token, query);
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
  } catch {
    lowStockSummary = "인벤토리 조회 실패(권한/데이터 없음).";
  }
  return lowStockSummary;
}

export async function action({ request }: ActionFunctionArgs) {
  // 1) App Proxy 서명 검증
  await shopify.authenticate.public.appProxy(request);

  // 2) shop 파라미터 추출
  const url = new URL(request.url);
  const rawShop = url.searchParams.get("shop") ?? "";

  // sanitize가 필요하면 간단히 정규식으로 (api 유틸 없이)
  const shop = rawShop.replace(/^https?:\/\//, "").toLowerCase();

  // 3) 오프라인 세션 로드 (.api/.session 없이)
  const offlineId = `offline_${shop}`; // ← getOfflineId 대체
  const offlineSession = await shopify.sessionStorage.loadSession(offlineId);

  if (!offlineSession?.accessToken) {
    return j({ ok: false, message: "No offline session/access token" }, 401);
  }
  const accessToken = offlineSession.accessToken;

  // 4) 바디 파싱
  let question = "";
  try {
    const body = await request.json();
    question = (body?.question ?? "").toString().slice(0, 2000);
  } catch {}
  if (!question) {
    return j({
      ok: true,
      answer: "질문이 비어있어요. 예) ‘Greenboard 보드 다음 주 발주량?’",
    });
  }

  // 5) 저재고 요약 (GraphQL 직접 호출)
  const lowStockSummary = await buildLowStockSummary(shop, accessToken);

  // 6) LLM 호출 (그대로)
  const system =
    "너는 Shopify 상점의 재고·수요를 도와주는 운영 어시스턴트야. 먼저 한두 줄로 결론을 내고, 필요하면 2개의 bullet 근거를 덧붙여.";
  const userPrompt = [
    lowStockSummary ? `[재고 요약]\n${lowStockSummary}` : "",
    `[질문]\n${question}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  let answer = "";
  try {
    const GEMINI = process.env.GEMINI_API_KEY;

    if (GEMINI) {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
          GEMINI,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: system }] },
              { role: "user", parts: [{ text: userPrompt }] },
            ],
          }),
        },
      );
      const data = await res.json();
      answer =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ??
        "답변을 생성하지 못했어요.";
    } else {
      answer =
        "데모 응답: 최근 4주 판매 추세 기준 ‘Green Snowboard’ 모델이 소진 예상이에요. 3일 내 25개 추가 발주를 추천합니다.";
    }
  } catch {
    answer = "AI 호출 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.";
  }

  return j({ ok: true, shop, answer });
}
