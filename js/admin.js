const {
  api,
  renderNav,
  requireAuth,
  isAdmin,
  escapeHtml,
  statusBadge,
  categoryLabel,
} = window.SelloAPI;

function showTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  ["merchants", "pending", "deleted"].forEach((id) => {
    document.getElementById(`tab-${id}`).hidden = id !== name;
  });
}

async function loadMerchants() {
  const box = document.getElementById("tab-merchants");
  try {
    const list = await api("/users/merchant-profiles?status=PENDING");
    if (!list.length) {
      box.innerHTML = `<p class="meta">No hay solicitudes pendientes.</p>`;
      return;
    }
    box.innerHTML = `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Usuario</th><th>CURP / Tel</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>
        ${list
          .map(
            (p) => `<tr>
          <td>${escapeHtml(p.name)} ${escapeHtml(p.lastname)}<div class="meta">${escapeHtml(p.email)}</div></td>
          <td>${escapeHtml(p.curp)}<div class="meta">${escapeHtml(p.phone)}</div></td>
          <td>${statusBadge(p.status)}</td>
          <td class="inline-actions">
            <button type="button" class="btn btn-primary btn-sm" data-approve="${p.id}">Aprobar</button>
            <button type="button" class="btn btn-ghost btn-sm" data-reject="${p.id}">Rechazar</button>
          </td>
        </tr>`
          )
          .join("")}
      </tbody></table></div>`;

    box.querySelectorAll("[data-approve]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/users/merchant-profiles/${btn.dataset.approve}/approve`, { method: "PATCH" });
          alert("Aprobado. El usuario debe cerrar sesión y volver a entrar para obtener rol MERCHANT.");
          await loadMerchants();
        } catch (err) {
          alert(err.message);
        }
      });
    });

    box.querySelectorAll("[data-reject]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const reason = prompt("Motivo del rechazo:");
        if (!reason) return;
        try {
          await api(`/users/merchant-profiles/${btn.dataset.reject}/reject`, {
            method: "PATCH",
            body: JSON.stringify({ reason }),
          });
          await loadMerchants();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    box.innerHTML = `<p class="form-msg error">${escapeHtml(err.message)}</p>`;
  }
}

function businessActions(b) {
  return `
    <button type="button" class="btn btn-primary btn-sm" data-verify="${b.id}">Verificar</button>
    <button type="button" class="btn btn-ghost btn-sm" data-seal="${b.id}" data-active="${b.goldenSealActive ? "false" : "true"}">
      ${b.goldenSealActive ? "Quitar sello" : "Sello dorado"}
    </button>
    <button type="button" class="btn btn-ghost btn-sm" data-coppel="${b.id}" data-enrolled="${b.coppelEmprendeEnrolled ? "false" : "true"}">
      ${b.coppelEmprendeEnrolled ? "Quitar Coppel" : "Coppel Emprende"}
    </button>
    <button type="button" class="btn btn-ghost btn-sm" data-del="${b.id}">Eliminar</button>
  `;
}

function bindBusinessActions(box, reload) {
  box.querySelectorAll("[data-verify]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api(`/businesses/${btn.dataset.verify}/verify`, { method: "PATCH" });
        await reload();
      } catch (err) {
        alert(err.message);
      }
    });
  });
  box.querySelectorAll("[data-seal]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api(`/businesses/${btn.dataset.seal}/golden-seal?active=${btn.dataset.active}`, {
          method: "PATCH",
        });
        await reload();
      } catch (err) {
        alert(err.message);
      }
    });
  });
  box.querySelectorAll("[data-coppel]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api(`/businesses/${btn.dataset.coppel}/coppel-emprende?enrolled=${btn.dataset.enrolled}`, {
          method: "PATCH",
        });
        await reload();
      } catch (err) {
        alert(err.message);
      }
    });
  });
  box.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("¿Eliminar negocio?")) return;
      try {
        await api(`/businesses/${btn.dataset.del}`, { method: "DELETE" });
        await reload();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

async function loadPending() {
  const box = document.getElementById("tab-pending");
  try {
    const list = await api("/businesses/pending");
    if (!list.length) {
      box.innerHTML = `<p class="meta">No hay negocios pendientes.</p>`;
      return;
    }
    box.innerHTML = `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Negocio</th><th>Categoría</th><th>Acciones</th></tr></thead>
      <tbody>
        ${list
          .map(
            (b) => `<tr>
          <td><a href="detail.html?id=${b.id}">${escapeHtml(b.name)}</a>
            <div class="meta">${escapeHtml(b.description || "")}</div></td>
          <td>${escapeHtml(categoryLabel(b.categoryName))}</td>
          <td class="inline-actions">${businessActions(b)}</td>
        </tr>`
          )
          .join("")}
      </tbody></table></div>`;
    bindBusinessActions(box, loadPending);
  } catch (err) {
    box.innerHTML = `<p class="form-msg error">${escapeHtml(err.message)}</p>`;
  }
}

async function loadDeleted() {
  const box = document.getElementById("tab-deleted");
  try {
    const list = await api("/businesses/deleted");
    if (!list.length) {
      box.innerHTML = `<p class="meta">No hay eliminados.</p>`;
      return;
    }
    box.innerHTML = `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Negocio</th><th>Eliminado</th></tr></thead>
      <tbody>
        ${list
          .map(
            (b) => `<tr>
          <td>${escapeHtml(b.name)}</td>
          <td class="meta">${escapeHtml(b.deletedAt || "")} · ${escapeHtml(b.deletedByFirstName || "")} ${escapeHtml(b.deletedByLastName || "")}</td>
        </tr>`
          )
          .join("")}
      </tbody></table></div>`;
  } catch (err) {
    box.innerHTML = `<p class="form-msg error">${escapeHtml(err.message)}</p>`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAuth()) return;
  renderNav("admin");

  if (!isAdmin()) {
    document.querySelector("main").innerHTML = `<section class="panel"><p>Solo administradores.</p></section>`;
    return;
  }

  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      showTab(t.dataset.tab);
      if (t.dataset.tab === "merchants") loadMerchants();
      if (t.dataset.tab === "pending") loadPending();
      if (t.dataset.tab === "deleted") loadDeleted();
    })
  );

  await loadMerchants();
});
