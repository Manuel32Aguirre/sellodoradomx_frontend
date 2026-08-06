const { api, setSession, renderNav } = window.SelloAPI;

document.addEventListener("DOMContentLoaded", () => {
  renderNav("");
  const form = document.getElementById("login-form");
  const msg = document.getElementById("form-msg");
  const resendBox = document.getElementById("resend-box");
  const resendBtn = document.getElementById("resend-btn");
  const params = new URLSearchParams(window.location.search);

  if (params.get("verified") === "1") {
    msg.className = "form-msg ok";
    msg.textContent = "Correo confirmado. Ya puedes iniciar sesión.";
  }
  if (params.get("pending") === "1") {
    msg.className = "form-msg ok";
    msg.textContent = "Revisa tu correo y confirma la cuenta antes de entrar.";
    resendBox.hidden = false;
  }
  if (params.get("verifyError")) {
    msg.className = "form-msg error";
    msg.textContent = params.get("verifyError");
    resendBox.hidden = false;
  }
  if (params.get("email")) {
    document.getElementById("email").value = params.get("email");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    msg.className = "form-msg";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const auth = await api("/users/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(auth);
      msg.className = "form-msg ok";
      const role = auth.user?.roleName || "";
      msg.textContent = "¡Bienvenido!";
      setTimeout(() => {
        if (role === "ROLE_ADMIN") window.location.href = "admin.html";
        else if (role === "ROLE_MERCHANT") window.location.href = "merchant.html";
        else window.location.href = "index.html";
      }, 400);
    } catch (err) {
      msg.className = "form-msg error";
      msg.textContent = err.message || "No se pudo iniciar sesión";
      if (err.status === 403 || /confirma/i.test(err.message || "")) {
        resendBox.hidden = false;
      }
    }
  });

  resendBtn?.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    if (!email) {
      msg.className = "form-msg error";
      msg.textContent = "Escribe tu correo para reenviar la confirmación.";
      return;
    }
    try {
      const result = await api("/users/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      msg.className = "form-msg ok";
      msg.textContent = result.message || "Si la cuenta existe, enviamos un nuevo enlace.";
    } catch (err) {
      msg.className = "form-msg error";
      msg.textContent = err.message;
    }
  });
});
