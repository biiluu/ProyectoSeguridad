// Gestión de Autenticación y Sesión de Usuario (Vanilla JS)
const auth = {
  getUser() {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed.user || parsed;
    } catch {
      return null;
    }
  },

  isAdmin(user) {
    return String(user?.nombreRol || '').trim().toLowerCase() === 'administrador';
  },

  isSellerOrAdmin(user) {
    const rol = String(user?.nombreRol || '').trim().toLowerCase();
    return rol === 'administrador' || rol === 'vendedor';
  },

  getToken() {
    localStorage.removeItem('token');
    return this.getUser() ? 'HTTPONLY_COOKIE' : null;
  },

  setSession(data) {
    localStorage.removeItem('token');
    if (data && data.expiresAtUtc) localStorage.setItem('expiresAtUtc', data.expiresAtUtc);
    if (data && data.user) localStorage.setItem('user', JSON.stringify(data.user));
  },

  async logout() {
    try {
      const apiUrl = window.API_URL || '';
      await fetch(`${apiUrl}/api/usuarios/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      console.warn('Aviso de logout al servidor omitido o fuera de línea:', e);
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('expiresAtUtc');
    localStorage.removeItem('cart');
    sessionStorage.clear();

    document.cookie.split(';').forEach(c => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });

    sessionStorage.setItem('flashSuccess', 'Has cerrado sesión exitosamente.');
    window.location.replace('login.html?motivo=logout');
  },

  async verifyToken() {
    const token = this.getToken();
    const expiresAt = localStorage.getItem('expiresAtUtc');

    if (expiresAt && new Date(expiresAt) <= new Date()) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('expiresAtUtc');
      return false;
    }

    try {
      const res = await window.api.get('/api/usuarios/verify');
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.user) {
          const actual = this.getUser() || {};
          localStorage.setItem('user', JSON.stringify({ ...actual, ...data.user }));
        }
        return true;
      }
      if (token || res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('expiresAtUtc');
      }
      return false;
    } catch (e) {
      console.warn('No se pudo verificar token con el servidor:', e);
      return Boolean(token);
    }
  },

  async initTopbarUser() {
    this.checkFlashMessages();

    const userLabel = document.getElementById('topbar-user-label');
    const userBtn = document.getElementById('topbar-user-btn');
    if (!userLabel || !userBtn) return;

    const wrapper = userBtn.closest('.action-with-label');
    const tokenValid = await this.verifyToken();
    const user = this.getUser();
    const esc = typeof window.escapeHTML === 'function' ? window.escapeHTML : (s => String(s ?? ''));

    if (tokenValid && user) {
      const displayName = (user.nombreUsuario || user.idUsuario || 'Usuario').trim();
      const parts = displayName.split(/\s+/).filter(Boolean);
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : displayName.slice(0, 2).toUpperCase();
      const shortName = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : displayName;

      if (wrapper) wrapper.classList.add('is-logged');
      userBtn.textContent = initials;
      userLabel.innerHTML = `
        <span class="user-pill__meta">Mi Cuenta</span>
        <span class="user-pill__name-row">
          <span class="user-pill__name" title="${esc(displayName)}">${esc(shortName)}</span>
          <span class="user-pill__chevron">▾</span>
        </span>
      `;
      userBtn.onclick = () => auth.openProfileModal();

      if (this.isAdmin(user)) {
        let adminPill = document.getElementById('topbar-admin-pill');
        if (!adminPill && userBtn.parentNode && userBtn.parentNode.parentNode) {
          adminPill = document.createElement('a');
          adminPill.id = 'topbar-admin-pill';
          adminPill.href = 'admin.html';
          adminPill.className = 'topbar-admin-pill';
          adminPill.innerHTML = '<span>🛡️</span> Panel Admin';
          adminPill.setAttribute(
            'style',
            'display:inline-flex; align-items:center; gap:5px; background:#1C1C1C; color:#C5A46D; border:1px solid #C5A46D; padding:5px 12px; border-radius:999px; font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; margin-right:8px; transition:all 0.2s; text-decoration:none;'
          );
          userBtn.parentNode.parentNode.insertBefore(adminPill, userBtn.parentNode);
        }
      }

      const urlParams = new URLSearchParams(window.location.search);
      const requestedPerfil = (urlParams.get('idUsuario') || urlParams.get('perfil') || '').trim();
      if (requestedPerfil && this._lastUrlPerfilChecked !== requestedPerfil) {
        this._lastUrlPerfilChecked = requestedPerfil;
        this.cargarPerfilUsuario(requestedPerfil, { openModal: true, byAdminIdEndpoint: true });
      }
    } else {
      const existingAdminPill = document.getElementById('topbar-admin-pill');
      if (existingAdminPill) existingAdminPill.remove();

      if (wrapper) wrapper.classList.remove('is-logged');
      userBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"/>
        </svg>
      `;
      userLabel.innerHTML = `
        <span class="user-pill__meta">Bienvenido</span>
        <span class="user-pill__name-row">
          <span class="user-pill__name">Iniciar sesión</span>
          <span class="user-pill__chevron">→</span>
        </span>
      `;
      userBtn.onclick = () => {
        window.location.href = 'login.html';
      };
    }
  },

  checkFlashMessages() {
    const urlParams = new URLSearchParams(window.location.search);
    const motivo = urlParams.get('motivo');

    let flashError = sessionStorage.getItem('flashError');
    let flashSuccess = sessionStorage.getItem('flashSuccess');
    let flashInfo = sessionStorage.getItem('flashInfo');

    if (motivo === 'denegado_admin' || motivo === 'denegado_vendedor') {
      flashError = '⛔ Acceso denegado: No tienes permisos para acceder a esa sección.';
    } else if (motivo === 'no_autenticado') {
      flashInfo = '🔒 Debes iniciar sesión para acceder a esa sección.';
    } else if (motivo === 'token_expirado') {
      flashError = 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.';
    } else if (motivo === 'logout') {
      flashSuccess = '✔ Has cerrado sesión exitosamente.';
    }

    if (flashError) {
      if (typeof window.showToast === 'function') window.showToast(flashError, 'error');
      sessionStorage.removeItem('flashError');
    }
    if (flashSuccess) {
      if (typeof window.showToast === 'function') window.showToast(flashSuccess, 'success');
      sessionStorage.removeItem('flashSuccess');
    }
    if (flashInfo) {
      if (typeof window.showToast === 'function') window.showToast(flashInfo, 'info');
      sessionStorage.removeItem('flashInfo');
    }

    if (motivo) {
      const cleanParams = new URLSearchParams(window.location.search);
      cleanParams.delete('motivo');
      const qs = cleanParams.toString();
      window.history.replaceState({}, document.title, qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    }
  },

  actualizarDatosModalPerfil(modal, perfilData) {
    if (!modal || !perfilData) return;
    const displayName = (perfilData.nombreUsuario || perfilData.idUsuario || 'Usuario').trim();
    const parts = displayName.split(/\s+/).filter(Boolean);
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : displayName.slice(0, 2).toUpperCase();
    const handle = `@${perfilData.idUsuario || 'usuario'}`;

    const avatarEl = modal.querySelector('#prof-avatar-initials');
    const nameEl = modal.querySelector('#prof-nombre-header');
    const subEl = modal.querySelector('#prof-handle-sub');
    const idEl = modal.querySelector('#prof-id');
    const emailEl = modal.querySelector('#prof-email');
    const telEl = modal.querySelector('#prof-tel');

    if (avatarEl) avatarEl.textContent = initials;
    if (nameEl) nameEl.textContent = displayName;
    if (subEl) subEl.textContent = perfilData.nombreRol ? `${handle} · ${perfilData.nombreRol}` : handle;
    if (idEl) idEl.textContent = handle;
    if (emailEl) emailEl.textContent = perfilData.emailUsuario || 'No especificado';
    if (telEl) telEl.textContent = perfilData.telefonoUsuario || 'No especificado';
  },

  async cargarPerfilUsuario(idUsuarioObjetivo, options = {}) {
    const targetId = String(idUsuarioObjetivo || '').trim();
    if (!targetId && !options.useOwnPerfil) return null;

    try {
      const endpoint = options.byAdminIdEndpoint
        ? `/api/admin/usuarios/${encodeURIComponent(targetId)}`
        : '/api/usuarios/perfil';
      const res = await window.api.get(endpoint);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (!options.silent && typeof window.showToast === 'function') {
          window.showToast(`⛔ ${data.message || 'Acceso denegado o usuario no disponible.'}`, 'error');
        }
        return null;
      }

      const modal = document.getElementById('profile-modal');
      if (options.openModal && !modal) {
        this.openProfileModal(data);
      } else if (modal) {
        this.actualizarDatosModalPerfil(modal, data);
      }

      return data;
    } catch (err) {
      console.error('Error al consultar perfil de usuario:', err);
      if (!options.silent && typeof window.showToast === 'function') {
        window.showToast('Error de conexión con el servidor.', 'error');
      }
      return null;
    }
  },

  openProfileModal(profileDataOverride = null) {
    let modal = document.getElementById('profile-modal');
    if (modal) modal.remove();

    const user = this.getUser();
    const activeData = profileDataOverride || user;
    if (!activeData) return;

    const esc = typeof window.escapeHTML === 'function' ? window.escapeHTML : (s => String(s ?? ''));
    const displayName = (activeData.nombreUsuario || activeData.idUsuario || 'Usuario').trim();
    const parts = displayName.split(/\s+/).filter(Boolean);
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : displayName.slice(0, 2).toUpperCase();

    modal = document.createElement('div');
    modal.id = 'profile-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="text-align:left; max-width:420px; padding:0; overflow:hidden; border-radius:22px; background:#18181C; border:1px solid rgba(197,164,109,0.4); box-shadow:0 28px 60px rgba(0,0,0,0.45); font-family:var(--fuenteSecundaria, 'Inter', system-ui, sans-serif);">
        <div style="background:radial-gradient(circle at 15% 0%, rgba(197,164,109,0.22), transparent 65%), linear-gradient(145deg, #18181C 0%, #222228 100%); padding:1.75rem 1.75rem 1.5rem; position:relative; border-bottom:1px solid rgba(197,164,109,0.2);">
          <button id="close-profile-modal" type="button" title="Cerrar" style="position:absolute; top:16px; right:16px; width:34px; height:34px; border-radius:50%; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.14); color:#D4D4D8; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:0.9rem;">✕</button>
          <div style="display:flex; align-items:center; gap:16px;">
            <div style="position:relative; width:62px; height:62px; border-radius:18px; background:linear-gradient(135deg, #DEC18C 0%, #A68045 100%); color:#141414; display:flex; align-items:center; justify-content:center; font-size:1.35rem; font-weight:800; letter-spacing:0.03em; flex-shrink:0;">
              <span id="prof-avatar-initials">${esc(initials)}</span>
              <span style="position:absolute; bottom:-3px; right:-3px; width:14px; height:14px; border-radius:50%; background:#10B981; border:2.5px solid #1C1C21;"></span>
            </div>
            <div style="min-width:0; flex:1; padding-right:24px;">
              <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(197,164,109,0.14); color:#DFC28E; border:1px solid rgba(197,164,109,0.32); padding:3px 10px; border-radius:999px; font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px;">
                Cuenta MercaUca
              </div>
              <div id="prof-nombre-header" style="margin:0; font-size:1.28rem; font-weight:700; color:#FFFFFF; line-height:1.25; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></div>
              <div id="prof-handle-sub" style="font-size:0.83rem; color:#A1A1AA; font-weight:500; margin-top:2px;"></div>
            </div>
          </div>
        </div>
        <div style="padding:1.4rem 1.6rem 1.6rem; background:#FFFFFF; border-radius:0 0 21px 21px;">
          <div style="display:flex; flex-direction:column; gap:0.65rem; margin-bottom:1.15rem;">
            <div style="display:flex; align-items:center; gap:13px; padding:0.75rem 0.95rem; background:#F8FAFC; border-radius:14px; border:1px solid #E2E8F0;">
              <div style="width:38px; height:38px; border-radius:10px; background:rgba(197,164,109,0.15); color:#8C6B37; display:flex; align-items:center; justify-content:center; flex-shrink:0;">👤</div>
              <div style="min-width:0; flex:1;">
                <div style="font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#64748B; margin-bottom:1px;">Nombre de usuario</div>
                <div id="prof-id" style="font-weight:700; color:#0F172A; font-size:0.93rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"></div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:13px; padding:0.75rem 0.95rem; background:#F8FAFC; border-radius:14px; border:1px solid #E2E8F0;">
              <div style="width:38px; height:38px; border-radius:10px; background:rgba(197,164,109,0.15); color:#8C6B37; display:flex; align-items:center; justify-content:center; flex-shrink:0;">✉️</div>
              <div style="min-width:0; flex:1;">
                <div style="font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#64748B; margin-bottom:1px;">Correo electrónico</div>
                <div id="prof-email" style="font-weight:600; color:#0F172A; font-size:0.92rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"></div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:13px; padding:0.75rem 0.95rem; background:#F8FAFC; border-radius:14px; border:1px solid #E2E8F0;">
              <div style="width:38px; height:38px; border-radius:10px; background:rgba(197,164,109,0.15); color:#8C6B37; display:flex; align-items:center; justify-content:center; flex-shrink:0;">📱</div>
              <div style="min-width:0; flex:1;">
                <div style="font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#64748B; margin-bottom:1px;">Teléfono de contacto</div>
                <div id="prof-tel" style="font-weight:600; color:#0F172A; font-size:0.93rem;"></div>
              </div>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px;">
            ${this.isAdmin(user) ? `
              <button id="btn-admin-dashboard" type="button" style="width:100%; padding:0.78rem 1rem; border-radius:12px; background:#18181C; color:#DFC28E; border:1px solid #C5A46D; font-size:0.9rem; font-weight:700; display:inline-flex; align-items:center; justify-content:center; gap:8px; cursor:pointer;">
                <span>🛡️</span> Ir al Panel de Administración
              </button>
            ` : ''}
            <div style="display:flex; gap:10px; width:100%;">
              <button id="btn-close-profile" type="button" style="flex:1; padding:0.78rem 1rem; border-radius:12px; background:#F1F5F9; color:#334155; border:1px solid #CBD5E1; font-size:0.9rem; font-weight:600; cursor:pointer;">
                Cerrar
              </button>
              ${user ? `
                <button id="btn-logout" type="button" style="flex:1.25; padding:0.78rem 1rem; border-radius:12px; background:linear-gradient(135deg, #B91C1C 0%, #881313 100%); color:#FFFFFF; border:none; font-size:0.9rem; font-weight:600; display:inline-flex; align-items:center; justify-content:center; gap:7px; cursor:pointer;">
                  Cerrar sesión
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#close-profile-modal').onclick = () => modal.remove();
    modal.querySelector('#btn-close-profile').onclick = () => modal.remove();
    const logoutBtn = modal.querySelector('#btn-logout');
    if (logoutBtn) logoutBtn.onclick = () => auth.logout();
    const adminDashBtn = modal.querySelector('#btn-admin-dashboard');
    if (adminDashBtn) {
      adminDashBtn.onclick = () => {
        modal.remove();
        window.location.href = 'admin.html';
      };
    }

    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    this.actualizarDatosModalPerfil(modal, activeData);

    if (!profileDataOverride && user && user.idUsuario) {
      this.cargarPerfilUsuario(user.idUsuario, { fromModal: true, useOwnPerfil: true, silent: true });
    }
  }
};

window.addEventListener('pageshow', () => {
  auth.checkFlashMessages();

  const user = auth.getUser();
  if (!user) {
    const profileModal = document.getElementById('profile-modal');
    if (profileModal) profileModal.remove();

    const checkoutModal = document.getElementById('checkout-confirm-modal');
    if (checkoutModal) checkoutModal.remove();

    const adminPill = document.getElementById('topbar-admin-pill');
    if (adminPill) adminPill.remove();
  }

  if (typeof auth.initTopbarUser === 'function') {
    auth.initTopbarUser();
  }

  if (window.cart && typeof window.cart.updateBadge === 'function') {
    window.cart.updateBadge();
  }
});

window.addEventListener('storage', (e) => {
  if (e.key === 'user' || e.key === 'token') {
    if (typeof auth.initTopbarUser === 'function') {
      auth.initTopbarUser();
    }
  }
});

window.auth = auth;
window.sesionLogin = window.sesionLogin || {
  setSession(data) {
    auth.setSession(data);
  }
};
