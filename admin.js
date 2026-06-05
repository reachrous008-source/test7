// ============================================================
// PRIME KITS — Admin Panel (admin.js)
// Full dashboard: products, orders, stats, notifications
// ============================================================

import {
  db, auth, storage,
  collection, getDocs, onSnapshot, doc, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, serverTimestamp,
  signOut, onAuthStateChanged,
  ref, uploadBytes, getDownloadURL, deleteObject
} from './firebase-config.js';

// ── Telegram Config (set in admin panel settings) ──
let TELEGRAM_BOT_TOKEN = localStorage.getItem('pk_tg_token') || '';
let TELEGRAM_CHAT_ID   = localStorage.getItem('pk_tg_chat')  || '';

// ── Auth Guard ──
onAuthStateChanged(auth, user => {
  if (!user) { window.location.href = 'login.html'; return; }
  document.getElementById('admin-email').textContent = user.email;
  initAdmin();
});

// ── Logout ──
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});

// ── Navigation ──
const sections = document.querySelectorAll('.admin-section');
const navItems = document.querySelectorAll('.admin-nav-item');

function showSection(id) {
  sections.forEach(s => s.style.display = s.id === id ? '' : 'none');
  navItems.forEach(n => n.classList.toggle('active', n.dataset.section === id));
}

navItems.forEach(item => {
  item.addEventListener('click', () => showSection(item.dataset.section));
});

// ── Live Stats ──
function initStats() {
  // Orders count & revenue
  onSnapshot(collection(db, 'orders'), snap => {
    document.getElementById('stat-orders').textContent = snap.size;
    const revenue = snap.docs.reduce((sum, d) => sum + (d.data().total || 0), 0);
    document.getElementById('stat-revenue').textContent = `$${revenue.toFixed(0)}`;
  });

  // Products count
  onSnapshot(collection(db, 'products'), snap => {
    document.getElementById('stat-products').textContent = snap.size;
    const low = snap.docs.filter(d => (d.data().stock || 0) < 5);
    document.getElementById('stat-low-stock').textContent = low.length;
    if (low.length > 0) {
      showToast(`⚠️ ${low.length} product(s) are low in stock!`, 'error');
    }
  });
}

// ── Products Management ──
let editingProductId = null;
let productImageFiles = [];

function initProducts() {
  const tableBody = document.getElementById('products-table-body');
  if (!tableBody) return;

  onSnapshot(collection(db, 'products'), snap => {
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    tableBody.innerHTML = products.length === 0
      ? '<tr><td colspan="6" style="text-align:center;color:var(--white-muted);padding:3rem;">No products yet. Add your first product!</td></tr>'
      : products.map(p => `
          <tr>
            <td><img src="${p.images?.[0] || ''}" style="width:50px;height:50px;object-fit:cover;border:1px solid var(--border)"></td>
            <td><strong>${p.title}</strong><br><small style="color:var(--white-muted)">${p.category || '—'}</small></td>
            <td style="color:var(--gold)">$${p.price?.toFixed(2)}</td>
            <td>${p.stock ?? '—'}</td>
            <td><span class="status-badge ${p.stock > 0 ? 'status-confirmed' : 'status-pending'}">${p.stock > 0 ? 'In Stock' : 'Out'}</span></td>
            <td>
              <button class="btn-outline" style="padding:0.3rem 0.8rem;font-size:0.6rem" onclick="editProduct('${p.id}')">Edit</button>
              <button style="background:#c0392b;color:#fff;padding:0.3rem 0.8rem;font-family:var(--font-ui);font-size:0.6rem;letter-spacing:0.1em;margin-left:0.5rem" onclick="deleteProduct('${p.id}','${p.title}')">Delete</button>
            </td>
          </tr>`).join('');
  });
}

// Open add product modal
document.getElementById('add-product-btn')?.addEventListener('click', () => {
  editingProductId = null;
  document.getElementById('product-form').reset();
  document.getElementById('product-images-preview').innerHTML = '';
  productImageFiles = [];
  document.getElementById('product-modal-title').textContent = 'Add New Product';
  document.getElementById('product-modal').classList.add('open');
});

// Close modal
document.getElementById('product-modal-close')?.addEventListener('click', () => {
  document.getElementById('product-modal').classList.remove('open');
});

// Image upload preview
document.getElementById('product-images-input')?.addEventListener('change', e => {
  const files = Array.from(e.target.files);
  productImageFiles = [...productImageFiles, ...files];
  const preview = document.getElementById('product-images-preview');
  preview.innerHTML = productImageFiles.map((f, i) => `
    <div style="position:relative;display:inline-block;margin:0.25rem">
      <img src="${URL.createObjectURL(f)}" style="width:80px;height:80px;object-fit:cover;border:1px solid var(--border)">
      <button onclick="removeImageFile(${i})" style="position:absolute;top:0;right:0;background:#c0392b;color:#fff;width:20px;height:20px;font-size:0.7rem">✕</button>
    </div>`).join('');
});

window.removeImageFile = i => {
  productImageFiles.splice(i, 1);
  document.getElementById('product-images-input').dispatchEvent(new Event('change'));
};

