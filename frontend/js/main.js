// Inicializador Principal de la Página de Inicio (Catálogo Público y Novedades)
let categoriaActiva = '';

document.addEventListener('DOMContentLoaded', () => {
  if (window.auth && typeof window.auth.initTopbarUser === 'function') {
    window.auth.initTopbarUser();
  } else {
    initTopbarFallback();
  }

  if (window.cart && typeof window.cart.updateBadge === 'function') {
    window.cart.updateBadge();
  }

  initSearch();
  if (typeof window.initSlider === 'function') {
    window.initSlider();
  }
  cargarFiltrosCatalogo();
  cargarCatalogo();
});

function initTopbarFallback() {
  const userBtn = document.getElementById('topbar-user-btn');
  if (userBtn) {
    userBtn.onclick = () => {
      window.location.href = 'registro.html';
    };
  }
}

function initSearch() {
  const searchInput = document.getElementById('search-input');
  const searchPopup = document.getElementById('search-popup');
  const searchList = document.getElementById('search-list');
  const searchStatus = document.getElementById('search-status');

  if (!searchInput || !searchPopup) return;

  let debounceTimer = null;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    clearTimeout(debounceTimer);

    if (!query) {
      searchPopup.classList.remove('active');
      return;
    }

    debounceTimer = setTimeout(() => {
      ejecutarBusqueda(query);
    }, 280);
  });

  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim() && searchList.children.length > 0) {
      searchPopup.classList.add('active');
    }
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchPopup.contains(e.target)) {
      searchPopup.classList.remove('active');
    }
  });

  async function ejecutarBusqueda(query) {
    searchPopup.classList.add('active');
    searchStatus.style.display = 'block';
    searchStatus.textContent = 'Buscando productos…';
    searchList.innerHTML = '';

    try {
      const res = await fetch(`${window.API_URL}/api/Search/buscar?query=${encodeURIComponent(query)}`);
      if (!res.ok) {
        searchStatus.textContent = `Sin resultados para "${query}"`;
        return;
      }

      const productos = await res.json();

      if (!Array.isArray(productos) || productos.length === 0) {
        searchStatus.textContent = `Sin resultados para "${query}"`;
        return;
      }

      searchStatus.style.display = 'none';

      productos.forEach(p => {
        const li = document.createElement('li');
        li.className = 'topbar__search-item';

        const img = document.createElement('img');
        img.className = 'topbar__search-thumb';
        img.src = p.fotoBase64
          ? (p.fotoBase64.startsWith('data:') ? p.fotoBase64 : `data:image/jpeg;base64,${p.fotoBase64}`)
          : 'assets/BULOVAWATCH.jpg';
        img.alt = p.tituloProducto || 'Producto MercaUca';

        const info = document.createElement('div');
        info.className = 'topbar__search-info';

        const title = document.createElement('span');
        title.className = 'topbar__search-title';
        title.textContent = p.tituloProducto || 'Sin título';

        const price = document.createElement('span');
        price.className = 'topbar__search-price';
        price.textContent = `$${Number(p.precio || 0).toFixed(2)} USD`;

        info.appendChild(title);
        info.appendChild(price);

        const arrow = document.createElement('span');
        arrow.style.cssText = 'color: #94A3B8; font-size: 0.9rem;';
        arrow.textContent = '➔';

        li.appendChild(img);
        li.appendChild(info);
        li.appendChild(arrow);

        li.onmousedown = () => {
          window.location.href = `producto.html?id=${encodeURIComponent(p.idProducto)}`;
        };
        searchList.appendChild(li);
      });
    } catch (err) {
      console.error(err);
      searchStatus.textContent = 'Error al realizar la búsqueda.';
    }
  }
}

async function cargarFiltrosCatalogo() {
  const container = document.getElementById('catalog-filters');
  if (!container) return;

  const crearBoton = (idCat, nombreCat, activo = false) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `catalog-filter-pill${activo ? ' is-active' : ''}`;
    btn.dataset.categoria = idCat;
    btn.textContent = nombreCat;
    btn.addEventListener('click', () => {
      categoriaActiva = idCat;
      container.querySelectorAll('.catalog-filter-pill').forEach(el => {
        el.classList.toggle('is-active', el.dataset.categoria === idCat);
      });
      cargarCatalogo(idCat);
    });
    return btn;
  };

  try {
    const res = await fetch(`${window.API_URL}/api/Productos/catalogos`);
    if (!res.ok) return;
    const data = await res.json();
    const categorias = Array.isArray(data.categorias) ? data.categorias : [];

    container.innerHTML = '';
    container.appendChild(crearBoton('', 'Todos', true));
    categorias.forEach(cat => {
      container.appendChild(crearBoton(cat.idCategoria, cat.nombreCategoria, false));
    });
  } catch (err) {
    console.warn('No se pudieron cargar filtros de categoría:', err.message);
  }
}

