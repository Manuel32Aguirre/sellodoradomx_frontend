const { api, categoryLabel, stars, escapeHtml, renderNav, isLoggedIn, getToken } = window.SelloAPI;

let allBusinesses = [];
let categories = [];
let activeCategory = "";
let searchTerm = "";

function businessCard(b, index) {
  const rating = b.averageRating != null ? stars(b.averageRating) : "Sin rating";
  const count = b.ratingsCount != null ? `(${b.ratingsCount})` : "";
  const badges = [
    b.verified ? `<span class="badge badge-ok">Verificado</span>` : "",
    b.goldenSealActive ? `<span class="badge">Sello Dorado</span>` : "",
    b.coppelEmprendeEnrolled ? `<span class="badge">Coppel Emprende</span>` : "",
  ]
    .filter(Boolean)
    .join("");

  return `
    <a class="business-card" href="detail.html?id=${b.id}" style="animation-delay:${index * 40}ms">
      <div class="card-media">
        <div class="card-badges">${badges}</div>
      </div>
      <div class="card-body">
        <div class="meta">${escapeHtml(categoryLabel(b.categoryName))}</div>
        <h3>${escapeHtml(b.name)}</h3>
        <p class="meta">${escapeHtml(b.description || "")}</p>
        <div class="rating">${rating} ${count}</div>
      </div>
    </a>
  `;
}

function applyFilters() {
  const term = searchTerm.trim().toLowerCase();
  const filtered = allBusinesses.filter((b) => {
    const catOk = !activeCategory || String(b.categoryName) === activeCategory;
    const text = `${b.name || ""} ${b.description || ""}`.toLowerCase();
    const termOk = !term || text.includes(term);
    return catOk && termOk;
  });

  const grid = document.getElementById("business-grid");
  const state = document.getElementById("list-state");

  if (!filtered.length) {
    grid.innerHTML = "";
    state.textContent = "No hay negocios con esos filtros.";
    state.hidden = false;
    return;
  }

  state.hidden = true;
  grid.innerHTML = filtered.map((b, i) => businessCard(b, i)).join("");
}

function renderChips() {
  const row = document.getElementById("category-chips");
  const chips = [
    { id: "", name: "Todos" },
    ...categories.map((c) => ({ id: c.name, name: categoryLabel(c.name) })),
  ];

  row.innerHTML = chips
    .map(
      (c) =>
        `<button type="button" class="chip ${activeCategory === c.id ? "active" : ""}" data-cat="${escapeHtml(c.id)}">${escapeHtml(c.name)}</button>`
    )
    .join("");

  row.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat || "";
      renderChips();
      loadBusinesses();
    });
  });
}

async function loadBusinesses() {
  const state = document.getElementById("list-state");
  state.hidden = false;
  state.textContent = "Cargando negocios locales...";

  try {
    const query = activeCategory ? `?category=${encodeURIComponent(activeCategory)}` : "";
    allBusinesses = await api(`/businesses${query}`);
    applyFilters();
  } catch (err) {
    state.textContent = `No se pudieron cargar los negocios: ${err.message}`;
    document.getElementById("business-grid").innerHTML = "";
  }
}

async function loadNearest() {
  const state = document.getElementById("list-state");
  if (!navigator.geolocation) {
    state.hidden = false;
    state.textContent = "Tu navegador no soporta geolocalización.";
    return;
  }

  state.hidden = false;
  state.textContent = "Buscando cerca de ti...";

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const cat = categories.find((c) => c.name === activeCategory);
        const catParam = cat ? `&businessCat=${cat.id}` : "";
        allBusinesses = await api(
          `/businesses/nearest?userLat=${latitude}&userLon=${longitude}${catParam}`
        );
        applyFilters();
      } catch (err) {
        state.textContent = err.message;
      }
    },
    () => {
      state.textContent = "No se pudo obtener tu ubicación.";
    }
  );
}

async function init() {
  renderNav("home");

  document.getElementById("search-input")?.addEventListener("input", (e) => {
    searchTerm = e.target.value;
    applyFilters();
  });

  document.getElementById("btn-nearest")?.addEventListener("click", loadNearest);

  try {
    categories = await api("/business-categories");
  } catch {
    categories = [];
  }

  renderChips();
  await loadBusinesses();
}

document.addEventListener("DOMContentLoaded", init);
