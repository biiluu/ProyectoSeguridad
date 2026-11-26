function obtenerUsuarioCarrito() {
  try {
    const usuario = localStorage.getItem('user');
    return usuario ? JSON.parse(usuario) : null;
  } catch (error) {
    console.error('No se pudieron leer los datos del usuario:', error);
    return null;
  }
}
const cart = {
  products: [],
  shippingMode: 'store', // 'store' | 'home'
  shippingCost: 0,

  async updateBadge() {
    const user = obtenerUsuarioCarrito();
    const badge = document.getElementById('cart-badge');
    if (!badge) return;

    if (!user || !user.idUsuario) {
      badge.textContent = '0';
      return;
    }

    try {
      const res = await window.api.get(`/api/Carrito/cantidad-articulos/${encodeURIComponent(user.idUsuario)}`);
      if (res.ok) {
        const count = await res.json();
        badge.textContent = count || '0';
      } else {
        badge.textContent = '0';
      }
    } catch {
      badge.textContent = '0';
    }
  },

  open() {
    const user = obtenerUsuarioCarrito();
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    const backdrop = document.getElementById('cart-backdrop');
    if (backdrop) {
      backdrop.classList.add('open');
      this.loadCart();
    }
  },

  close() {
    const backdrop = document.getElementById('cart-backdrop');
    if (backdrop) {
      backdrop.classList.remove('open');
    }
  },

  async loadCart() {
    const user = obtenerUsuarioCarrito();
    if (!user) return;

    const listContainer = document.getElementById('cart-items-container');
    const emptyNotice = document.getElementById('cart-empty-notice');
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    const shippingEl = document.getElementById('cart-shipping');
    const checkoutBtn = document.getElementById('cart-checkout-btn');

    try {
      const res = await window.api.get(`/api/Carrito/${encodeURIComponent(user.idUsuario)}`);
      if (!res.ok) {
        this.products = [];
      } else {
        this.products = await res.json();
      }

      this.render();
      this.updateBadge();
    } catch (e) {
      console.error('Error cargando carrito:', e);
      this.products = [];
      this.render();
    }
  },

  render() {
    const listContainer = document.getElementById('cart-items-container');
    const emptyNotice = document.getElementById('cart-empty-notice');
    const shippingBlock = document.querySelector('.cart-shipping-block');
    const headerCount = document.getElementById('cart-header-count');
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    const shippingEl = document.getElementById('cart-shipping');
    const checkoutBtn = document.getElementById('cart-checkout-btn');

    if (!listContainer) return;

    listContainer.innerHTML = '';

    const totalQty = this.products.reduce((acc, p) => acc + (parseInt(p.cantidad, 10) || 1), 0);
    if (headerCount) {
      headerCount.textContent = totalQty === 0
        ? 'Sin artículos seleccionados'
        : `${totalQty} ${totalQty === 1 ? 'artículo' : 'artículos'} en tu bolsa`;
    }

    if (this.products.length === 0) {
      if (emptyNotice) emptyNotice.style.display = 'block';
      if (shippingBlock) shippingBlock.style.display = 'none';
      if (subtotalEl) subtotalEl.textContent = '$0.00';
      if (totalEl) totalEl.textContent = '$0.00';
      if (shippingEl) shippingEl.textContent = 'Gratis';
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    if (emptyNotice) emptyNotice.style.display = 'none';
    if (shippingBlock) shippingBlock.style.display = 'block';
    if (checkoutBtn) checkoutBtn.disabled = false;

    let subtotal = 0;

    this.products.forEach(item => {
      const lineTotal = item.precio * item.cantidad;
      subtotal += lineTotal;

      const imgSrc = item.fotoBase64
        ? (item.fotoBase64.startsWith('data:') ? item.fotoBase64 : `data:image/jpeg;base64,${item.fotoBase64}`)
        : 'assets/BULOVAWATCH.jpg';

      // Prevención total de XSS: Construcción nativa del DOM y eliminación de inline event handlers
      const itemEl = document.createElement('div');
      itemEl.className = 'cart-item';

      const img = document.createElement('img');
      img.src = imgSrc;
      img.alt = item.tituloProducto || 'Producto MercaUca';
      img.className = 'cart-item-thumb';

      const details = document.createElement('div');
      details.className = 'cart-item-details';

      const title = document.createElement('div');
      title.className = 'cart-item-title';
      title.textContent = item.tituloProducto || 'Sin título';

      const sku = document.createElement('div');
      sku.className = 'cart-item-sku';
      sku.textContent = `SKU #${item.idProducto}`;

      const priceQty = document.createElement('div');
      priceQty.className = 'cart-item-price-qty';
      priceQty.textContent = `${parseInt(item.cantidad, 10) || 1} × $${Number(item.precio || 0).toFixed(2)}`;

      details.appendChild(title);
      details.appendChild(sku);
      details.appendChild(priceQty);

      // Verificación visual de stock en el carrito
      if (item.stockDisponible !== undefined) {
        const stockNotice = document.createElement('div');
        stockNotice.style.fontSize = '0.73rem';
        stockNotice.style.fontWeight = '600';
        stockNotice.style.marginTop = '4px';

        if (item.stockDisponible <= 0) {
          stockNotice.textContent = '● Agotado';
          stockNotice.style.color = '#DC2626';
          itemEl.style.opacity = '0.75';
        } else if (item.cantidad > item.stockDisponible) {
          stockNotice.textContent = `Solo ${item.stockDisponible} disp. (tienes ${item.cantidad})`;
          stockNotice.style.color = '#D97706';
        } else {
          stockNotice.textContent = `● Disponible (${item.stockDisponible} en stock)`;
          stockNotice.style.color = '#059669';
        }
        details.appendChild(stockNotice);
      }

      const rightCol = document.createElement('div');
      rightCol.className = 'cart-item-right';

      const totalItemEl = document.createElement('div');
      totalItemEl.className = 'cart-item-total';
      totalItemEl.textContent = `$${lineTotal.toFixed(2)}`;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'cart-remove-btn';
      removeBtn.title = 'Quitar del carrito';
      removeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      `;
      removeBtn.addEventListener('click', () => {
        this.removeItem(item.idProducto);
      });

      rightCol.appendChild(removeBtn);
      rightCol.appendChild(totalItemEl);

      itemEl.appendChild(img);
      itemEl.appendChild(details);
      itemEl.appendChild(rightCol);

      listContainer.appendChild(itemEl);
    });

    this.shippingCost = this.shippingMode === 'home' ? 9.90 : 0.00;
    const total = subtotal + this.shippingCost;

    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (shippingEl) shippingEl.textContent = this.shippingCost === 0 ? 'Gratis' : `$${this.shippingCost.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
  },

  setShippingMode(mode) {
    this.shippingMode = mode;
    const optStore = document.getElementById('opt-shipping-store');
    const optHome = document.getElementById('opt-shipping-home');
    if (optStore) optStore.classList.toggle('selected', mode === 'store');
    if (optHome) optHome.classList.toggle('selected', mode === 'home');
    this.render();
  },

  async removeItem(productId) {
    const user = obtenerUsuarioCarrito();
    if (!user) return;

    try {
      const res = await window.api.delete(`/api/Carrito/eliminar-articulo/${encodeURIComponent(user.idUsuario)}/${encodeURIComponent(productId)}`);
      if (res.ok) {
        window.showToast('Artículo eliminado del carrito', 'info');
        this.loadCart();
      } else {
        window.showToast('No se pudo eliminar el artículo', 'error');
      }
    } catch (e) {
      console.error(e);
      window.showToast('Error al conectar con el servidor', 'error');
    }
  },

  async addItem(idProductoVariante, cantidad, precio) {
    const user = obtenerUsuarioCarrito();
    if (!user) {
      window.location.href = 'login.html';
      return false;
    }

    try {
      const payload = {
        idUsuario: user.idUsuario,
        idProductoVariante: idProductoVariante,
        cantidad: parseInt(cantidad, 10),
        precio: parseFloat(precio),
        moneda: 'USD'
      };

      const res = await window.api.post('/api/Carrito/agregar-articulo', payload);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        window.showToast(data.message || data.mensaje || 'Error al agregar al carrito.', 'error');
        return false;
      }

      window.showToast(data.message || data.mensaje || 'Producto agregado al carrito ✅', 'success');
      this.updateBadge();
      return true;
    } catch (e) {
      console.error(e);
      window.showToast('Error al agregar al carrito.', 'error');
      return false;
    }
  },

  promptCheckout() {
    if (this.products.length === 0) return;

    // Validación preventiva de existencias antes de confirmar compra
    const agotado = this.products.find(p => p.stockDisponible !== undefined && p.stockDisponible <= 0);
    if (agotado) {
      window.showToast(`"${agotado.tituloProducto}" está agotado. Debes eliminarlo de tu carrito.`, 'error');
      return;
    }

    const excede = this.products.find(p => p.stockDisponible !== undefined && p.cantidad > p.stockDisponible);
    if (excede) {
      window.showToast(`"${excede.tituloProducto}" supera las existencias disponibles (${excede.stockDisponible} en stock).`, 'error');
      return;
    }

    let modal = document.getElementById('checkout-confirm-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'checkout-confirm-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-card">
          <h3 class="modal-title">Confirmar compra</h3>
          <p class="modal-text">
            Vas a realizar el pedido por <strong id="checkout-confirm-total">$0.00</strong>.
            <br>Se enviará una factura detallada a tu correo institucional.
          </p>
          <div class="modal-actions">
            <button id="btn-cancel-checkout" class="btn-modal-secondary">Cancelar</button>
            <button id="btn-execute-checkout" class="btn-modal-primary" style="background:#DC2626;">Sí, confirmar compra</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#btn-cancel-checkout').onclick = () => modal.remove();
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
      modal.querySelector('#btn-execute-checkout').onclick = () => {
        modal.remove();
        cart.finalizeCheckout();
      };
    }

    const totalEl = document.getElementById('cart-total');
    modal.querySelector('#checkout-confirm-total').textContent = totalEl ? totalEl.textContent : '$0.00';
  },

  async finalizeCheckout() {
    const user = obtenerUsuarioCarrito();
    if (!user) return;

    const checkoutBtn = document.getElementById('cart-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'Procesando...';
    }

    try {
      const res = await window.api.post(`/api/Carrito/finalizar-compra/${encodeURIComponent(user.idUsuario)}`, {});
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        this.products = [];
        this.render();
        this.updateBadge();
        this.showSuccessModal();
      } else {
        window.showToast(data.message || data.mensaje || 'No se pudo finalizar la compra.', 'error');
        this.loadCart();
      }
    } catch (e) {
      console.error(e);
      window.showToast('Error de conexión al finalizar pedido.', 'error');
    } finally {
      if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Terminar Pedido';
      }
    }
  },

  showSuccessModal() {
    let modal = document.getElementById('checkout-success-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'checkout-success-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-card">
          <div class="success-icon">✔</div>
          <h3 class="modal-title">¡Compra realizada!</h3>
          <p class="modal-text">
            Te hemos enviado un correo electrónico con el resumen detallado de tu pedido.
          </p>
          <button id="btn-success-close" class="btn-modal-primary">Aceptar</button>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#btn-success-close').onclick = () => {
        modal.remove();
        cart.close();
      };
      modal.onclick = (e) => { if (e.target === modal) { modal.remove(); cart.close(); } };
    }
  }
};

window.cart = cart;

