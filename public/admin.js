// admin.js - Nouvelle logique admin Chiino

// --- Etat global ---
let adminState = {
  products: [],
  realisations: [],
  orders: [],
  planning: [],
  user: null
};

// --- Navigation ---
const routes = [
  { hash: '#dashboard', title: 'Tableau de bord', render: renderDashboard },
  { hash: '#products', title: 'Produits', render: renderProducts },
  { hash: '#realisations', title: 'Réalisations', render: renderRealisations },
  { hash: '#orders', title: 'Commandes', render: renderOrders },
  { hash: '#planning', title: 'Planning', render: renderPlanning },
  { hash: '#logout', title: 'Déconnexion', render: renderLogout }
];

window.addEventListener('DOMContentLoaded', () => {
  bindSidebarNavigation();
  loadAdminData().then(() => route());
  window.addEventListener('hashchange', route);
});

function bindSidebarNavigation() {
  const navLinks = document.querySelectorAll('.admin-sidebar nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });
}

function route() {
  const hash = window.location.hash || '#dashboard';
  const route = routes.find(r => r.hash === hash) || routes[0];
  document.getElementById('admin-title').textContent = route.title;
  document.getElementById('admin-add-btn').style.display = (hash === '#products' || hash === '#realisations') ? '' : 'none';
  route.render();
}

// --- Chargement des données ---
async function loadAdminData() {
  // À adapter selon l’API réelle
  const [content, orders, planning] = await Promise.all([
    fetch('/api/admin/content').then(r => r.json()),
    fetch('/api/admin/orders').then(r => r.json()),
    fetch('/api/admin/schedule').then(r => r.json())
  ]);
  adminState.products = content.allProducts || [];
  adminState.realisations = content.allRealisations || [];
  adminState.orders = orders || [];
  adminState.planning = planning || [];
}

// --- Rendu des modules ---
function renderDashboard() {
  document.getElementById('admin-content').innerHTML = `
    <div style="display:flex;gap:32px;flex-wrap:wrap">
      <div><h3>${adminState.products.length}</h3><div>Produits</div></div>
      <div><h3>${adminState.realisations.length}</h3><div>Réalisations</div></div>
      <div><h3>${adminState.orders.length}</h3><div>Commandes</div></div>
      <div><h3>${adminState.planning.length}</h3><div>Créneaux</div></div>
    </div>
  `;
}

function renderProducts() {
  const formHtml = `
    <form id="product-form" class="admin-form" style="display:none">
      <h3 id="product-form-title">Ajouter un produit</h3>
      <label>Nom <input name="name" required></label>
      <label>Catégorie <input name="category"></label>
      <label>Prix <input name="price" type="number" min="0" step="0.01" required></label>
      <label>Résumé <input name="shortDesc"></label>
      <label>Badge <input name="badge"></label>
      <label>Label option <input name="optionLabel"></label>
      <label>Options (virgule) <input name="options"></label>
      <label>Description <textarea name="details"></textarea></label>
      <label>Image URL <input name="imageSrc"></label>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button type="button" class="admin-btn" id="cancel-product-btn">Annuler</button>
        <button type="submit" class="admin-btn">Enregistrer</button>
      </div>
    </form>`;
  document.getElementById('admin-content').innerHTML = formHtml + `
    <table class="admin-table">
      <thead><tr><th>Nom</th><th>Catégorie</th><th>Prix</th><th>Actions</th></tr></thead>
      <tbody>
        ${adminState.products.map(p => `
          <tr>
            <td>${escapeHtml(p.name)}</td>
            <td>${escapeHtml(p.category || '')}</td>
            <td>${Number(p.price).toFixed(2)}€</td>
            <td>
              <button class="admin-btn" data-edit-product="${p.id}">Modifier</button>
              <button class="admin-btn" data-delete-product="${p.id}">Supprimer</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  bindProductActions();
}

function renderRealisations() {
  const formHtml = `
    <form id="real-form" class="admin-form" style="display:none">
      <h3 id="real-form-title">Ajouter une réalisation</h3>
      <label>Titre <input name="title" required></label>
      <label>Style <input name="style"></label>
      <label>Image URL <input name="imageSrc"></label>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button type="button" class="admin-btn" id="cancel-real-btn">Annuler</button>
        <button type="submit" class="admin-btn">Enregistrer</button>
      </div>
    </form>`;
  document.getElementById('admin-content').innerHTML = formHtml + `
    <table class="admin-table">
      <thead><tr><th>Titre</th><th>Style</th><th>Actions</th></tr></thead>
      <tbody>
        ${adminState.realisations.map(r => `
          <tr>
            <td>${escapeHtml(r.title)}</td>
            <td>${escapeHtml(r.style || '')}</td>
            <td>
              <button class="admin-btn" data-edit-real="${r.id}">Modifier</button>
              <button class="admin-btn" data-delete-real="${r.id}">Supprimer</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  bindRealActions();
}

function renderOrders() {
  document.getElementById('admin-content').innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Client</th><th>Date</th><th>Montant</th><th>Statut</th></tr></thead>
      <tbody>
        ${adminState.orders.map(o => `
          <tr>
            <td>${escapeHtml(o.client || '')}</td>
            <td>${escapeHtml(o.date || '')}</td>
            <td>${Number(o.amount || 0).toFixed(2)}€</td>
            <td>${escapeHtml(o.status || '')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderPlanning() {
  document.getElementById('admin-content').innerHTML = `
    <div>Planning à venir…</div>
  `;
}

function renderLogout() {
  // Déconnexion simple (à adapter)
  window.location.href = '/';
}

// --- Helpers ---
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (m) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'})[m];
  });
}

// --- Ajout/édition produits/réalisations ---
function bindProductActions() {
  const addBtn = document.getElementById('admin-add-btn');
  const form = document.getElementById('product-form');
  let editingId = null;
  addBtn.onclick = () => {
    form.reset();
    form.style.display = '';
    document.getElementById('product-form-title').textContent = 'Ajouter un produit';
    editingId = null;
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    data.price = parseFloat(data.price);
    if (!data.name || !Number.isFinite(data.price)) return;
    let url = '/api/admin/products', method = 'POST';
    if (editingId) { url += '/' + encodeURIComponent(editingId); method = 'PUT'; }
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    await loadAdminData();
    renderProducts();
    form.style.display = 'none';
  };
  form.querySelector('#cancel-product-btn').onclick = () => { form.style.display = 'none'; };
  document.querySelectorAll('[data-edit-product]').forEach(btn => {
    btn.onclick = () => {
      const prod = adminState.products.find(p => p.id === btn.dataset.editProduct);
      if (!prod) return;
      Object.entries(prod).forEach(([k, v]) => { if (form[k]) form[k].value = v; });
      form.style.display = '';
      document.getElementById('product-form-title').textContent = 'Modifier le produit';
      editingId = prod.id;
    };
  });
  document.querySelectorAll('[data-delete-product]').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Supprimer ce produit ?')) return;
      await fetch('/api/admin/products/' + encodeURIComponent(btn.dataset.deleteProduct), { method: 'DELETE' });
      await loadAdminData();
      renderProducts();
    };
  });
}

function bindRealActions() {
  const addBtn = document.getElementById('admin-add-btn');
  const form = document.getElementById('real-form');
  let editingId = null;
  addBtn.onclick = () => {
    form.reset();
    form.style.display = '';
    document.getElementById('real-form-title').textContent = 'Ajouter une réalisation';
    editingId = null;
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!data.title) return;
    let url = '/api/admin/realisations', method = 'POST';
    if (editingId) { url += '/' + encodeURIComponent(editingId); method = 'PUT'; }
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    await loadAdminData();
    renderRealisations();
    form.style.display = 'none';
  };
  form.querySelector('#cancel-real-btn').onclick = () => { form.style.display = 'none'; };
  document.querySelectorAll('[data-edit-real]').forEach(btn => {
    btn.onclick = () => {
      const real = adminState.realisations.find(r => r.id === btn.dataset.editReal);
      if (!real) return;
      Object.entries(real).forEach(([k, v]) => { if (form[k]) form[k].value = v; });
      form.style.display = '';
      document.getElementById('real-form-title').textContent = 'Modifier la réalisation';
      editingId = real.id;
    };
  });
  document.querySelectorAll('[data-delete-real]').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Supprimer cette réalisation ?')) return;
      await fetch('/api/admin/realisations/' + encodeURIComponent(btn.dataset.deleteReal), { method: 'DELETE' });
      await loadAdminData();
      renderRealisations();
    };
  });
}
