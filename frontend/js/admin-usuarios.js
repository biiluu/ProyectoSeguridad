let rolesCache = [];
let usuariosCache = [];

document.addEventListener('DOMContentLoaded', async () => {
  const noLogin = document.getElementById('no-login-view');
  const noAdmin = document.getElementById('no-admin-view');
  const panel = document.getElementById('admin-usuarios-panel');

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
  await cargarRoles();
  await cargarUsuarios();
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

async function cargarRoles() {
  try {
    const res = await fetch(`${window.API_URL}/api/admin/usuarios/catalogo/roles`, { credentials: 'include' });
    if (res.ok) rolesCache = await res.json();
  } catch {
    rolesCache = [];
  }

  [document.getElementById('cu-rol'), document.getElementById('eu-rol')].forEach(sel => {
    sel.innerHTML = '';
    rolesCache.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.id_rol;
      opt.textContent = r.nombre_rol;
      sel.appendChild(opt);
    });
  });
}

async function cargarUsuarios() {
  const tbody = document.getElementById('au-tbody');
  try {
    const res = await fetch(`${window.API_URL}/api/admin/usuarios`, { credentials: 'include' });
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="6">${escapeHTML(data.message || 'Error al cargar usuarios.')}</td></tr>`;
      return;
    }
    usuariosCache = data;
    renderUsuarios(data);
  } catch {
    tbody.innerHTML = '<tr><td colspan="6">Error de conexión.</td></tr>';
  }
}

function renderUsuarios(usuarios) {
  const tbody = document.getElementById('au-tbody');
  tbody.innerHTML = '';
  usuarios.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHTML(u.idUsuario)}</td>
      <td>${escapeHTML(u.nombreUsuario)}</td>
      <td>${escapeHTML(u.emailUsuario)}</td>
      <td>${escapeHTML(u.nombreRol)}</td>
      <td>${escapeHTML(u.idEstado)}</td>
      <td></td>
    `;
    const tdAcciones = tr.querySelector('td:last-child');

    const btnEditar = document.createElement('button');
    btnEditar.className = 'admin-action-btn admin-action-btn--edit';
    btnEditar.textContent = 'Editar';
    btnEditar.addEventListener('click', () => abrirModalEditar(u.idUsuario));

    const btnEliminar = document.createElement('button');
    btnEliminar.className = 'admin-action-btn admin-action-btn--delete';
    btnEliminar.textContent = 'Desactivar';
    btnEliminar.addEventListener('click', () => eliminarUsuario(u.idUsuario));

    tdAcciones.appendChild(btnEditar);
    tdAcciones.appendChild(btnEliminar);
    tbody.appendChild(tr);
  });
}

function inicializarEventos() {
  document.getElementById('form-crear-usuario').addEventListener('submit', async (e) => {
    e.preventDefault();
    await crearUsuario();
  });
  document.getElementById('form-editar-usuario').addEventListener('submit', async (e) => {
    e.preventDefault();
    await guardarEdicion();
  });
  document.getElementById('eu-cancelar').addEventListener('click', () => {
    document.getElementById('modal-editar-usuario').style.display = 'none';
  });
}

async function crearUsuario() {
  const errBox = document.getElementById('cu-error');
  errBox.style.display = 'none';

  const body = {
    idUsuario: document.getElementById('cu-id').value.trim(),
    nombreUsuario: document.getElementById('cu-nombre').value.trim(),
    emailUsuario: document.getElementById('cu-email').value.trim(),
    telefonoUsuario: document.getElementById('cu-telefono').value.trim(),
    password: document.getElementById('cu-password').value,
    idRol: document.getElementById('cu-rol').value
  };

  try {
    const res = await fetch(`${window.API_URL}/api/admin/usuarios`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      errBox.textContent = data.message || 'No se pudo crear el usuario.';
      errBox.style.display = 'block';
      return;
    }
    document.getElementById('form-crear-usuario').reset();
    await cargarUsuarios();
  } catch {
    errBox.textContent = 'Error de conexión.';
    errBox.style.display = 'block';
  }
}

function abrirModalEditar(idUsuario) {
  const u = usuariosCache.find(x => x.idUsuario === idUsuario);
  if (!u) return;
  document.getElementById('eu-id').value = u.idUsuario;
  document.getElementById('eu-nombre').value = u.nombreUsuario || '';
  document.getElementById('eu-email').value = u.emailUsuario || '';
  document.getElementById('eu-telefono').value = u.telefonoUsuario || '';
  document.getElementById('eu-rol').value = u.idRol || '';
  document.getElementById('eu-estado').value = u.idEstado || 'ACT';
  document.getElementById('eu-error').style.display = 'none';
  document.getElementById('modal-editar-usuario').style.display = 'flex';
}

async function guardarEdicion() {
  const id = document.getElementById('eu-id').value;
  const errBox = document.getElementById('eu-error');
  errBox.style.display = 'none';

  const body = {
    nombreUsuario: document.getElementById('eu-nombre').value.trim(),
    emailUsuario: document.getElementById('eu-email').value.trim(),
    telefonoUsuario: document.getElementById('eu-telefono').value.trim(),
    idRol: document.getElementById('eu-rol').value,
    idEstado: document.getElementById('eu-estado').value
  };

  try {
    const res = await fetch(`${window.API_URL}/api/admin/usuarios/${encodeURIComponent(id)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      errBox.textContent = data.message || 'No se pudo actualizar el usuario.';
      errBox.style.display = 'block';
      return;
    }
    document.getElementById('modal-editar-usuario').style.display = 'none';
    await cargarUsuarios();
  } catch {
    errBox.textContent = 'Error de conexión.';
    errBox.style.display = 'block';
  }
}

async function eliminarUsuario(idUsuario) {
  if (!confirm(`¿Desactivar al usuario ${idUsuario}?`)) return;
  try {
    const res = await fetch(`${window.API_URL}/api/admin/usuarios/${encodeURIComponent(idUsuario)}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.message || 'No se pudo desactivar el usuario.');
      return;
    }
    await cargarUsuarios();
  } catch {
    alert('Error de conexión.');
  }
}