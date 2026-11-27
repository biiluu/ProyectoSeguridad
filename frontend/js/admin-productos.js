let productosCache = [];
const CATEGORIAS = [
  { id: 'CAT001', nombre: 'Relojes' },
  { id: 'CAT002', nombre: 'Joyería' },
  { id: 'CAT003', nombre: 'Electrónica' },
  { id: 'CAT004', nombre: 'Moda' },
  { id: 'CAT005', nombre: 'Hogar y decoración' }
];
const CONDICIONES = [
  { id: 'C001', nombre: 'Nuevo' },
  { id: 'C002', nombre: 'Usado - Como nuevo' },
  { id: 'C003', nombre: 'Usado - Buen estado' },
  { id: 'C004', nombre: 'Usado - Regular' },
  { id: 'C005', nombre: 'Reacondicionado' }
];

document.addEventListener('DOMContentLoaded', async () => {
  const noLogin = document.getElementById('no-login-view');
  const noAdmin = document.getElementById('no-admin-view');
  const panel = document.getElementById('admin-productos-panel');

  const user = await verificarSesion();
  if (!user) {
    noLogin.style.display = 'block';
    return;
  }
  if (String(user.nombreRol || '').trim().toLowerCase() !== 'administrador') {
    noAdmin.style.display = 'block';
    return;
  }

  panel.style.display = 'block';
  const nameEl = document.getElementById('sidebar-admin-name');
  const avatarEl = document.getElementById('sidebar-admin-avatar');
  if (nameEl) nameEl.textContent = user.nombreUsuario || user.idUsuario;
  if (avatarEl) avatarEl.textContent = (user.nombreUsuario || user.idUsuario || 'A').charAt(0).toUpperCase();
  llenarSelects();
  await cargarProductos();
  inicializarEventos();
});

async function verificarSesion() {
  try {
    const res = await fetch(`${window.API_URL}/api/usuarios/verify`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data && data.user ? data.user : null;
  } catch {
    return null;
  }
}

function llenarSelects() {
  const selCat = document.getElementById('ep-categoria');
  const selCond = document.getElementById('ep-condicion');
  CATEGORIAS.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.nombre;
    selCat.appendChild(opt);
  });
  CONDICIONES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.nombre;
    selCond.appendChild(opt);
  });
}

async function cargarProductos() {
  const soloSinStock = document.getElementById('ap-filtro-sin-stock').checked;
  const endpoint = soloSinStock ? '/api/admin/productos/sin-stock' : '/api/admin/productos';
  const tbody = document.getElementById('ap-tbody');

  try {
    const res = await fetch(`${window.API_URL}${endpoint}`, { credentials: 'include' });
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="7">${escapeHTML(data.message || 'Error al cargar productos.')}</td></tr>`;
      return;
    }
    productosCache = data;
    renderProductos(data);
  } catch {
    tbody.innerHTML = '<tr><td colspan="7">Error de conexión.</td></tr>';
  }
}

function renderProductos(productos) {
  const tbody = document.getElementById('ap-tbody');
  tbody.innerHTML = '';
  if (productos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">No hay productos que coincidan.</td></tr>';
    return;
  }

  productos.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHTML(p.idProducto)}</td>
      <td>${escapeHTML(p.tituloProducto)}</td>
      <td>${escapeHTML(p.nombreVendedor)}</td>
      <td>${escapeHTML(p.nombreCategoria)}</td>
      <td>${Number(p.precio).toFixed(2)}</td>
      <td>${p.stock}</td>
      <td></td>
    `;
    const tdAcciones = tr.querySelector('td:last-child');

    const btnEditar = document.createElement('button');
    btnEditar.className = 'admin-action-btn admin-action-btn--edit';
    btnEditar.textContent = 'Editar';
    btnEditar.addEventListener('click', () => abrirModalEditar(p.idProducto));

    const btnEliminar = document.createElement('button');
    btnEliminar.className = 'admin-action-btn admin-action-btn--delete';
    btnEliminar.textContent = 'Eliminar';
    btnEliminar.addEventListener('click', () => eliminarProducto(p.idProducto));

    tdAcciones.appendChild(btnEditar);
    tdAcciones.appendChild(btnEliminar);
    tbody.appendChild(tr);
  });
}

function inicializarEventos() {
  document.getElementById('ap-filtro-sin-stock').addEventListener('change', () => cargarProductos());
  document.getElementById('form-editar-producto').addEventListener('submit', async (e) => {
    e.preventDefault();
    await guardarEdicionProducto();
  });
  document.getElementById('ep-cancelar').addEventListener('click', () => {
    document.getElementById('modal-editar-producto').style.display = 'none';
  });
}

function abrirModalEditar(idProducto) {
  const p = productosCache.find(x => x.idProducto === idProducto);
  if (!p) return;
  document.getElementById('ep-id').value = p.idProducto;
  document.getElementById('ep-titulo').value = p.tituloProducto || '';
  document.getElementById('ep-marca').value = p.marca || '';
  document.getElementById('ep-categoria').value = p.idCategoria || 'CAT001';
  document.getElementById('ep-condicion').value = p.idCondicion || 'C001';
  document.getElementById('ep-precio').value = p.precio || '';
  document.getElementById('ep-stock').value = p.stock ?? 0;
  document.getElementById('ep-descripcion').value = p.descripcion || '';
  document.getElementById('ep-imagen').value = '';
  document.getElementById('ep-error').style.display = 'none';
  document.getElementById('modal-editar-producto').style.display = 'flex';
}

async function guardarEdicionProducto() {
  const id = document.getElementById('ep-id').value;
  const errBox = document.getElementById('ep-error');
  errBox.style.display = 'none';

  const formData = new FormData();
  formData.append('titulo', document.getElementById('ep-titulo').value.trim());
  formData.append('marca', document.getElementById('ep-marca').value.trim());
  formData.append('idCategoria', document.getElementById('ep-categoria').value);
  formData.append('idCondicion', document.getElementById('ep-condicion').value);
  formData.append('precio', document.getElementById('ep-precio').value);
  formData.append('stock', document.getElementById('ep-stock').value);
  formData.append('descripcion', document.getElementById('ep-descripcion').value.trim());

  const file = document.getElementById('ep-imagen').files[0];
  if (file) formData.append('imagen', file);

  try {
    const res = await fetch(`${window.API_URL}/api/admin/productos/${encodeURIComponent(id)}`, {
      method: 'PUT',
      credentials: 'include',
      body: formData
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      errBox.textContent = data.message || 'No se pudo actualizar el producto.';
      errBox.style.display = 'block';
      return;
    }
    document.getElementById('modal-editar-producto').style.display = 'none';
    await cargarProductos();
  } catch {
    errBox.textContent = 'Error de conexión.';
    errBox.style.display = 'block';
  }
}

async function eliminarProducto(idProducto) {
  if (!confirm(`¿Eliminar el producto ${idProducto}?`)) return;
  try {
    const res = await fetch(`${window.API_URL}/api/admin/productos/${encodeURIComponent(idProducto)}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || 'No se pudo eliminar el producto.');
      return;
    }
    await cargarProductos();
  } catch {
    alert('Error de conexión.');
  }
}