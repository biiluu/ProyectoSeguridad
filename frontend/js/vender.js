// Controlador de Publicación de Productos (Vender)
let archivoSeleccionado = null;

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
    // Si /api/usuarios/verify aún no existe o está fuera de línea, usa el estado local
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

  const userIdEl = document.getElementById('ap-user-id');
  const formCard = document.getElementById('vendedor-form-card');
  const blockedCard = document.getElementById('comprador-blocked-view');
  const noLoginCard = document.getElementById('no-login-view');

  const user = await resolverSesionVendedor();

  if (!user || !user.idUsuario) {
    if (noLoginCard) noLoginCard.style.display = 'block';
    if (formCard) formCard.style.display = 'none';
    if (blockedCard) blockedCard.style.display = 'none';
    return;
  }

  const nombreRol = String(user.nombreRol || '').trim().toLowerCase();
  if (nombreRol !== 'vendedor' && nombreRol !== 'administrador') {
    if (blockedCard) blockedCard.style.display = 'block';
    if (formCard) formCard.style.display = 'none';
    if (noLoginCard) noLoginCard.style.display = 'none';
    return;
  }

  if (formCard) formCard.style.display = 'block';
  if (blockedCard) blockedCard.style.display = 'none';
  if (noLoginCard) noLoginCard.style.display = 'none';

  if (userIdEl) {
    const rolTexto = nombreRol === 'administrador' ? 'Administrador' : 'Vendedor';
    userIdEl.textContent = `${user.nombreUsuario || user.idUsuario} (${rolTexto})`;
  }

  await cargarCatalogosFormulario();
  setupDropzone();
  setupForm();
});

async function cargarCatalogosFormulario() {
  const selectCat = document.getElementById('ap-categoria');
  const selectCond = document.getElementById('ap-condicion');
  if (!selectCat || !selectCond) return;

  try {
    const res = await fetch(`${window.API_URL}/api/Productos/catalogos`);
    if (!res.ok) return;
    const data = await res.json();

    if (Array.isArray(data.categorias) && data.categorias.length > 0) {
      selectCat.innerHTML = '';
      data.categorias.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.idCategoria;
        opt.textContent = c.nombreCategoria;
        selectCat.appendChild(opt);
      });
    }

    if (Array.isArray(data.condiciones) && data.condiciones.length > 0) {
      selectCond.innerHTML = '';
      data.condiciones.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.idCondicion;
        opt.textContent = c.nombre;
        selectCond.appendChild(opt);
      });
    }
  } catch (err) {
    console.warn('Usando catálogos por defecto en formulario:', err.message);
  }
}

function setupDropzone() {
  const dropzone = document.getElementById('ap-dropzone');
  const fileInput = document.getElementById('ap-file-input');
  const previewBox = document.getElementById('ap-preview-box');
  const previewImg = document.getElementById('ap-preview-img');

  if (!dropzone || !fileInput) return;

  dropzone.onclick = () => fileInput.click();

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  function handleFile(file) {
    if (!file) return;

    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!file.type || !allowedMimes.includes(file.type.toLowerCase())) {
      window.showToast('Por favor selecciona un archivo de imagen válido (JPG, PNG o WEBP).', 'error');
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      window.showToast('La fotografía seleccionada supera el límite máximo permitido de 5 MB.', 'error');
      return;
    }

    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      window.showToast('Extensión de imagen no permitida. Solo se admiten archivos .jpg, .png o .webp.', 'error');
      return;
    }

    archivoSeleccionado = file;
    const reader = new FileReader();
    reader.onload = (event) => {
      previewImg.src = event.target.result;
      previewBox.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
}

function setupForm() {
  const form = document.getElementById('ap-form');
  const submitBtn = document.getElementById('ap-submit-btn');

  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();

    const user = leerUsuarioLocal();
    if (!user || !user.idUsuario) {
      window.showToast('Debes iniciar sesión para publicar un producto.', 'error');
      return;
    }

    const rolUsuario = String(user.nombreRol || '').trim().toLowerCase();
    if (rolUsuario !== 'vendedor' && rolUsuario !== 'administrador') {
      window.showToast('Acceso denegado: Solo los vendedores pueden publicar productos.', 'error');
      return;
    }

    if (!archivoSeleccionado) {
      window.showToast('Por favor sube una imagen para el producto.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('titulo', document.getElementById('ap-titulo').value.trim());
    formData.append('descripcion', document.getElementById('ap-descripcion').value.trim());
    formData.append('marca', document.getElementById('ap-marca').value.trim());
    formData.append('idCondicion', document.getElementById('ap-condicion').value);
    formData.append('idCategoria', document.getElementById('ap-categoria').value);
    formData.append('precio', document.getElementById('ap-precio').value);
    formData.append('stock', document.getElementById('ap-stock') ? document.getElementById('ap-stock').value : 1);
    formData.append('imagen', archivoSeleccionado);

    submitBtn.disabled = true;
    submitBtn.textContent = 'Publicando producto en MercaUca…';

    try {
      const res = await fetch(`${window.API_URL}/api/Productos`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        window.showToast('¡Producto publicado correctamente en el catálogo! 🎉', 'success');
        form.reset();
        document.getElementById('ap-preview-box').style.display = 'none';
        archivoSeleccionado = null;
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1200);
      } else {
        window.showToast(data.mensaje || data.message || 'Error al publicar el producto.', 'error');
      }
    } catch (err) {
      console.error(err);
      window.showToast('Error de conexión con el servidor.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Publicar producto ahora ➔';
    }
  };
}
