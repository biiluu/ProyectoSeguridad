// Wrapper centralizado de peticiones HTTP (Autenticación mediante Cookie HttpOnly)
const api = {
  async request(endpoint, options = {}) {
    let url = endpoint.startsWith('http') ? endpoint : `${window.API_URL}${endpoint}`;
    const headers = options.headers || {};

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // El JWT viaja automáticamente y de forma segura en la Cookie HttpOnly con credentials: 'include'
    const config = {
      ...options,
      credentials: 'include',
      headers
    };

    try {
      const response = await fetch(url, config);
      return response;
    } catch (err) {
      console.error(`Error en petición a ${url}:`, err);
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, data) {
    const isFormData = data instanceof FormData;
    return this.request(endpoint, {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data)
    });
  },

  put(endpoint, data) {
    const isFormData = data instanceof FormData;
    return this.request(endpoint, {
      method: 'PUT',
      body: isFormData ? data : JSON.stringify(data)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

// Toast de notificaciones global
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  const hasLeadingIcon = /^[✔⛔🔒ℹ🎉]/.test(String(message).trim());
  const icon = (!hasLeadingIcon && type === 'success')
    ? '<span style="font-weight:bold;">✔</span> '
    : ((!hasLeadingIcon && type === 'info') ? '<span style="font-weight:bold;">ℹ</span> ' : '');
  toast.innerHTML = `${icon}<span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

// Utilidad global de escape contra XSS
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.api = api;
window.showToast = showToast;
window.escapeHTML = escapeHTML;
