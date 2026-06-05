// ============================================================
// PRIME KITS — Main Script (script.js)
// Homepage, products, search, UI interactions
// ============================================================

import { db, collection, getDocs, onSnapshot, query, orderBy, limit, doc } from './firebase-config.js';

// ── Page Loader ──
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('page-loader')?.classList.add('hidden');
  }, 1800);
});

// ── Custom Cursor ──
const cursor = document.getElementById('cursor');
const ring   = document.getElementById('cursor-ring');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  if (cursor) { cursor.style.left = mx + 'px'; cursor.style.top = my + 'px'; }
});

function animateRing() {
  if (ring) {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
  }
  requestAnimationFrame(animateRing);
}
animateRing();

document.querySelectorAll('a,button,.product-card,.size-pill,.size-option,.category-card').forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursor?.style.setProperty('width', '6px');
    cursor?.style.setProperty('height', '6px');
    ring?.style.setProperty('width', '50px');
    ring?.style.setProperty('height', '50px');
  });
  el.addEventListener('mouseleave', () => {
    cursor?.style.setProperty('width', '10px');
    cursor?.style.setProperty('height', '10px');
    ring?.style.setProperty('width', '36px');
    ring?.style.setProperty('height', '36px');
  });
});

// ── Navbar ──
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar?.classList.toggle('scrolled', window.scrollY > 60);
});

// ── Hamburger / Mobile Menu ──
const hamburger   = document.getElementById('hamburger');
const mobileMenu  = document.getElementById('mobile-menu');
const mobileClose = document.getElementById('mobile-close');

hamburger?.addEventListener('click', () => {
  mobileMenu?.classList.add('open');
  document.body.style.overflow = 'hidden';
});
mobileClose?.addEventListener('click', () => {
  mobileMenu?.classList.remove('open');
  document.body.style.overflow = '';
});
mobileMenu?.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  });
});

// ── Search Overlay ──
const searchOverlay  = document.getElementById('search-overlay');
const searchInput    = document.getElementById('search-input');
const searchResults  = document.getElementById('search-results');

document.getElementById('search-btn')?.addEventListener('click', () => {
  searchOverlay?.classList.add('open');
  setTimeout(() => searchInput?.focus(), 100);
});
document.getElementById('search-close')?.addEventListener('click', () => {
  searchOverlay?.classList.remove('open');
  if (searchInput) searchInput.value = '';
  if (searchResults) searchResults.innerHTML = '';
});

let allProducts = [];

