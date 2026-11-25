// Controlador de Gestión de Productos Propios (Mis Productos)
let misProductosCache = [];
let catalogosCache = { categorias: [], condiciones: [] };
let productoAEliminar = null;
let archivoEdicion = null;

function leerUsuarioLocal() {
  if (window.auth && typeof window.auth.getUser === 'function') {
    return window.auth.getUser();
  }
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed.user || parsed;
  } catch {
    return null;
  }
}

async function resolverSesionVendedor() {
  try {
    const res = await fetch(`${window.API_URL}/api/usuarios/verify`, {
      method: 'GET',
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        return data.user;
      }
    } else if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('user');
      return null;
    }
  } catch {
    // Fallback al estado local cuando verify aún no está desplegado
  }
  return leerUsuarioLocal();
}

document.addEventListener('DOMContentLoaded', async () => {
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

  const noLoginView = document.getElementById('no-login-view');
  const blockedView = document.getElementById('comprador-blocked-view');
  const panel = document.getElementById('mis-productos-panel');

  const user = await resolverSesionVendedor();

  if (!user || !user.idUsuario) {
    if (noLoginView) noLoginView.style.display = 'block';
    if (blockedView) blockedView.style.display = 'none';
    if (panel) panel.style.display = 'none';
    return;
  }

  const nombreRol = String(user.nombreRol || '').trim().toLowerCase();
  if (nombreRol !== 'vendedor' && nombreRol !== 'administrador') {
    if (blockedView) blockedView.style.display = 'block';
    if (noLoginView) noLoginView.style.display = 'none';
    if (panel) panel.style.display = 'none';
    return;
  }

  if (panel) panel.style.display = 'block';
  if (noLoginView) noLoginView.style.display = 'none';
  if (blockedView) blockedView.style.display = 'none';

  const subtitle = document.getElementById('mp-vendedor-subtitle');
  if (subtitle) {
    subtitle.textContent = `Vendedor activo: ${user.nombreUsuario || user.idUsuario} (@${user.idUsuario})`;
  }

  await cargarCatalogos();
  inicializarEventos();
  await cargarMisProductos();
});

async function cargarCatalogos() {
  const selectFiltro = document.getElementById('mp-filter-categoria');
  const selectEditCat = document.getElementById('mp-edit-categoria');
  const selectEditCond = document.getElementById('mp-edit-condicion');

  const fallbackCategorias = [
    { idCategoria: 'CAT001', nombreCategoria: 'Relojes' },
    { idCategoria: 'CAT002', nombreCategoria: 'Joyería' },
    { idCategoria: 'CAT003', nombreCategoria: 'Electrónica' },
    { idCategoria: 'CAT004', nombreCategoria: 'Moda' },
    { idCategoria: 'CAT005', nombreCategoria: 'Hogar y decoración' }
  ];
  const fallbackCondiciones = [
    { idCondicion: 'C001', nombre: 'Nuevo' },
    { idCondicion: 'C002', nombre: 'Usado - Como nuevo' },
    { idCondicion: 'C003', nombre: 'Usado - Buen estado' },
    { idCondicion: 'C004', nombre: 'Usado - Regular' },
    { idCondicion: 'C005', nombre: 'Reacondicionado' }
  ];

  try {
    const res = await fetch(`${window.API_URL}/api/Productos/catalogos`);
    if (res.ok) {
      const data = await res.json();
      catalogosCache.categorias = Array.isArray(data.categorias) && data.categorias.length > 0
        ? data.categorias
        : fallbackCategorias;
      catalogosCache.condiciones = Array.isArray(data.condiciones) && data.condiciones.length > 0
        ? data.condiciones
        : fallbackCondiciones;
    } else {
      catalogosCache = { categorias: fallbackCategorias, condiciones: fallbackCondiciones };
    }
  } catch {
    catalogosCache = { categorias: fallbackCategorias, condiciones: fallbackCondiciones };
  }

  if (selectFiltro) {
    selectFiltro.innerHTML = '<option value="">Todas las categorías</option>';
    catalogosCache.categorias.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.idCategoria;
      opt.textContent = c.nombreCategoria;
      selectFiltro.appendChild(opt);
    });
  }

  if (selectEditCat) {
    selectEditCat.innerHTML = '';
    catalogosCache.categorias.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.idCategoria;
      opt.textContent = c.nombreCategoria;
      selectEditCat.appendChild(opt);
    });
  }

  if (selectEditCond) {
    selectEditCond.innerHTML = '';
    catalogosCache.condiciones.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.idCondicion;
      opt.textContent = c.nombre;
      selectEditCond.appendChild(opt);
    });
  }
}

