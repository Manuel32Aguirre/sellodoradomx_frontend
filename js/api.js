(() => {
  const TOKEN_KEY = "sd_token";
  const USER_KEY = "sd_user";

  function getApiBaseUrl() {
    return window.API_BASE_URL || window.SELLO_CONFIG?.API_BASE_URL || "http://localhost:8088/api/v1";
  }

  function getSwaggerUrl() {
    return window.SELLO_CONFIG?.SWAGGER_URL || "http://localhost:8088/swagger-ui.html";
  }

  const CATEGORY_LABELS = {
    GASTRONOMY: "Gastronomía",
    STAYS: "Hospedaje",
    CULTURE: "Cultura",
    ADVENTURE: "Aventura",
    EXPERIENCES: "Experiencias",
    CRAFTS: "Artesanías",
  };

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  }

  function setSession(auth) {
    localStorage.setItem(TOKEN_KEY, auth.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  }

  function setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function isLoggedIn() {
    return Boolean(getToken());
  }

  function roleName() {
    return getUser()?.roleName || "";
  }

  function isAdmin() {
    return roleName() === "ROLE_ADMIN";
  }

  function isMerchant() {
    return roleName() === "ROLE_MERCHANT";
  }

  function isTourist() {
    return roleName() === "ROLE_TOURIST";
  }

  function requireAuth(redirect = "login.html") {
    if (!isLoggedIn()) {
      window.location.href = redirect;
      return false;
    }
    return true;
  }

  function photoUrl(path) {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const base = getApiBaseUrl().replace(/\/api\/v1\/?$/, "");
    return path.startsWith("/") ? `${base}${path}` : `${getApiBaseUrl()}/${path}`;
  }

  async function api(path, options = {}) {
    const headers = {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(options.headers || {}),
    };

    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${getApiBaseUrl()}${path}`, { ...options, headers });

    if (response.status === 204) return null;

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!response.ok) {
      const message =
        (data && (data.message || data.error || data.detail)) ||
        (typeof data === "string" ? data : null) ||
        `Error ${response.status}`;
      const err = new Error(message);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  async function apiForm(path, formData, method = "POST") {
    return api(path, { method, body: formData });
  }

  async function apiBlob(path) {
    const token = getToken();
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      throw new Error(`No se pudo cargar el archivo (${response.status})`);
    }
    return URL.createObjectURL(await response.blob());
  }

  async function refreshMe() {
    if (!isLoggedIn()) return null;
    const me = await api("/users/me");
    setUser(me);
    return me;
  }

  function categoryLabel(name) {
    return CATEGORY_LABELS[name] || name || "Negocio";
  }

  function stars(value) {
    const n = Number(value) || 0;
    const full = Math.round(n);
    return `${"★".repeat(full)}${"☆".repeat(Math.max(0, 5 - full))} ${n ? n.toFixed(1) : "Sin rating"}`;
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(Number(value) || 0);
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function statusBadge(status) {
    const s = (status || "").toUpperCase();
    const map = {
      PENDING: "badge",
      APPROVED: "badge badge-ok",
      REJECTED: "badge badge-danger",
    };
    return `<span class="${map[s] || "badge"}">${escapeHtml(s || "—")}</span>`;
  }

  function renderNav(active = "") {
    const user = getUser();
    const nav = document.getElementById("nav-links");
    if (!nav) return;

    const links = [
      { href: "index.html", label: "Explorar", key: "home" },
      { href: "favorites.html", label: "Favoritos", key: "favorites" },
    ];

    if (user && isTourist()) {
      links.push({ href: "merchant-apply.html", label: "Ser comercio", key: "apply" });
    }
    if (user && isMerchant()) {
      links.push({ href: "merchant.html", label: "Mis negocios", key: "merchant" });
    }
    if (user && isAdmin()) {
      links.push({ href: "admin.html", label: "Admin", key: "admin" });
    }
    links.push({
      href: getSwaggerUrl(),
      label: "API Docs",
      key: "docs",
      className: "docs-link",
      external: true,
    });

    nav.innerHTML = links
      .map((link) => {
        const cls = [link.key === active ? "active" : "", link.className || ""]
          .filter(Boolean)
          .join(" ");
        return `<a class="${cls}" href="${link.href}" ${link.external ? 'target="_blank" rel="noopener"' : ""}>${link.label}</a>`;
      })
      .join("");

    if (user) {
      nav.innerHTML += `<span class="meta">${escapeHtml(user.name)} · ${escapeHtml((user.roleName || "").replace("ROLE_", ""))}</span>`;
      nav.innerHTML += `<button type="button" id="logout-btn">Salir</button>`;
      document.getElementById("logout-btn")?.addEventListener("click", () => {
        clearSession();
        window.location.href = "index.html";
      });
    } else {
      nav.innerHTML += `<a href="login.html">Entrar</a>`;
      nav.innerHTML += `<a class="btn btn-primary btn-sm" href="register.html">Crear cuenta</a>`;
    }
  }

  function pageShell(title) {
    return `
      <header class="site-header">
        <div class="container nav">
          <a class="brand" href="index.html">
            <span class="brand-mark" aria-hidden="true"></span>
            <span class="brand-name">Sello<span>Dorado</span> MX</span>
          </a>
          <nav class="nav-links" id="nav-links"></nav>
        </div>
      </header>
      <main class="container" id="main">${title || ""}</main>
    `;
  }

  window.SelloAPI = {
    getApiBaseUrl,
    getSwaggerUrl,
    getToken,
    getUser,
    setSession,
    setUser,
    clearSession,
    isLoggedIn,
    roleName,
    isAdmin,
    isMerchant,
    isTourist,
    requireAuth,
    photoUrl,
    api,
    apiForm,
    apiBlob,
    refreshMe,
    categoryLabel,
    stars,
    formatMoney,
    escapeHtml,
    statusBadge,
    renderNav,
    pageShell,
    CATEGORY_LABELS,
  };
})();
