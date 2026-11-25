// Controlador de la Página de Detalle de Producto
let productoActual = null;
let cantidad = 1;

document.addEventListener('DOMContentLoaded', () => {
  if (window.auth && typeof window.auth.initTopbarUser === 'function') {
    window.auth.initTopbarUser();
  } else {
    const userBtn = document.getElementById('topbar-user-btn');
    if (userBtn) {
      userBtn.onclick = () => {
        window.location.href = 'registro.html';
      };
    }
  }

  if (window.cart && typeof window.cart.updateBadge === 'function') {
    window.cart.updateBadge();
  }

  const urlParams = new URLSearchParams(window.location.search);
  const idProducto = urlParams.get('id');

  if (!idProducto) {
    const loading = document.getElementById('pd-loading');
    if (loading) loading.textContent = 'Producto no especificado en la URL.';
    return;
  }

  cargarDetalle(idProducto);
});

async function cargarDetalle(id) {
  const loading = document.getElementById('pd-loading');
  const content = document.getElementById('pd-content');

  try {
    const res = await fetch(`${window.API_URL}/api/Productos/${encodeURIComponent(id)}`);
    if (!res.ok) {
      if (loading) loading.textContent = 'Producto no encontrado o fuera de catálogo.';
      return;
    }

    const data = await res.json();
    productoActual = data;

    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'grid';

    document.getElementById('pd-title').textContent = data.tituloProducto || 'Producto MercaUca';
    document.getElementById('pd-sku').textContent = data.idProductoVariante || data.idProducto;
    document.getElementById('pd-category').textContent = data.nombreCategoria || data.idCategoria || 'Catálogo General';

    const brandEl = document.getElementById('pd-brand');
    const condEl = document.getElementById('pd-condition');
    const sellerEl = document.getElementById('pd-seller');
    if (brandEl) brandEl.textContent = data.marca || 'Genérica';
    if (condEl) condEl.textContent = data.nombreCondicion || data.idCondicion || 'N/A';
    if (sellerEl) sellerEl.textContent = data.nombreVendedor || data.idVendedor || 'MercaUca';

    const unitPrice = parseFloat(data.precio) || 0.0;
    document.getElementById('pd-unit-price').textContent = `$${unitPrice.toFixed(2)}`;

    const imgEl = document.getElementById('pd-img');
    if (imgEl) {
      imgEl.src = data.fotoBase64
        ? (data.fotoBase64.startsWith('data:') ? data.fotoBase64 : `data:image/jpeg;base64,${data.fotoBase64}`)
        : 'assets/BULOVAWATCH.jpg';
      imgEl.alt = data.tituloProducto || 'Producto MercaUca';
    }

    document.getElementById('pd-desc').textContent = data.descripcion || 'Sin descripción disponible por el momento.';

    const stockDisponible = parseInt(data.stock, 10) || 0;
    const stockPill = document.getElementById('pd-stock-pill');
    const stockHint = document.getElementById('pd-stock-max-hint');
    const btnPlus = document.getElementById('pd-btn-plus');
    const btnMinus = document.getElementById('pd-btn-minus');
    const addBtn = document.getElementById('pd-add-to-cart');

    if (stockDisponible <= 0) {
      cantidad = 0;
      if (stockPill) {
        stockPill.textContent = '● Agotado (Sin existencias)';
        stockPill.style.background = '#FEE2E2';
        stockPill.style.color = '#DC2626';
        stockPill.style.borderColor = '#FECACA';
      }
      if (stockHint) {
        stockHint.textContent = 'No hay unidades disponibles en este momento.';
        stockHint.style.color = '#DC2626';
      }
      if (btnPlus) btnPlus.disabled = true;
      if (btnMinus) btnMinus.disabled = true;
      if (addBtn) {
        addBtn.disabled = true;
        addBtn.style.background = '#94A3B8';
        addBtn.style.borderColor = '#64748B';
        addBtn.style.cursor = 'not-allowed';
        addBtn.querySelector('.pd-add-main').textContent = 'Artículo Agotado';
        addBtn.querySelector('.pd-add-icon').textContent = '🚫';
        document.getElementById('pd-btn-total-sub').textContent = 'No disponible para compra';
      }
    } else {
      cantidad = 1;
      if (stockPill) {
        stockPill.textContent = stockDisponible <= 3
          ? `● ¡Últimas ${stockDisponible} unidades disponibles!`
          : `✓ Disponible · ${stockDisponible} en existencias`;
        stockPill.style.background = stockDisponible <= 3 ? '#FEF3C7' : '#DCFCE7';
        stockPill.style.color = stockDisponible <= 3 ? '#D97706' : '#15803D';
        stockPill.style.borderColor = stockDisponible <= 3 ? '#FDE68A' : '#BBF7D0';
      }
      if (stockHint) {
        stockHint.textContent = `Máximo disponible: ${stockDisponible} unidades`;
        stockHint.style.color = '#64748B';
      }
      if (addBtn) {
        addBtn.disabled = false;
        addBtn.style.background = '';
        addBtn.style.borderColor = '';
        addBtn.style.cursor = 'pointer';
        addBtn.querySelector('.pd-add-main').textContent = 'Agregar al carrito';
        addBtn.querySelector('.pd-add-icon').textContent = '🛒';
      }

      btnPlus.onclick = () => {
        if (cantidad < stockDisponible) {
          cantidad++;
          actualizarResumen();
        } else {
          window.showToast(`Has alcanzado las ${stockDisponible} unidades disponibles en inventario.`, 'info');
        }
      };

      btnMinus.onclick = () => {
        if (cantidad > 1) {
          cantidad--;
          actualizarResumen();
        }
      };
    }

    actualizarResumen();

    addBtn.onclick = async () => {
      if (!productoActual) return;
      const stockActual = parseInt(productoActual.stock, 10) || 0;
      if (stockActual <= 0) {
        window.showToast('Este producto se encuentra agotado.', 'error');
        return;
      }

      if (cantidad > stockActual) {
        window.showToast(`Solo puedes comprar hasta ${stockActual} unidades.`, 'error');
        return;
      }

      if (!window.cart || typeof window.cart.addItem !== 'function') {
        window.showToast('El carrito de compras estará disponible al integrar el módulo de carrito.', 'info');
        return;
      }

      addBtn.disabled = true;
      const prevText = addBtn.querySelector('.pd-add-main').textContent;
      addBtn.querySelector('.pd-add-main').textContent = 'Agregando...';

      const unit = parseFloat(productoActual.precio) || 0;
      const total = unit * cantidad;
      const variantId = productoActual.idProductoVariante || productoActual.idProducto;

      const ok = await window.cart.addItem(variantId, cantidad, total);

      addBtn.disabled = false;
      addBtn.querySelector('.pd-add-main').textContent = prevText;

      if (ok && typeof window.cart.open === 'function') {
        window.cart.open();
      }
    };
  } catch (err) {
    console.error('Error al cargar detalle:', err);
    if (loading) loading.textContent = 'Error al consultar datos del producto.';
  }
}

function actualizarResumen() {
  if (!productoActual) return;
  const stockDisponible = parseInt(productoActual.stock, 10) || 0;
  const unit = parseFloat(productoActual.precio) || 0;
  const total = unit * cantidad;

  document.getElementById('pd-qty-value').textContent = cantidad;
  document.getElementById('pd-calc-label').textContent = `${cantidad} x $${unit.toFixed(2)}`;
  document.getElementById('pd-calc-total').textContent = `$${total.toFixed(2)}`;
  document.getElementById('pd-btn-total-sub').textContent = stockDisponible > 0
    ? `Total estimado: $${total.toFixed(2)} USD`
    : 'No disponible para compra';

  const btnPlus = document.getElementById('pd-btn-plus');
  const btnMinus = document.getElementById('pd-btn-minus');
  if (btnPlus) btnPlus.disabled = (stockDisponible <= 0 || cantidad >= stockDisponible);
  if (btnMinus) btnMinus.disabled = (stockDisponible <= 0 || cantidad <= 1);
}
