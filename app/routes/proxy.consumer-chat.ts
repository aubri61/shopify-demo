// app/routes/proxy.consumer-chat.ts
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import shopify from "../shopify.server";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const API_VERSION = "2025-01";

function j(data: any, init?: number | ResponseInit) {
  const base: ResponseInit =
    typeof init === "number" ? { status: init, headers: {} } : (init ?? {});
  return json(data, { ...base, headers: { ...(base.headers as any), ...CORS } });
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method === "OPTIONS") return j({ ok: true }, 200);
  return j({ ok: false, message: "Use POST" }, 405);
}

/* Admin 호출 */
async function adminGQL<T = any>(
  shop: string,
  token: string,
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  const r = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!r.ok) throw new Error(`GQL ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

// 1) 저재고(예: 10개 미만)
async function getLowStockSummary(shop: string, token: string) {
  const q = `
    {
      productVariants(first: 50, query: "inventory_quantity:<10 AND status:ACTIVE") {
        nodes {
          id
          title
          sku
          inventoryQuantity
          product { id title handle featuredImage { url } }
          price
          compareAtPrice
        }
      }
    }
  `;
  try {
    const data: any = await adminGQL(shop, token, q);
    const nodes = data?.data?.productVariants?.nodes ?? [];
    if (!nodes.length) return "저재고 항목: 없음.";
    const lines = nodes.map((v: any) => {
      const qty = v.inventoryQuantity ?? 0;
      const disc =
        v.compareAtPrice && v.price
          ? Math.max(0, Math.round((1 - Number(v.price) / Number(v.compareAtPrice)) * 100))
          : 0;
      return `- ${v.product.title} / ${v.title} (SKU:${v.sku || "-"}) 재고 ${qty}개${
        disc ? `, 세일 ${disc}%` : ""
      }`;
    });
    return `저재고 항목(${nodes.length}개)\n${lines.join("\n")}`;
  } catch {
    return "저재고 조회 실패(권한/데이터 없음).";
  }
}

// 2) 세일 상품들
async function getOnSaleTop(shop: string, token: string, limit = 20) {
  // 제품/변형을 넉넉히 긁어와서 서버에서 필터링
  const q = /* GraphQL */ `
    {
      products(first: 50, query: "status:ACTIVE") {
        nodes {
          id title handle featuredImage { url }
          variants(first: 50) {
            nodes {
              id title sku price compareAtPrice
            }
          }
        }
      }
    }
  `;
  try {
    const data: any = await adminGQL(shop, token, q);
    const prods = data?.data?.products?.nodes ?? [];
    const variants: Array<{
      productTitle: string;
      productHandle: string;
      variantTitle: string;
      sku: string | null;
      price: number;
      compareAtPrice: number;
      discountPct: number;
    }> = [];
    for (const p of prods) {
      for (const v of p.variants?.nodes ?? []) {
        const price = Number(v.price ?? 0);
        const cap = Number(v.compareAtPrice ?? 0);
        if (cap > price && price > 0) {
          variants.push({
            productTitle: p.title,
            productHandle: p.handle,
            variantTitle: v.title,
            sku: v.sku ?? null,
            price,
            compareAtPrice: cap,
            discountPct: Math.round((1 - price / cap) * 100),
          });
        }
      }
    }
    variants.sort((a, b) => b.discountPct - a.discountPct || a.price - b.price);
    const top = variants.slice(0, limit);
    if (!top.length) return "진행 중인 세일 상품: 없음.";
    const lines = top.map(
      (v) =>
        `- ${v.productTitle} / ${v.variantTitle} (SKU:${v.sku || "-"}) 세일 ${v.discountPct}% → ${Math.round(
          v.price
        ).toLocaleString()}원`
    );
    return `세일 TOP${top.length}\n${lines.join("\n")}`;
  } catch {
    return "세일 상품 조회 실패(권한/데이터 없음).";
  }
}

// 위험한 요구 차단
function violatesPolicy(userText: string) {
  const t = userText.toLowerCase();
  if (
    t.includes("주문번호") ||
    t.includes("order number") ||
    t.includes("주소") ||
    t.includes("전화") ||
    t.includes("phone") ||
    t.includes("email") ||
    t.includes("이메일")
  )
    return true;
  return false;
}

// gemini 호출
export async function action({ request }: ActionFunctionArgs) {
  // 0) App Proxy 요청 검증
  await shopify.authenticate.public.appProxy(request);

  // 1) shop & 세션
  const url = new URL(request.url);
  const shop = (url.searchParams.get("shop") ?? "").replace(/^https?:\/\//, "").toLowerCase();
  const offlineId = `offline_${shop}`;
  const sess = await shopify.sessionStorage.loadSession(offlineId);
  if (!sess?.accessToken) return j({ ok: false, message: "No offline token" }, 401);

  // 2) 바디
  let question = "";
  try {
    const body = await request.json();
    question = (body?.question ?? "").toString().slice(0, 2000);
  } catch {}
  if (!question) return j({ ok: true, answer: "궁금한 상품/세일을 물어보세요. 😊" });

  if (violatesPolicy(question)) {
    return j({
      ok: true,
      answer: "개인 주문/주소/연락처 확인은 도와드릴 수 없어요. 상품·세일·재고 관련으로 질문해 주세요!",
    });
  }

  // 3) 컨텍스트 구성
  const [lowStock, onSale] = await Promise.all([
    getLowStockSummary(shop, sess.accessToken),
    getOnSaleTop(shop, sess.accessToken, 20),
  ]);

  const system =
    "너는 이 상점의 소비자 상담 챗봇이야. 전체 톤은 친절하고 간결하게. " +
    "개인정보나 주문번호 확인/조회는 절대 하지 말고, 그런 요청이 오면 고객센터 경로를 안내만 해. " +
    "답변은 먼저 한 줄 결론 → 필요하면 2~4개 bullet 근거. 가격 표기는 KRW 정수로. ";

  const storeContext = [
    "[세일 정보]",
    onSale,
    "",
    "[저재고 참고(빠른 품절 가능)]",
    lowStock,
  ].join("\n");

  const userPrompt = [
    "아래 상점 컨텍스트를 참고해 질문에 답해줘.",
    storeContext,
    "",
    "[질문]",
    question,
  ].join("\n\n");

  // 4) Gemini 호출
  let answer = "";

  try {
    const GEMINI = process.env.GOOGLE_GEMINI_API_KEY;
    if (!GEMINI) throw new Error("No GEMINI key");
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: system }] },
            { role: "user", parts: [{ text: userPrompt }] },
          ],
          safetySettings: [
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          ],
        }),
      }
    );
    const data = await res.json();
    answer = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "답변을 생성하지 못했어요.";
  } catch (e) {
    answer = "지금은 답변을 만들지 못했어요. 잠시 후 다시 시도해 주세요.";
  }

  return j({ ok: true, answer });
}