searchInput?.addEventListener('input', async () => {
  const q = searchInput.value.toLowerCase().trim();
  if (!q) { searchResults.innerHTML = ''; return; }

  if (!allProducts.length) {
    const snap = await getDocs(collection(db, 'products'));
    allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  const results = allProducts.filter(p =>
    p.title?.toLowerCase().includes(q) ||
    p.tags?.some(t => t.toLowerCase().includes(q)) ||
    p.category?.toLowerCase().includes(q)
  ).slice(0, 6);

  searchResults.innerHTML = results.length
    ? results.map(p => `
        <a href="product.html?id=${p.id}" class="search-result-card" onclick="document.getElementById('search-overlay').classList.remove('open')">
          <img src="${p.images?.[0] || 'assets/placeholder.jpg'}" alt="${p.title}" style="width:60px;height:60px;object-fit:cover;border:1px solid var(--border)">
          <div>
            <div style="font-family:var(--font-display);font-size:0.9rem;">${p.title}</div>
            <div style="color:var(--gold);font-family:var(--font-ui);font-size:0.8rem;">$${p.price?.toFixed(2)}</div>
          </div>
        </a>`).join('')
    : '<p style="color:var(--white-muted);font-family:var(--font-ui);font-size:0.75rem;letter-spacing:0.2em;">NO RESULTS FOUND</p>';
});

// ── Floating Particles ──
function createParticles() {
  const container = document.querySelector('.hero-particles');
  if (!container) return;
  for (let i = 0; i < 25; i++) {
    const p = document.createElement('div');
    p.className = 'hero-particle';
    const size = Math.random() * 3 + 1;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      animation-duration:${8 + Math.random() * 12}s;
      animation-delay:${Math.random() * 8}s;
    `;
    container.appendChild(p);
  }
}

// ── Product Card Builder ──
function buildProductCard(product) {
  const hasDiscount = product.oldPrice && product.oldPrice > product.price;
  const pct = hasDiscount ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const isNew = product.tags?.includes('new');

  return `
    <div class="product-card" data-id="${product.id}">
      <div class="product-card-img">
        <img src="${product.images?.[0] || 'assets/placeholder.jpg'}" alt="${product.title}" loading="lazy">
        ${isNew ? '<span class="product-badge new">New</span>' : ''}
        ${hasDiscount ? `<span class="product-badge sale">-${pct}%</span>` : ''}
        <div class="product-quick-add">
          <div class="size-pills">
            ${(product.sizes || ['S','M','L','XL']).map(s =>
              `<button class="size-pill" data-size="${s}">${s}</button>`
            ).join('')}
          </div>
          <button class="btn-gold" style="padding:0.6rem 1rem;font-size:0.65rem;width:100%"
            onclick="quickAdd(event, '${product.id}')">
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
      <div class="product-card-body">
        <h3><a href="product.html?id=${product.id}">${product.title}</a></h3>
        <div class="product-pricing">
          <span class="product-price">$${product.price?.toFixed(2)}</span>
          ${hasDiscount ? `<span class="product-old-price">$${product.oldPrice?.toFixed(2)}</span>` : ''}
          ${hasDiscount ? `<span class="product-sale-pct">-${pct}%</span>` : ''}
        </div>
      </div>
    </div>`;
}

// Quick add to cart from card
window.quickAdd = function(e, productId) {
  e.preventDefault(); e.stopPropagation();
  const card = e.target.closest('.product-card');
  const activeSize = card?.querySelector('.size-pill.active')?.dataset.size;
  if (!activeSize) {
    showToast('Please select a size', 'error');
    return;
  }
  const product = allProducts.find(p => p.id === productId);
  if (product) addToCart(product, activeSize);
};

// Size pill selection
document.addEventListener('click', e => {
  if (e.target.classList.contains('size-pill')) {
    const pills = e.target.closest('.size-pills')?.querySelectorAll('.size-pill');
    pills?.forEach(p => p.classList.remove('active'));
    e.target.classList.add('active');
  }
});

// ── Load Products ──
async function loadFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;

  grid.innerHTML = Array(4).fill('<div class="skeleton skeleton-card"></div>').join('');

  const q = query(collection(db, 'products'), limit(8));
  const snap = await getDocs(q);
  allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  grid.innerHTML = allProducts.map(buildProductCard).join('');
}

async function loadNewArrivals() {
  const grid = document.getElementById('new-arrivals-grid');
  if (!grid) return;

  grid.innerHTML = Array(4).fill('<div class="skeleton skeleton-card"></div>').join('');
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(4));
  const snap = await getDocs(q);
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  grid.innerHTML = products.map(buildProductCard).join('');
}

async function loadTrending() {
  const grid = document.getElementById('trending-grid');
  if (!grid) return;

  grid.innerHTML = Array(4).fill('<div class="skeleton skeleton-card"></div>').join('');
  const snap = await getDocs(query(collection(db, 'products'), limit(4)));
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  grid.innerHTML = products.map(buildProductCard).join('');
}

// ── Intersection Observer (scroll animations) ──
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animation = 'fadeUp 0.7s ease both';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.section-label, .section-title, .product-card, .category-card, .stat-card').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
  });
}

// ── Countdown Timer for Sale ──
function startCountdown(endDate) {
  const el = document.getElementById('sale-countdown');
  if (!el) return;
  function update() {
    const diff = endDate - Date.now();
    if (diff <= 0) { el.textContent = 'ENDED'; return; }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  update();
  setInterval(update, 1000);
}

// ── Category Filter ──
let activeCategory = 'all';
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = btn.dataset.cat;
    filterProducts();
  });
});

function filterProducts() {
  const cards = document.querySelectorAll('#featured-grid .product-card');
  cards.forEach(card => {
    const id = card.dataset.id;
    const product = allProducts.find(p => p.id === id);
    if (activeCategory === 'all' || product?.category === activeCategory) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  loadFeatured();
  loadNewArrivals();
  loadTrending();
  initScrollAnimations();
  startCountdown(Date.now() + 2 * 24 * 3600 * 1000);
});
