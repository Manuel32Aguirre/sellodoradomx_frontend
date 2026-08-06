const {
  api,
  categoryLabel,
  stars,
  formatMoney,
  escapeHtml,
  renderNav,
  isLoggedIn,
  photoUrl,
} = window.SelloAPI;

function getBusinessId() {
  return new URLSearchParams(window.location.search).get("id");
}

async function toggleFavorite(businessId, button) {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }
  const active = button.dataset.active === "true";
  button.disabled = true;
  try {
    if (active) {
      await api(`/favorites/${businessId}`, { method: "DELETE" });
      button.dataset.active = "false";
      button.textContent = "Guardar favorito";
    } else {
      await api(`/favorites/${businessId}`, { method: "POST" });
      button.dataset.active = "true";
      button.textContent = "Quitar de favoritos";
    }
  } catch (err) {
    alert(err.message);
  } finally {
    button.disabled = false;
  }
}

async function submitRating(businessId) {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }
  const score = Number(document.getElementById("rating-score").value);
  const comment = document.getElementById("rating-comment").value.trim();
  const msg = document.getElementById("rating-msg");
  try {
    await api("/ratings", {
      method: "POST",
      body: JSON.stringify({ businessId: Number(businessId), score, comment }),
    });
    msg.className = "form-msg ok";
    msg.textContent = "¡Gracias por tu reseña!";
    await loadRatings(businessId);
  } catch (err) {
    msg.className = "form-msg error";
    msg.textContent = err.message;
  }
}

async function loadProducts(businessId) {
  const box = document.getElementById("products");
  try {
    const products = await api(`/products/business/${businessId}`);
    if (!products.length) {
      box.innerHTML = `<p class="meta">Este negocio aún no publicó productos.</p>`;
      return;
    }
    box.innerHTML = products
      .map(
        (p) => `
      <article class="product-item">
        <strong>${escapeHtml(p.name)}</strong>
        <p class="meta">${escapeHtml(p.description || "")}</p>
        <div class="price">${formatMoney(p.price)}</div>
      </article>`
      )
      .join("");
  } catch (err) {
    box.innerHTML = `<p class="meta">${escapeHtml(err.message)}</p>`;
  }
}

async function loadRatings(businessId) {
  const box = document.getElementById("ratings");
  try {
    const ratings = await api(`/ratings/business/${businessId}`);
    if (!ratings.length) {
      box.innerHTML = `<p class="meta">Sé el primero en calificar este negocio.</p>`;
      return;
    }
    box.innerHTML = ratings
      .map(
        (r) => `
      <article class="rating-item">
        <div class="rating">${stars(r.score)}</div>
        <strong>${escapeHtml(r.userName || "Usuario")}</strong>
        <p class="meta">${escapeHtml(r.comment || "Sin comentario")}</p>
      </article>`
      )
      .join("");
  } catch (err) {
    box.innerHTML = `<p class="meta">${escapeHtml(err.message)}</p>`;
  }
}

function renderProgress(progress) {
  const pct = Math.min(100, Number(progress.percentage) || 0);
  const offers = progress.rewardOffers || [];
  return `
    <div class="stack">
      <div><strong>Nivel ${escapeHtml(progress.currentLevel)}</strong> / ${escapeHtml(progress.maxLevel)}
        ${progress.completed ? '<span class="badge badge-ok">Completado</span>' : ""}</div>
      <div class="progress-bar"><span style="width:${pct}%"></span></div>
      <div class="meta">${pct}% · ${escapeHtml(progress.totalScans)} escaneos</div>
      <div class="stack">
        ${
          offers.length
            ? offers
                .map(
                  (o) => `<div class="product-item">Nivel ${escapeHtml(o.requiredLevel)}: ${escapeHtml(o.offerText)}</div>`
                )
                .join("")
            : '<p class="meta">Sin recompensas configuradas.</p>'
        }
      </div>
    </div>`;
}

async function loadProgress(businessId) {
  const box = document.getElementById("progress-box");
  if (!isLoggedIn()) {
    box.innerHTML = `<p class="meta">Inicia sesión para ver tu progreso y escanear QR. <a href="login.html">Entrar</a></p>`;
    return;
  }
  try {
    const progress = await api(`/business-progress/businesses/${businessId}/me`);
    box.innerHTML = renderProgress(progress);
  } catch (err) {
    box.innerHTML = `<p class="meta">${escapeHtml(err.message)}</p>`;
  }
}

async function scanQr(businessId) {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }
  const token = document.getElementById("qr-token").value.trim();
  const msg = document.getElementById("scan-msg");
  if (!token) {
    msg.className = "form-msg error";
    msg.textContent = "Pega el token QR del negocio.";
    return;
  }
  try {
    const progress = await api("/business-progress/scan", {
      method: "POST",
      body: JSON.stringify({ businessId: Number(businessId), qrToken: token }),
    });
    msg.className = "form-msg ok";
    msg.textContent = "¡Escaneo registrado!";
    document.getElementById("progress-box").innerHTML = renderProgress(progress);
  } catch (err) {
    msg.className = "form-msg error";
    msg.textContent = err.message;
  }
}

