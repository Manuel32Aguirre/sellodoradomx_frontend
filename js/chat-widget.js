class ChatWidget {
  constructor(businessId) {
    this.businessId = businessId;
    this.open = false;
    this.mount();
  }

  mount() {
    const existing = document.getElementById("chat-widget-container");
    if (existing) existing.remove();

    const root = document.createElement("div");
    root.id = "chat-widget-container";
    root.innerHTML = `
      <div class="chat-panel" id="chat-panel">
        <div class="chat-header">
          <strong>Asistente del local</strong>
          <button type="button" class="chat-close" id="chat-close" aria-label="Cerrar">×</button>
        </div>
        <div class="chat-messages" id="chat-messages"></div>
        <form class="chat-input-row" id="chat-form">
          <input id="chat-input" type="text" placeholder="Escribe tu pregunta..." autocomplete="off" required />
          <button type="submit">Enviar</button>
        </form>
      </div>
      <button type="button" class="chat-bubble" id="chat-toggle" aria-label="Abrir chat">💬</button>
    `;
    document.body.appendChild(root);

    this.panel = root.querySelector("#chat-panel");
    this.messages = root.querySelector("#chat-messages");

    root.querySelector("#chat-toggle").addEventListener("click", () => this.toggle());
    root.querySelector("#chat-close").addEventListener("click", () => this.toggle(false));
    root.querySelector("#chat-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.send();
    });

    this.push("bot", "¡Hola! Pregúntame por horario, precios o información del negocio.");
  }

  toggle(force) {
    this.open = typeof force === "boolean" ? force : !this.open;
    this.panel.classList.toggle("open", this.open);
  }

  push(role, text) {
    const div = document.createElement("div");
    div.className = `msg ${role}`;
    div.textContent = text;
    this.messages.appendChild(div);
    this.messages.scrollTop = this.messages.scrollHeight;
  }

  async send() {
    const input = document.getElementById("chat-input");
    const message = input.value.trim();
    if (!message) return;

    this.push("user", message);
    input.value = "";

    try {
      const data = await window.SelloAPI.api("/chat/send", {
        method: "POST",
        body: JSON.stringify({ businessId: this.businessId, message }),
      });
      this.push("bot", data.botResponse || "No tengo respuesta ahora.");
    } catch (err) {
      this.push("bot", `Error: ${err.message}`);
    }
  }
}

window.initChatWidget = function initChatWidget(businessId) {
  return new ChatWidget(businessId);
};
