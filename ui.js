// ============================================================
// PRIME KITS — UI Utilities (ui.js)
// Shared UI helpers across all pages
// ============================================================

// ── Smooth page transition ──
export function navigateTo(url) {
  document.body.style.transition = 'opacity 0.3s ease';
  document.body.style.opacity = '0';
  setTimeout(() => { window.location.href = url; }, 300);
}

// ── Format currency ──
export function formatPrice(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// ── Format date ──
export function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Generate order ID ──
export function generateOrderId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PK-${ts}-${rand}`;
}

// ── Skeleton helper ──
export function skeletonGrid(container, count = 4, height = 400) {
  container.innerHTML = Array(count)
    .fill(`<div class="skeleton" style="height:${height}px;border-radius:2px;"></div>`)
    .join('');
}

// ── Animate number counter ──
export function animateCounter(el, target, duration = 1200) {
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) { el.textContent = target.toLocaleString(); clearInterval(timer); return; }
    el.textContent = Math.floor(start).toLocaleString();
  }, 16);
}

// ── File → base64 for upload ──
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Lazy image loading ──
export function initLazyImages() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const img = e.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        obs.unobserve(img);
      }
    });
  }, { rootMargin: '200px' });

  document.querySelectorAll('img[data-src]').forEach(img => obs.observe(img));
}

// ── Shipping fee lookup ──
export function getShippingFee(method) {
  const fees = { 'jnt': 2.5, 'vireak-buntham': 3.0, 'zto': 2.0 };
  return fees[method] || 0;
}

// ── Export all ──
window.navigateTo   = navigateTo;
window.formatPrice  = formatPrice;
window.formatDate   = formatDate;
window.generateOrderId = generateOrderId;