async function syncFavoriteButton(businessId, button) {
  if (!isLoggedIn()) return;
  try {
    const favorites = await api("/favorites");
    const found = favorites.some((b) => String(b.id) === String(businessId));
    button.dataset.active = found ? "true" : "false";
    button.textContent = found ? "Quitar de favoritos" : "Guardar favorito";
  } catch {
    /* ignore */
  }
}

async function init() {
  renderNav("");
  const id = getBusinessId();
  const root = document.getElementById("detail-root");
  if (!id) {
    root.innerHTML = `<div class="state-box">Negocio no encontrado.</div>`;
    return;
  }

  try {
    const business = await api(`/businesses/${id}`);
    const badges = [
      business.verified ? "Verificado" : null,
      business.goldenSealActive ? "Sello Dorado" : null,
      business.coppelEmprendeEnrolled ? "Coppel Emprende" : null,
    ]
      .filter(Boolean)
      .map((b) => `<span class="badge">${b}</span>`)
      .join(" ");

    const photos = (business.photos || [])
      .map((p) => `<img src="${escapeHtml(photoUrl(p.url))}" alt="" style="border-radius:12px;max-height:180px;object-fit:cover" />`)
      .join("");

    const rewards = (business.rewardOffers || [])
      .map((o) => `<li>Nivel ${escapeHtml(o.requiredLevel)}: ${escapeHtml(o.offerText)}</li>`)
      .join("");

    root.innerHTML = `
      <section class="detail-hero">
        <div class="card-badges" style="position:static;margin-bottom:.6rem">${badges}</div>
        <div class="meta">${escapeHtml(categoryLabel(business.categoryName))}</div>
        <h1>${escapeHtml(business.name)}</h1>
        <p class="meta">${escapeHtml(business.description || "")}</p>
        <div class="rating">${stars(business.averageRating)} ${business.ratingsCount != null ? `(${business.ratingsCount})` : ""}</div>
        <div class="detail-actions">
          <button type="button" class="btn btn-ghost" id="fav-btn" data-active="false">Guardar favorito</button>
          ${
            business.whatsappNumber
              ? `<a class="btn btn-primary" target="_blank" rel="noopener" href="https://wa.me/52${escapeHtml(business.whatsappNumber)}?text=${encodeURIComponent("Hola, los encontré en SelloDorado MX")}">WhatsApp</a>`
              : ""
          }
          <a class="btn btn-ghost" href="index.html">Volver</a>
        </div>
      </section>

      ${photos ? `<section class="panel"><h2>Fotos</h2><div class="split-2">${photos}</div></section>` : ""}

      ${
        business.story
          ? `<section class="panel"><h2>Historia</h2><p>${escapeHtml(business.story)}</p>
             ${business.impactCause ? `<p class="meta">Impacto: ${escapeHtml(business.impactCause)}${business.impactFamiliesCount != null ? ` · ${business.impactFamiliesCount} familias` : ""}</p>` : ""}
             </section>`
          : ""
      }

      ${rewards ? `<section class="panel"><h2>Recompensas por nivel</h2><ul>${rewards}</ul></section>` : ""}

      <section class="panel">
        <h2>Tu progreso (niveles)</h2>
        <div id="progress-box"><p class="meta">Cargando...</p></div>
        <form class="form" id="scan-form" style="margin-top:1rem">
          <label>Token QR del negocio
            <input id="qr-token" type="text" placeholder="Pega aquí el token QR" />
          </label>
          <button class="btn btn-primary" type="submit">Registrar visita / escaneo</button>
          <div class="form-msg" id="scan-msg"></div>
        </form>
      </section>

      <section class="panel">
        <h2>Productos y servicios</h2>
        <div class="product-list" id="products"><p class="meta">Cargando...</p></div>
      </section>

      <section class="panel">
        <h2>Reseñas</h2>
        <div class="rating-list" id="ratings"><p class="meta">Cargando...</p></div>
        <form class="form" id="rating-form" style="margin-top:1rem">
          <label>Calificación
            <select id="rating-score">
              <option value="5">5 - Excelente</option>
              <option value="4">4 - Muy bueno</option>
              <option value="3">3 - Regular</option>
              <option value="2">2 - Malo</option>
              <option value="1">1 - Muy malo</option>
            </select>
          </label>
          <label>Comentario
            <textarea id="rating-comment" rows="3" maxlength="500" placeholder="¿Qué te pareció?"></textarea>
          </label>
          <button class="btn btn-primary" type="submit">Publicar reseña</button>
          <div class="form-msg" id="rating-msg"></div>
        </form>
      </section>
    `;

    const favBtn = document.getElementById("fav-btn");
    favBtn.addEventListener("click", () => toggleFavorite(id, favBtn));
    await syncFavoriteButton(id, favBtn);

    document.getElementById("rating-form").addEventListener("submit", (e) => {
      e.preventDefault();
      submitRating(id);
    });
    document.getElementById("scan-form").addEventListener("submit", (e) => {
      e.preventDefault();
      scanQr(id);
    });

    await Promise.all([loadProducts(id), loadRatings(id), loadProgress(id)]);
    window.initChatWidget?.(Number(id), business.whatsappNumber || null);
  } catch (err) {
    root.innerHTML = `<div class="state-box">${escapeHtml(err.message)}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", init);
