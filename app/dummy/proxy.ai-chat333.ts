// app/routes/proxy.ai-chat.ts
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";

/**
 * POST /proxy/ai-chat  (App Proxy가 /apps/<app-handle>/ai-chat → 여기로 프록시)
 * Body: { question: string }
 * Env:  GEMINI_API_KEY=...
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    const { question } = await request.json().catch(() => ({} as any));
    if (!question || typeof question !== "string") {
      return Response.json({ answer: "질문이 비어 있어요." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { answer: "서버 환경변수 GEMINI_API_KEY가 설정되지 않았습니다." },
        { status: 500 },
      );
    }

    // Gemini 1.5 Flash (저비용/빠름, 무료 쿼터 존재)
    const endpoint =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" +
      encodeURIComponent(apiKey);

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "너는 Shopify 쇼핑 도우미야. 간결하고 친절하게 답해.\n\n" +
                `사용자 질문: ${question}`,
            },
          ],
        },
      ],
    };

    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const errTxt = await r.text();
      return Response.json(
        { answer: `Gemini 호출 실패: ${errTxt.slice(0, 300)}` },
        { status: 502 },
      );
    }

    const data = (await r.json()) as any;
    const answer =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "답변 생성에 실패했어요.";

    return Response.json({ answer });
  } catch (e) {
    return Response.json({ answer: "서버 오류가 발생했어요." }, { status: 500 });
  }
}

/** (선택) App Proxy 헬스체크/개발 확인용 */
export async function loader({}: LoaderFunctionArgs) {
  return Response.json({ ok: true });
}
