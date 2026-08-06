const {
  api,
  apiForm,
  renderNav,
  requireAuth,
  getUser,
  isAdmin,
  isMerchant,
  escapeHtml,
  statusBadge,
} = window.SelloAPI;

async function loadStatus() {
  const user = getUser();
  const panel = document.getElementById("status-panel");
  const formPanel = document.getElementById("form-panel");

  if (isAdmin()) {
    panel.innerHTML = `<p class="meta">Los administradores no solicitan perfil de comercio.</p>`;
    formPanel.hidden = true;
    return;
  }

  if (isMerchant()) {
    panel.innerHTML = `<p class="form-msg ok">Ya eres comercio aprobado. Ve a <a href="merchant.html">Mis negocios</a>.</p>`;
    formPanel.hidden = true;
    return;
  }

  try {
    const profile = await api(`/users/${user.id}/merchant-profile`);
    panel.innerHTML = `
      <p>Estado: ${statusBadge(profile.status)}</p>
      ${profile.rejectionReason ? `<p class="meta">Motivo: ${escapeHtml(profile.rejectionReason)}</p>` : ""}
      ${
        profile.status === "REJECTED"
          ? `<button type="button" class="btn btn-ghost btn-sm" id="retry-btn">Borrar solicitud y reintentar</button>`
          : ""
      }
      ${profile.status === "PENDING" ? `<p class="meta">Tu solicitud está en revisión.</p>` : ""}
    `;
    formPanel.hidden = profile.status === "PENDING" || profile.status === "APPROVED";

    document.getElementById("retry-btn")?.addEventListener("click", async () => {
      try {
        await api("/users/merchant-profiles/retry", { method: "DELETE" });
        location.reload();
      } catch (err) {
        alert(err.message);
      }
    });
  } catch (err) {
    if (err.status === 404 || /no encontr/i.test(err.message)) {
      panel.innerHTML = `<p class="meta">Aún no tienes solicitud. Completa el formulario.</p>`;
      formPanel.hidden = false;
    } else {
      panel.innerHTML = `<p class="form-msg error">${escapeHtml(err.message)}</p>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAuth()) return;
  renderNav("apply");
  await loadStatus();

  document.getElementById("apply-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("form-msg");
    const fd = new FormData();
    fd.append("curp", document.getElementById("curp").value.trim().toUpperCase());
    fd.append("phone", document.getElementById("phone").value.trim());
    fd.append("identificationImage", document.getElementById("id-image").files[0]);
    fd.append("addressProofImage", document.getElementById("address-image").files[0]);

    try {
      await apiForm("/users/merchant-profiles", fd, "POST");
      msg.className = "form-msg ok";
      msg.textContent = "Solicitud enviada. Espera la revisión del admin.";
      await loadStatus();
    } catch (err) {
      msg.className = "form-msg error";
      msg.textContent = err.message;
    }
  });
});