// Save product
document.getElementById('product-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('save-product-btn');
  btn.textContent = 'Saving…'; btn.disabled = true;

  try {
    // Upload images to Firebase Storage
    const imageUrls = [];
    for (const file of productImageFiles) {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      imageUrls.push(await getDownloadURL(storageRef));
    }

    const formData = {
      title:    document.getElementById('p-title').value,
      price:    parseFloat(document.getElementById('p-price').value),
      oldPrice: parseFloat(document.getElementById('p-old-price').value) || null,
      category: document.getElementById('p-category').value,
      description: document.getElementById('p-description').value,
      stock:    parseInt(document.getElementById('p-stock').value),
      sizes:    document.getElementById('p-sizes').value.split(',').map(s => s.trim()).filter(Boolean),
      tags:     document.getElementById('p-tags').value.split(',').map(t => t.trim()).filter(Boolean),
      updatedAt: serverTimestamp()
    };

    if (imageUrls.length > 0) formData.images = imageUrls;

    if (editingProductId) {
      await updateDoc(doc(db, 'products', editingProductId), formData);
      showToast('Product updated!', 'success');
    } else {
      formData.images = imageUrls;
      formData.createdAt = serverTimestamp();
      await addDoc(collection(db, 'products'), formData);
      showToast('Product added!', 'success');
    }

    document.getElementById('product-modal').classList.remove('open');
  } catch (err) {
    console.error(err);
    showToast('Error saving product: ' + err.message, 'error');
  } finally {
    btn.textContent = 'Save Product'; btn.disabled = false;
  }
});

// Edit product
window.editProduct = async id => {
  editingProductId = id;
  const snap = await getDocs(collection(db, 'products'));
  const product = snap.docs.find(d => d.id === id)?.data();
  if (!product) return;

  document.getElementById('p-title').value       = product.title || '';
  document.getElementById('p-price').value       = product.price || '';
  document.getElementById('p-old-price').value   = product.oldPrice || '';
  document.getElementById('p-category').value    = product.category || '';
  document.getElementById('p-description').value = product.description || '';
  document.getElementById('p-stock').value       = product.stock || '';
  document.getElementById('p-sizes').value       = (product.sizes || []).join(', ');
  document.getElementById('p-tags').value        = (product.tags || []).join(', ');
  document.getElementById('product-images-preview').innerHTML = (product.images || []).map(url =>
    `<img src="${url}" style="width:80px;height:80px;object-fit:cover;border:1px solid var(--border);margin:0.25rem">`
  ).join('');
  productImageFiles = [];
  document.getElementById('product-modal-title').textContent = 'Edit Product';
  document.getElementById('product-modal').classList.add('open');
};

