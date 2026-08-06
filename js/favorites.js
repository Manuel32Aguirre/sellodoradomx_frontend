const { api, categoryLabel, stars, escapeHtml, renderNav, isLoggedIn } = window.SelloAPI;

document.addEventListener("DOMContentLoaded", async () => {
  renderNav("favorites");

  const state = document.getElementById("list-state");
  const grid = document.getElementById("business-grid");

  if (!isLoggedIn()) {
    state.textContent = "Inicia sesión para ver tus favoritos.";
    state.innerHTML += ` <a href="login.html">Entrar</a>`;
    return;
  }

  state.textContent = "Cargando favoritos...";

  try {
    const favorites = await api("/favorites");
    if (!favorites.length) {
      state.textContent = "Aún no tienes negocios guardados.";
      return;
    }

    state.hidden = true;
    grid.innerHTML = favorites
      .map(
        (b, index) => `
      <a class="business-card" href="detail.html?id=${b.id}" style="animation-delay:${index * 40}ms">
        <div class="card-media">
          <div class="card-badges">
            ${b.goldenSealActive ? '<span class="badge">Sello Dorado</span>' : ""}
            ${b.verified ? '<span class="badge badge-ok">Verificado</span>' : ""}
          </div>
        </div>
        <div class="card-body">
          <div class="meta">${escapeHtml(categoryLabel(b.categoryName))}</div>
          <h3>${escapeHtml(b.name)}</h3>
          <p class="meta">${escapeHtml(b.description || "")}</p>
          <div class="rating">${stars(b.averageRating)}</div>
        </div>
      </a>`
      )
      .join("");
  } catch (err) {
    state.textContent = err.message;
  }
});
