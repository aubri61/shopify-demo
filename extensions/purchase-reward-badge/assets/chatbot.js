"use strict";(()=>{var o=document.getElementById("ai-chatbot-root");if(o){let d=o.getAttribute("data-welcome")||"\uBB34\uC5C7\uC774\uB4E0 \uBB3C\uC5B4\uBCF4\uC138\uC694 \u{1F60A}";o.innerHTML=`
    <div style="position:fixed;bottom:20px;right:20px;width:320px;max-height:420px;
                background:#fff;border:1px solid #e5e7eb;border-radius:12px;
                box-shadow:0 6px 20px rgba(0,0,0,.15);display:flex;flex-direction:column;
                font-family:system-ui;z-index:9999;overflow:hidden">
      <div style="background:#111827;color:#fff;padding:10px 12px;font-weight:600">AI Chatbot</div>
      <div id="msgs" style="flex:1;padding:10px;overflow:auto;font-size:14px"></div>
      <form id="f" style="display:flex;border-top:1px solid #eee">
        <input id="q" placeholder="${d}" style="flex:1;border:none;padding:10px;font-size:14px" />
        <button style="background:#111827;color:#fff;border:none;padding:0 12px;cursor:pointer">Send</button>
      </form>
    </div>
  `;let n=o.querySelector("#msgs"),l=o.querySelector("#f"),r=o.querySelector("#q"),s=(i,t)=>{let e=document.createElement("div");e.textContent=i,e.style.margin="6px 0",e.style.textAlign=t==="user"?"right":"left",e.style.color=t==="user"?"#2563eb":"#111827",n.appendChild(e),n.scrollTop=n.scrollHeight};l.addEventListener("submit",async i=>{i.preventDefault();let t=r.value.trim();if(t){s(t,"user"),r.value="",s("\uC0DD\uAC01 \uC911...","bot");try{let e=await fetch("/apps/ai-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:t})}),{answer:a}=await e.json();n.lastChild.textContent=a||"\uB2F5\uBCC0\uC774 \uC5C6\uC5B4\uC694."}catch(e){n.lastChild.textContent="\u26A0\uFE0F \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC5B4\uC694."}}})}})();