// Delete product
window.deleteProduct = async (id, title) => {
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
  try {
    await deleteDoc(doc(db, 'products', id));
    showToast('Product deleted.', 'success');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
};

// ── Orders Management ──
function initOrders() {
  const tableBody = document.getElementById('orders-table-body');
  if (!tableBody) return;

  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  onSnapshot(q, snap => {
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    tableBody.innerHTML = orders.length === 0
      ? '<tr><td colspan="7" style="text-align:center;color:var(--white-muted);padding:3rem;">No orders yet.</td></tr>'
      : orders.map(o => `
          <tr>
            <td><code style="color:var(--gold);font-size:0.75rem">${o.orderId || o.id}</code></td>
            <td>${o.name}</td>
            <td>${o.phone}</td>
            <td>${o.province}</td>
            <td style="color:var(--gold)">$${o.total?.toFixed(2)}</td>
            <td>
              <select onchange="updateOrderStatus('${o.id}', this.value)" style="background:var(--black-card);border:1px solid var(--border);color:var(--white);padding:0.3rem;font-size:0.75rem">
                ${['pending','confirmed','shipped','delivered'].map(s =>
                  `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`
                ).join('')}
              </select>
            </td>
            <td>
              <button class="btn-outline" style="padding:0.3rem 0.7rem;font-size:0.6rem" onclick="viewOrder('${o.id}')">View</button>
            </td>
          </tr>`).join('');
  });
}

window.updateOrderStatus = async (id, status) => {
  try {
    await updateDoc(doc(db, 'orders', id), { status });
    showToast('Order status updated!', 'success');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
};

window.viewOrder = async id => {
  const snap = await getDocs(collection(db, 'orders'));
  const order = snap.docs.find(d => d.id === id)?.data();
  if (!order) return;
  const modal = document.getElementById('order-detail-modal');
  document.getElementById('order-detail-content').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem">
      <div><div style="color:var(--white-muted);font-size:0.65rem;letter-spacing:0.2em;margin-bottom:0.25rem">ORDER ID</div><code style="color:var(--gold)">${order.orderId}</code></div>
      <div><div style="color:var(--white-muted);font-size:0.65rem;letter-spacing:0.2em;margin-bottom:0.25rem">STATUS</div><span class="status-badge status-${order.status}">${order.status}</span></div>
      <div><div style="color:var(--white-muted);font-size:0.65rem;letter-spacing:0.2em;margin-bottom:0.25rem">CUSTOMER</div>${order.name}</div>
      <div><div style="color:var(--white-muted);font-size:0.65rem;letter-spacing:0.2em;margin-bottom:0.25rem">PHONE</div>${order.phone}</div>
      <div><div style="color:var(--white-muted);font-size:0.65rem;letter-spacing:0.2em;margin-bottom:0.25rem">PROVINCE</div>${order.province}</div>
      <div><div style="color:var(--white-muted);font-size:0.65rem;letter-spacing:0.2em;margin-bottom:0.25rem">SHIPPING</div>${order.shipping}</div>
    </div>
    <div style="border-top:1px solid var(--border);padding-top:1rem;margin-bottom:1rem">
      <div style="color:var(--white-muted);font-size:0.65rem;letter-spacing:0.2em;margin-bottom:0.75rem">ORDERED ITEMS</div>
      ${(order.items || []).map(i => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid var(--border-soft)">
          <div>
            <div>${i.title}</div>
            <div style="color:var(--white-muted);font-size:0.75rem">Size: ${i.size} × ${i.quantity}</div>
          </div>
          <div style="color:var(--gold)">$${(i.price * i.quantity).toFixed(2)}</div>
        </div>`).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;font-family:var(--font-display);font-size:1.2rem;color:var(--gold);margin-top:1rem">
      <span>Total</span><span>$${order.total?.toFixed(2)}</span>
    </div>
    ${order.paymentProof ? `<div style="margin-top:1.5rem"><div style="color:var(--white-muted);font-size:0.65rem;letter-spacing:0.2em;margin-bottom:0.5rem">PAYMENT PROOF</div><img src="${order.paymentProof}" style="max-width:200px;border:1px solid var(--border)"></div>` : ''}
  `;
  modal.classList.add('open');
};

document.getElementById('order-detail-close')?.addEventListener('click', () => {
  document.getElementById('order-detail-modal').classList.remove('open');
});

// ── Real-time Notifications ──
let notificationCount = 0;
let notifiedOrders = new Set();

function initNotifications() {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(20));
  onSnapshot(q, snap => {
    snap.docChanges().forEach(change => {
      if (change.type === 'added' && !notifiedOrders.has(change.doc.id)) {
        const order = change.doc.data();
        notifiedOrders.add(change.doc.id);
        if (notificationCount > 0) { // skip on first load
          addNotification(`New order from ${order.name} — $${order.total?.toFixed(2)}`);
        }
        notificationCount++;
      }
    });
  });
}

function addNotification(msg) {
  const list = document.getElementById('notification-list');
  const badge = document.getElementById('notification-badge');

  const item = document.createElement('div');
  item.className = 'notification-item';
  item.style.cssText = 'padding:0.75rem 1rem;border-bottom:1px solid var(--border-soft);font-size:0.8rem;animation:fadeUp 0.3s ease';
  item.innerHTML = `
    <div style="color:var(--gold);font-size:0.65rem;letter-spacing:0.1em;margin-bottom:0.2rem">${new Date().toLocaleTimeString()}</div>
    <div>${msg}</div>`;
  list?.prepend(item);

  const current = parseInt(badge?.textContent || '0') + 1;
  if (badge) { badge.textContent = current; badge.style.display = 'flex'; }

  // Play notification sound
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } catch {}

  showToast(msg, 'success');
}

document.getElementById('notification-btn')?.addEventListener('click', () => {
  const dropdown = document.getElementById('notification-dropdown');
  dropdown?.classList.toggle('open');
  const badge = document.getElementById('notification-badge');
  if (badge) { badge.textContent = '0'; badge.style.display = 'none'; }
});

// ── Telegram Settings ──
document.getElementById('telegram-form')?.addEventListener('submit', e => {
  e.preventDefault();
  TELEGRAM_BOT_TOKEN = document.getElementById('tg-token').value;
  TELEGRAM_CHAT_ID   = document.getElementById('tg-chat').value;
  localStorage.setItem('pk_tg_token', TELEGRAM_BOT_TOKEN);
  localStorage.setItem('pk_tg_chat', TELEGRAM_CHAT_ID);
  showToast('Telegram settings saved!', 'success');
});

// ── Homepage Content ──
document.getElementById('homepage-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await updateDoc(doc(db, 'settings', 'homepage'), {
      heroTitle:    document.getElementById('hero-title-input').value,
      heroSubtitle: document.getElementById('hero-sub-input').value,
      saleBanner:   document.getElementById('sale-banner-input').value,
      updatedAt:    serverTimestamp()
    });
    showToast('Homepage updated!', 'success');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
});

// ── Toast ──
function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span><span>${msg}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('toast-show'), 10);
  setTimeout(() => { toast.classList.remove('toast-show'); setTimeout(() => toast.remove(), 400); }, 4000);
}
window.showToast = showToast;

// ── Init ──
function initAdmin() {
  showSection('dashboard');
  initStats();
  initProducts();
  initOrders();
  initNotifications();

  // Populate telegram fields
  document.getElementById('tg-token').value = TELEGRAM_BOT_TOKEN;
  document.getElementById('tg-chat').value  = TELEGRAM_CHAT_ID;
}
