import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

async function askGemini(question: string, context?: string) {
  const apiKey = process.env.GEMINI_API_KEY; // .env에 저장
  if (!apiKey) throw new Error("GEMINI_API_KEY 없음");

  const prompt = [
    { role: "user", parts: [{ text: `${context ?? ""}\n\n사용자 질문: ${question}` }] },
  ];

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: prompt }),
    }
  );

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini 호출 실패: ${t}`);
  }
  const data = await res.json();
  const answer =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ??
    "답변을 생성하지 못했습니다.";
  return answer;
}

export async function action({ request }: ActionFunctionArgs) {
  const { question, inventorySummary } = await request.json();

  try {
    const answer = await askGemini(question, inventorySummary);
    return json({ answer });
  } catch (e: any) {
    return json({ error: e.message ?? "AI 오류" }, { status: 500 });
  }
}
