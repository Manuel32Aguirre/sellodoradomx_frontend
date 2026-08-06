const { api, setSession, renderNav } = window.SelloAPI;

document.addEventListener("DOMContentLoaded", () => {
  renderNav("");
  const form = document.getElementById("register-form");
  const msg = document.getElementById("form-msg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    msg.className = "form-msg";

    const payload = {
      name: document.getElementById("name").value.trim(),
      lastname: document.getElementById("lastname").value.trim(),
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value,
    };

    try {
      const result = await api("/users/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      msg.className = "form-msg ok";
      msg.textContent =
        result.message ||
        "Te enviamos un enlace de confirmación. Revisa tu correo antes de iniciar sesión.";
      form.reset();
      setTimeout(() => {
        window.location.href = `login.html?email=${encodeURIComponent(payload.email)}&pending=1`;
      }, 1800);
    } catch (err) {
      msg.className = "form-msg error";
      msg.textContent = err.message || "No se pudo registrar";
    }
  });
});