async function cargarCatalogo(categoria = categoriaActiva) {
  const grid = document.getElementById('productos-grid');
  const loading = document.getElementById('grid-loading');
  if (!grid) return;

  try {
    const endpoint = categoria
      ? `${window.API_URL}/api/Productos?categoria=${encodeURIComponent(categoria)}`
      : `${window.API_URL}/api/Novedades/novedades`;

    let res = await fetch(endpoint);
    if (!res.ok && !categoria) {
      res = await fetch(`${window.API_URL}/api/Productos`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const rawProductos = await res.json();
    if (loading) loading.style.display = 'none';

    const productos = Array.isArray(rawProductos)
      ? rawProductos.filter(p => !String(p.idProducto || '').toUpperCase().startsWith('PS'))
      : [];

    if (productos.length === 0) {
      grid.innerHTML = '<p class="text-center text-muted" style="grid-column: 1/-1; padding: 3rem;">No hay productos disponibles en esta categoría por el momento.</p>';
      return;
    }

    grid.innerHTML = '';

    productos.forEach((p, idx) => {
      const id = p.idProducto;
      const imgSrc = p.fotoBase64
        ? (p.fotoBase64.startsWith('data:') ? p.fotoBase64 : `data:image/jpeg;base64,${p.fotoBase64}`)
        : 'assets/BULOVAWATCH.jpg';
      const precio = Number(p.precio || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

      const stock = parseInt(p.stock, 10) || 0;
      const agotado = stock <= 0;

      const card = document.createElement('div');
      card.className = agotado ? 'producto producto--agotado' : 'producto';
      card.style.setProperty('--card-idx', idx);

      const link = document.createElement('a');
      link.href = `producto.html?id=${encodeURIComponent(id)}`;
      link.className = 'producto__link';
      link.setAttribute('aria-label', `Ver detalle: ${p.tituloProducto || ''} ${agotado ? '(Agotado)' : ''}`);

      const imgWrap = document.createElement('div');
      imgWrap.className = 'producto__image-wrap';

      const img = document.createElement('img');
      img.className = 'producto__imagen';
      img.src = imgSrc;
      img.alt = p.tituloProducto || 'Producto MercaUca';
      img.loading = 'lazy';

      const badge = document.createElement('span');
      badge.className = agotado ? 'producto__badge producto__badge--agotado' : 'producto__badge';
      badge.textContent = agotado ? 'Agotado' : (p.nombreCategoria || '✓ MercaUca');

      imgWrap.appendChild(img);
      imgWrap.appendChild(badge);

      const info = document.createElement('div');
      info.className = 'producto__informacion';

      const topMeta = document.createElement('div');
      topMeta.className = 'producto__top-meta';

      const sku = document.createElement('span');
      sku.className = 'producto__sku';
      sku.textContent = `#${id}`;

      const status = document.createElement('span');
      if (agotado) {
        status.className = 'producto__status producto__status--agotado';
        status.textContent = '● Agotado';
      } else {
        status.className = 'producto__status';
        status.textContent = stock <= 3 ? `● ¡Últimas ${stock} unidades!` : `● Disponible (${stock} disp.)`;
        if (stock <= 3) status.style.color = '#D97706';
      }

      topMeta.appendChild(sku);
      topMeta.appendChild(status);

      const title = document.createElement('h3');
      title.className = 'producto__nombre';
      title.textContent = p.tituloProducto || 'Sin título';

      const footer = document.createElement('div');
      footer.className = 'producto__footer';

      const priceBox = document.createElement('div');
      priceBox.className = 'producto__price-box';

      const priceLabel = document.createElement('span');
      priceLabel.className = 'producto__price-label';
      priceLabel.textContent = 'Precio';

      const priceValue = document.createElement('span');
      priceValue.className = 'producto__price-value';
      priceValue.textContent = precio;

      priceBox.appendChild(priceLabel);
      priceBox.appendChild(priceValue);

      const cta = document.createElement('span');
      if (agotado) {
        cta.className = 'producto__cta producto__cta--agotado';
        cta.textContent = 'Agotado ✖';
      } else {
        cta.className = 'producto__cta';
        cta.textContent = 'Ver detalle ➔';
      }

      footer.appendChild(priceBox);
      footer.appendChild(cta);

      info.appendChild(topMeta);
      info.appendChild(title);
      info.appendChild(footer);

      link.appendChild(imgWrap);
      link.appendChild(info);
      card.appendChild(link);

      grid.appendChild(card);
    });
  } catch (err) {
    console.error('Error al cargar catálogo:', err);
    if (loading) {
      loading.innerHTML = '<p class="text-center" style="grid-column: 1/-1; padding: 2rem; color: #DC2626; font-weight: 600;">No se pudo conectar con el catálogo. Asegúrate de que el backend esté activo.</p>';
    }
  }
}