function inicializarEventos() {
  const searchInput = document.getElementById('mp-search-input');
  const filterCat = document.getElementById('mp-filter-categoria');
  const btnRefresh = document.getElementById('mp-btn-refresh');

  let timer = null;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => cargarMisProductos(), 260);
    });
  }

  if (filterCat) {
    filterCat.addEventListener('change', () => cargarMisProductos());
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => cargarMisProductos());
  }

  // Modal editar
  const modalEdit = document.getElementById('modal-editar-producto');
  const closeEdit = () => {
    if (modalEdit) modalEdit.style.display = 'none';
    archivoEdicion = null;
  };
  document.getElementById('mp-close-edit')?.addEventListener('click', closeEdit);
  document.getElementById('mp-cancel-edit')?.addEventListener('click', closeEdit);
  modalEdit?.addEventListener('click', (e) => {
    if (e.target === modalEdit) closeEdit();
  });

  // Validación previa de archivo en edición
  const fileInput = document.getElementById('mp-edit-file');
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      archivoEdicion = null;
      return;
    }

    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedExt = ['jpg', 'jpeg', 'png', 'webp'];
    const ext = (file.name.split('.').pop() || '').toLowerCase();

    if (!allowedMimes.includes(file.type.toLowerCase()) || !allowedExt.includes(ext)) {
      window.showToast('Formato inválido. Solo se admiten imágenes JPG, PNG o WEBP.', 'error');
      fileInput.value = '';
      archivoEdicion = null;
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      window.showToast('La imagen excede el límite permitido de 5 MB.', 'error');
      fileInput.value = '';
      archivoEdicion = null;
      return;
    }

    archivoEdicion = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = document.getElementById('mp-edit-preview-img');
      const wrap = document.getElementById('mp-edit-preview-wrap');
      if (img) img.src = ev.target.result;
      if (wrap) wrap.style.display = 'flex';
    };
    reader.readAsDataURL(file);
  });

  // Guardar edición
  const formEdit = document.getElementById('mp-form-edit');
  formEdit?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await guardarEdicionProducto();
  });

  // Modal eliminar
  const modalDel = document.getElementById('modal-confirmar-eliminar');
  const closeDel = () => {
    if (modalDel) modalDel.style.display = 'none';
    productoAEliminar = null;
  };
  document.getElementById('mp-close-del')?.addEventListener('click', closeDel);
  document.getElementById('mp-cancel-del')?.addEventListener('click', closeDel);
  modalDel?.addEventListener('click', (e) => {
    if (e.target === modalDel) closeDel();
  });
  document.getElementById('mp-confirm-del')?.addEventListener('click', async () => {
    if (productoAEliminar) {
      await ejecutarEliminacion(productoAEliminar);
      closeDel();
    }
  });
}

