// ============================================================
// PRIME KITS — Cart System (cart.js)
// Handles all cart operations with localStorage persistence
// ============================================================

const CART_KEY = 'primekits_cart';

// Get cart from localStorage
function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

// Save cart to localStorage
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartUI();
}

// Add item to cart
function addToCart(product, size, quantity = 1) {
  const cart = getCart();
  const key = `${product.id}_${size}`;
  const existing = cart.find(i => i.key === key);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      key,
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.images?.[0] || '',
      size,
      quantity
    });
  }
  saveCart(cart);
  showToast(`${product.title} added to cart`, 'success');
}

// Remove item from cart
function removeFromCart(key) {
  const cart = getCart().filter(i => i.key !== key);
  saveCart(cart);
}

// Update quantity
function updateQty(key, delta) {
  const cart = getCart();
  const item = cart.find(i => i.key === key);
  if (item) {
    item.quantity = Math.max(1, item.quantity + delta);
    saveCart(cart);
  }
}

// Clear cart
function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartUI();
}

// Get cart total
function getCartTotal() {
  return getCart().reduce((sum, i) => sum + i.price * i.quantity, 0);
}

// Get cart count
function getCartCount() {
  return getCart().reduce((sum, i) => sum + i.quantity, 0);
}

// Update all cart UI elements
function updateCartUI() {
  const count = getCartCount();
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
  renderCartDrawer();
}

// Render cart drawer items
function renderCartDrawer() {
  const list = document.getElementById('cart-items-list');
  const totalEl = document.getElementById('cart-total');
  const emptyEl = document.getElementById('cart-empty');
  const cart = getCart();

  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'flex';
    if (totalEl) totalEl.textContent = '$0.00';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  list.innerHTML = cart.map(item => `
    <div class="cart-item" data-key="${item.key}">
      <div class="cart-item-img">
        <img src="${item.image || 'assets/placeholder.jpg'}" alt="${item.title}" loading="lazy">
      </div>
      <div class="cart-item-info">
        <h4>${item.title}</h4>
        <span class="cart-item-size">Size: ${item.size}</span>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="updateQty('${item.key}', -1)">−</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" onclick="updateQty('${item.key}', 1)">+</button>
        </div>
        <span class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.key}')">✕</button>
    </div>
  `).join('');

  if (totalEl) totalEl.textContent = `$${getCartTotal().toFixed(2)}`;
}

// Toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('toast-show'), 10);
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// Toggle cart drawer
function toggleCart() {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  if (!drawer) return;
  drawer.classList.toggle('open');
  overlay?.classList.toggle('active');
  document.body.style.overflow = drawer.classList.contains('open') ? 'hidden' : '';
}

// Proceed to checkout
function goToCheckout() {
  if (getCart().length === 0) {
    showToast('Your cart is empty', 'error');
    return;
  }
  window.location.href = 'checkout.html';
}

// Init on DOM ready
document.addEventListener('DOMContentLoaded', updateCartUI);

// Expose globally
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQty = updateQty;
window.clearCart = clearCart;
window.getCart = getCart;
window.getCartTotal = getCartTotal;
window.getCartCount = getCartCount;
window.toggleCart = toggleCart;
window.goToCheckout = goToCheckout;
window.showToast = showToast;
