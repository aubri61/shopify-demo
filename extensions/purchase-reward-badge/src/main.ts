const root = document.getElementById("ai-chatbot-root");
if (root) {
  const welcome = root.getAttribute("data-welcome") || "무엇이든 물어보세요 😊";

  root.innerHTML = `
    <div style="position:fixed;bottom:50px;right:20px;width:320px;max-height:500px;
                background:#fff;border:1px solid #e5e7eb;border-radius:12px;
                box-shadow:0 6px 20px rgba(0,0,0,.15);display:flex;flex-direction:column;
                font-family:system-ui;z-index:9999;overflow:hidden">
      <div style="background:#111827;color:#fff;padding:10px 12px;font-weight:600">AI Chatbot</div>
      <div id="msgs" style="flex:1;min-height:300px;padding:10px;overflow:auto;font-size:14px"></div>
      <form id="f" style="display:flex;border-top:1px solid #eee">
              <input id="q" placeholder="${welcome}"
             style="flex:1;border:0;padding:10px;font-size:14px;outline:0;box-shadow:none;-webkit-appearance:none;appearance:none;" />
        <button style="background:#111827;color:#fff;border:none;padding:0 12px;cursor:pointer">Send</button>
        
      </form>
    </div>
  `;

  const msgs = root.querySelector<HTMLDivElement>("#msgs")!;
  const form = root.querySelector<HTMLFormElement>("#f")!;
  const input = root.querySelector<HTMLInputElement>("#q")!;

  const add = (t: string, who: "user" | "bot") => {
    const d = document.createElement("div");
    d.textContent = t;
    d.style.margin = "6px 0";
    d.style.textAlign = who === "user" ? "right" : "left";
    d.style.color = who === "user" ? "#2563eb" : "#111827";
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    add(question, "user");
    input.value = "";
    add("생각 중...", "bot");

    try {
      // const res = await fetch("/apps/consumer-chat", {
      const res = await fetch("/apps/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const { answer } = await res.json();
      msgs.lastChild!.textContent = answer || "답변이 없어요.";
    } catch {
      msgs.lastChild!.textContent = "⚠️ 오류가 발생했어요.";
    }
  });
}
