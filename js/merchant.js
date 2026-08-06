const {
  api,
  apiForm,
  renderNav,
  requireAuth,
  getUser,
  isMerchant,
  isAdmin,
  escapeHtml,
  categoryLabel,
  formatMoney,
} = window.SelloAPI;

let myBusinesses = [];
let categories = [];

function showTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  ["list", "create", "products", "qr"].forEach((id) => {
    document.getElementById(`tab-${id}`).hidden = id !== name;
  });
}

async function loadCategories() {
  categories = await api("/business-categories");
  const sel = document.getElementById("b-category");
  sel.innerHTML = categories
    .map((c) => `<option value="${c.id}">${escapeHtml(categoryLabel(c.name))}</option>`)
    .join("");
}

function fillBusinessSelects() {
  const opts = myBusinesses
    .map((b) => `<option value="${b.id}">${escapeHtml(b.name)}</option>`)
    .join("");
  document.getElementById("p-business").innerHTML = opts || `<option value="">Sin negocios</option>`;
  document.getElementById("qr-business").innerHTML = opts || `<option value="">Sin negocios</option>`;
}

async function loadMyBusinesses() {
  const user = getUser();
  const box = document.getElementById("tab-list");
  myBusinesses = await api(`/businesses/user/${user.id}`);
  fillBusinessSelects();

  if (!myBusinesses.length) {
    box.innerHTML = `<p class="meta">Aún no tienes negocios. Crea uno en la pestaña "Nuevo negocio".</p>`;
    return;
  }

  box.innerHTML = `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Nombre</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>
        ${myBusinesses
          .map(
            (b) => `<tr>
            <td><a href="detail.html?id=${b.id}">${escapeHtml(b.name)}</a><div class="meta">${escapeHtml(categoryLabel(b.categoryName))}</div></td>
            <td>${b.verified ? '<span class="badge badge-ok">Verificado</span>' : '<span class="badge">Pendiente</span>'}
              ${b.goldenSealActive ? '<span class="badge">Sello</span>' : ""}</td>
            <td class="inline-actions">
              <button type="button" class="btn btn-ghost btn-sm" data-del="${b.id}">Eliminar</button>
            </td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table></div>`;

  box.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("¿Eliminar este negocio?")) return;
      try {
        await api(`/businesses/${btn.dataset.del}`, { method: "DELETE" });
        await loadMyBusinesses();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

async function loadProductsForSelected() {
  const businessId = document.getElementById("p-business").value;
  const box = document.getElementById("products-list");
  if (!businessId) {
    box.innerHTML = "";
    return;
  }
  try {
    const products = await api(`/products/business/${businessId}`);
    if (!products.length) {
      box.innerHTML = `<p class="meta">Sin productos en este negocio.</p>`;
      return;
    }
    box.innerHTML = products
      .map(
        (p) => `<article class="product-item">
        <strong>${escapeHtml(p.name)}</strong> · ${formatMoney(p.price)}
        <p class="meta">${escapeHtml(p.description || "")}</p>
        <button type="button" class="btn btn-ghost btn-sm" data-pdel="${p.id}">Eliminar</button>
      </article>`
      )
      .join("");
    box.querySelectorAll("[data-pdel]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("¿Eliminar producto?")) return;
        try {
          await api(`/products/${btn.dataset.pdel}`, { method: "DELETE" });
          await loadProductsForSelected();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    box.innerHTML = `<p class="form-msg error">${escapeHtml(err.message)}</p>`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAuth()) return;
  renderNav("merchant");

  if (!isMerchant() && !isAdmin()) {
    document.querySelector("main").innerHTML = `
      <section class="panel">
        <p>Necesitas ser comercio aprobado. <a href="merchant-apply.html">Solicita tu perfil</a>.</p>
      </section>`;
    return;
  }

  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      showTab(t.dataset.tab);
      if (t.dataset.tab === "products") loadProductsForSelected();
    })
  );

  try {
    await loadCategories();
    await loadMyBusinesses();
  } catch (err) {
    document.getElementById("tab-list").innerHTML = `<p class="form-msg error">${escapeHtml(err.message)}</p>`;
  }

  document.getElementById("p-business")?.addEventListener("change", loadProductsForSelected);

  document.getElementById("business-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("b-msg");
    const fd = new FormData();
    fd.append("name", document.getElementById("b-name").value.trim());
    fd.append("description", document.getElementById("b-desc").value.trim());
    fd.append("categoryId", document.getElementById("b-category").value);
    fd.append("latitude", document.getElementById("b-lat").value);
    fd.append("longitude", document.getElementById("b-lon").value);
    fd.append("whatsappNumber", document.getElementById("b-wa").value.trim());
    const story = document.getElementById("b-story").value.trim();
    if (story) fd.append("story", story);
    const families = document.getElementById("b-families").value;
    if (families !== "") fd.append("impactFamiliesCount", families);
    const cause = document.getElementById("b-cause").value.trim();
    if (cause) fd.append("impactCause", cause);
    const rewards = document.getElementById("b-rewards").value.trim();
    if (rewards) fd.append("rewardOffersJson", rewards);
    const files = document.getElementById("b-photos").files;
    for (const f of files) fd.append("photoFiles", f);

    try {
      await apiForm("/businesses", fd, "POST");
      msg.className = "form-msg ok";
      msg.textContent = "Negocio creado (queda pendiente de verificación admin).";
      e.target.reset();
      await loadMyBusinesses();
      showTab("list");
    } catch (err) {
      msg.className = "form-msg error";
      msg.textContent = err.message;
    }
  });

  document.getElementById("product-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("p-msg");
    const fd = new FormData();
    fd.append("name", document.getElementById("p-name").value.trim());
    fd.append("description", document.getElementById("p-desc").value.trim());
    fd.append("price", document.getElementById("p-price").value);
    fd.append("businessId", document.getElementById("p-business").value);
    for (const f of document.getElementById("p-photos").files) fd.append("photoFiles", f);

    try {
      await apiForm("/products", fd, "POST");
      msg.className = "form-msg ok";
      msg.textContent = "Producto creado.";
      e.target.reset();
      fillBusinessSelects();
      await loadProductsForSelected();
    } catch (err) {
      msg.className = "form-msg error";
      msg.textContent = err.message;
    }
  });

  document.getElementById("qr-load")?.addEventListener("click", async () => {
    const id = document.getElementById("qr-business").value;
    const box = document.getElementById("qr-result");
    if (!id) return;
    try {
      const qr = await api(`/businesses/${id}/qr`);
        box.innerHTML = `
        <p><strong>${escapeHtml(qr.businessName)}</strong></p>
        <p class="meta">Token (para que el cliente pegue en el detalle)</p>
        <div class="qr-box">${escapeHtml(qr.qrToken)}</div>
        <p class="meta" style="margin-top:.8rem">Contenido completo</p>
        <div class="qr-box">${escapeHtml(qr.qrContent)}</div>
        <p class="meta" style="margin-top:.8rem">Tras aprobar un comercio o negocio, el usuario debe <strong>cerrar sesión y volver a entrar</strong> para refrescar su rol JWT.</p>`;
    } catch (err) {
      box.innerHTML = `<p class="form-msg error">${escapeHtml(err.message)}</p>`;
    }
  });
});