async function cargarMisProductos() {
  const tbody = document.getElementById('mp-tbody');
  if (!tbody) return;

  const q = document.getElementById('mp-search-input')?.value.trim() || '';
  const cat = document.getElementById('mp-filter-categoria')?.value || '';

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (cat) params.set('categoria', cat);

  const queryStr = params.toString() ? `?${params.toString()}` : '';

  try {
    const res = await fetch(`${window.API_URL}/api/Productos/mis-productos${queryStr}`, {
      method: 'GET',
      credentials: 'include'
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      tbody.innerHTML = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 8;
      td.className = 'mp-empty-box';
      td.textContent = data.message || 'No fue posible cargar tus productos.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    misProductosCache = Array.isArray(data.productos) ? data.productos : [];
    const resumen = data.resumen || {
      total: misProductosCache.length,
      disponibles: misProductosCache.filter(p => p.stock > 0).length,
      stockBajo: misProductosCache.filter(p => p.stock > 0 && p.stock <= 5).length,
      agotados: misProductosCache.filter(p => p.stock <= 0).length
    };

    document.getElementById('kpi-mp-total').textContent = resumen.total;
    document.getElementById('kpi-mp-disponibles').textContent = resumen.disponibles;
    document.getElementById('kpi-mp-bajo').textContent = resumen.stockBajo;
    document.getElementById('kpi-mp-agotados').textContent = resumen.agotados;

    renderTablaMisProductos(misProductosCache);
  } catch (err) {
    console.error('Error cargando mis productos:', err);
    tbody.innerHTML = '<tr><td colspan="8" class="mp-empty-box">Error de conexión con el servidor.</td></tr>';
  }
}

function renderTablaMisProductos(productos) {
  const tbody = document.getElementById('mp-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (productos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="mp-empty-box">
          No tienes productos registrados que coincidan con este filtro.
          <br><br>
          <a href="vender.html" class="mp-btn-primary" style="display:inline-flex;">➕ Publicar mi primer producto</a>
        </td>
      </tr>
    `;
    return;
  }

  productos.forEach(p => {
    const tr = document.createElement('tr');

    // Foto
    const tdImg = document.createElement('td');
    const img = document.createElement('img');
    img.className = 'mp-thumb';
    img.src = p.fotoBase64 || 'assets/BULOVAWATCH.jpg';
    img.alt = p.tituloProducto || 'Producto';
    tdImg.appendChild(img);

    // SKU
    const tdSku = document.createElement('td');
    const skuSpan = document.createElement('span');
    skuSpan.className = 'mp-sku-pill';
    skuSpan.textContent = `#${p.idProducto}`;
    tdSku.appendChild(skuSpan);

    // Producto
    const tdTitle = document.createElement('td');
    const titleLink = document.createElement('a');
    titleLink.href = `producto.html?id=${encodeURIComponent(p.idProducto)}`;
    titleLink.style.fontWeight = '700';
    titleLink.textContent = p.tituloProducto || 'Sin título';
    const brandDiv = document.createElement('div');
    brandDiv.style.cssText = 'font-size:0.78rem; color:#64748B;';
    brandDiv.textContent = p.marca || 'Genérica';
    tdTitle.appendChild(titleLink);
    tdTitle.appendChild(brandDiv);

    // Categoría
    const tdCat = document.createElement('td');
    const catSpan = document.createElement('span');
    catSpan.className = 'mp-cat-pill';
    catSpan.textContent = p.nombreCategoria || p.idCategoria;
    tdCat.appendChild(catSpan);

    // Condición
    const tdCond = document.createElement('td');
    tdCond.textContent = p.nombreCondicion || p.idCondicion;

    // Precio
    const tdPrice = document.createElement('td');
    const priceStrong = document.createElement('strong');
    priceStrong.textContent = Number(p.precio || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    tdPrice.appendChild(priceStrong);

    // Stepper de Stock
    const tdStock = document.createElement('td');
    const stepper = document.createElement('div');
    stepper.className = 'mp-stepper';

    const btnMinus = document.createElement('button');
    btnMinus.type = 'button';
    btnMinus.title = 'Restar 1';
    btnMinus.textContent = '−';
    btnMinus.addEventListener('click', () => ajustarStock(p.idProducto, -1));

    const stockSpan = document.createElement('span');
    stockSpan.id = `mp-stock-${p.idProducto}`;
    stockSpan.textContent = String(parseInt(p.stock, 10) || 0);
    if ((parseInt(p.stock, 10) || 0) <= 5) {
      stockSpan.style.color = '#DC2626';
    }

    const btnPlus = document.createElement('button');
    btnPlus.type = 'button';
    btnPlus.title = 'Sumar 1';
    btnPlus.textContent = '+';
    btnPlus.addEventListener('click', () => ajustarStock(p.idProducto, 1));

    stepper.appendChild(btnMinus);
    stepper.appendChild(stockSpan);
    stepper.appendChild(btnPlus);
    tdStock.appendChild(stepper);

    // Acciones
    const tdActions = document.createElement('td');
    tdActions.style.textAlign = 'right';
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'mp-actions';

    const btnEdit = document.createElement('button');
    btnEdit.type = 'button';
    btnEdit.className = 'mp-action-btn';
    btnEdit.title = 'Editar producto';
    btnEdit.textContent = '✏️';
    btnEdit.addEventListener('click', () => abrirModalEditar(p.idProducto));

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'mp-action-btn mp-action-btn--delete';
    btnDel.title = 'Eliminar producto';
    btnDel.textContent = '🗑️';
    btnDel.addEventListener('click', () => abrirModalEliminar(p));

    actionsDiv.appendChild(btnEdit);
    actionsDiv.appendChild(btnDel);
    tdActions.appendChild(actionsDiv);

    tr.appendChild(tdImg);
    tr.appendChild(tdSku);
    tr.appendChild(tdTitle);
    tr.appendChild(tdCat);
    tr.appendChild(tdCond);
    tr.appendChild(tdPrice);
    tr.appendChild(tdStock);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

async function ajustarStock(idProducto, delta) {
  try {
    const res = await fetch(`${window.API_URL}/api/Productos/mis-productos/${encodeURIComponent(idProducto)}/stock`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      window.showToast(`Stock actualizado a ${data.stock}.`, 'info');
      await cargarMisProductos();
    } else {
      window.showToast(data.message || 'No se pudo ajustar el stock.', 'error');
    }
  } catch {
    window.showToast('Error de conexión al actualizar stock.', 'error');
  }
}

function abrirModalEditar(idProducto) {
  const prod = misProductosCache.find(x => x.idProducto === idProducto);
  if (!prod) return;

  archivoEdicion = null;
  document.getElementById('mp-edit-id').value = prod.idProducto;
  document.getElementById('mp-edit-sku-label').textContent = `Editando SKU #${prod.idProducto}`;
  document.getElementById('mp-edit-titulo').value = prod.tituloProducto || '';
  document.getElementById('mp-edit-marca').value = prod.marca || '';
  document.getElementById('mp-edit-categoria').value = prod.idCategoria || 'CAT001';
  document.getElementById('mp-edit-condicion').value = prod.idCondicion || 'C001';
  document.getElementById('mp-edit-precio').value = prod.precio || '';
  document.getElementById('mp-edit-stock').value = prod.stock ?? 0;
  document.getElementById('mp-edit-descripcion').value = prod.descripcion || '';
  document.getElementById('mp-edit-file').value = '';
  document.getElementById('mp-edit-error').style.display = 'none';

  const prevWrap = document.getElementById('mp-edit-preview-wrap');
  const prevImg = document.getElementById('mp-edit-preview-img');
  if (prod.fotoBase64 && prevImg && prevWrap) {
    prevImg.src = prod.fotoBase64;
    prevWrap.style.display = 'flex';
  } else if (prevWrap) {
    prevWrap.style.display = 'none';
  }

  document.getElementById('modal-editar-producto').style.display = 'flex';
}

async function guardarEdicionProducto() {
  const id = document.getElementById('mp-edit-id').value;
  const errBox = document.getElementById('mp-edit-error');
  const saveBtn = document.getElementById('mp-save-edit');
  errBox.style.display = 'none';

  const formData = new FormData();
  formData.append('titulo', document.getElementById('mp-edit-titulo').value.trim());
  formData.append('marca', document.getElementById('mp-edit-marca').value.trim());
  formData.append('idCategoria', document.getElementById('mp-edit-categoria').value);
  formData.append('idCondicion', document.getElementById('mp-edit-condicion').value);
  formData.append('precio', document.getElementById('mp-edit-precio').value);
  formData.append('stock', document.getElementById('mp-edit-stock').value);
  formData.append('descripcion', document.getElementById('mp-edit-descripcion').value.trim());

  if (archivoEdicion) {
    formData.append('imagen', archivoEdicion);
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando…';

  try {
    const res = await fetch(`${window.API_URL}/api/Productos/mis-productos/${encodeURIComponent(id)}`, {
      method: 'PUT',
      credentials: 'include',
      body: formData
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      document.getElementById('modal-editar-producto').style.display = 'none';
      archivoEdicion = null;
      window.showToast(data.message || 'Producto actualizado correctamente.', 'success');
      await cargarMisProductos();
    } else {
      errBox.textContent = data.message || 'No se pudo actualizar el producto.';
      errBox.style.display = 'block';
    }
  } catch {
    errBox.textContent = 'Error de conexión al guardar cambios.';
    errBox.style.display = 'block';
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Guardar cambios';
  }
}

function abrirModalEliminar(prod) {
  productoAEliminar = prod.idProducto;
  const msg = document.getElementById('mp-del-message');
  if (msg) {
    msg.textContent = `¿Deseas eliminar "${prod.tituloProducto}" (#${prod.idProducto}) de tu inventario y del catálogo?`;
  }
  document.getElementById('modal-confirmar-eliminar').style.display = 'flex';
}

async function ejecutarEliminacion(idProducto) {
  try {
    const res = await fetch(`${window.API_URL}/api/Productos/mis-productos/${encodeURIComponent(idProducto)}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      window.showToast(data.message || 'Producto eliminado.', 'success');
      await cargarMisProductos();
    } else {
      window.showToast(data.message || 'No se pudo eliminar el producto.', 'error');
    }
  } catch {
    window.showToast('Error de conexión al eliminar producto.', 'error');
  }
}
