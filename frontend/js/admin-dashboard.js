// Controlador para Dashboard Principal y Ventas/Órdenes de Administración
const adminDashboard = {
  ordenesCache: [],

  async verificarAdmin() {
    try {
      const res = await fetch(`${window.API_URL}/api/usuarios/verify`, { credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      return data && data.user ? data.user : null;
    } catch {
      return null;
    }
  },

  async init() {
    const noLogin = document.getElementById('no-login-view');
    const noAdmin = document.getElementById('no-admin-view');
    const dashPanel = document.getElementById('admin-dashboard-panel');
    const ordPanel = document.getElementById('admin-ordenes-panel');

    const user = await this.verificarAdmin();
    if (!user) {
      if (noLogin) noLogin.style.display = 'block';
      return;
    }
    if (String(user.nombreRol || '').trim().toLowerCase() !== 'administrador') {
      if (noAdmin) noAdmin.style.display = 'block';
      return;
    }

    const nameEl = document.getElementById('sidebar-admin-name');
    const avatarEl = document.getElementById('sidebar-admin-avatar');
    if (nameEl) nameEl.textContent = user.nombreUsuario || user.idUsuario;
    if (avatarEl) avatarEl.textContent = (user.nombreUsuario || user.idUsuario || 'A').charAt(0).toUpperCase();

    if (dashPanel) {
      dashPanel.style.display = 'block';
      await this.cargarDashboard();
    }
    if (ordPanel) {
      ordPanel.style.display = 'block';
      const filtro = document.getElementById('filtro-ordenes-estado');
      if (filtro) {
        filtro.addEventListener('change', () => this.cargarOrdenes(filtro.value));
      }
      await this.cargarOrdenes();
    }
  },

  async cargarDashboard() {
    try {
      const res = await fetch(`${window.API_URL}/api/admin/stats`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const u = data.usuarios || {};
      const p = data.productos || {};
      const v = data.ventas || {};

      document.getElementById('kpi-total-usuarios').textContent = u.totalUsuarios || 0;
      document.getElementById('kpi-sub-usuarios').textContent =
        `${u.totalCompradores || 0} Compradores · ${u.totalVendedores || 0} Vendedores · ${u.totalAdmins || 0} Admins`;
      document.getElementById('kpi-total-productos').textContent = p.totalProductos || 0;
      document.getElementById('kpi-sub-productos').textContent =
        `${p.productosBajoStock || 0} artículos con stock bajo (≤ 5)`;
      document.getElementById('kpi-total-ventas').textContent =
        Number(v.totalVentas || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
      document.getElementById('kpi-total-ordenes').textContent = v.totalOrdenes || 0;
      document.getElementById('kpi-sub-ordenes').textContent =
        `${v.ordenesPagadas || 0} Pagadas · ${v.ordenesEnviadas || 0} Enviadas · ${v.ordenesPendientes || 0} Pendientes`;

      await this.cargarActividadReciente();
    } catch (err) {
      console.error('Error cargando dashboard:', err);
    }
  },

  async cargarActividadReciente() {
    const tbody = document.getElementById('tabla-recientes-body');
    if (!tbody) return;
    try {
      const res = await fetch(`${window.API_URL}/api/admin/ordenes`, { credentials: 'include' });
      if (!res.ok) return;
      const ordenes = await res.json();
      if (!Array.isArray(ordenes) || ordenes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1.5rem;">No hay ventas registradas aún.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      ordenes.slice(0, 5).forEach(o => {
        const tr = document.createElement('tr');
        const fecha = o.fechaCreacion ? new Date(o.fechaCreacion).toLocaleDateString('es-ES') : 'N/A';
        const total = Number(o.montoTotal || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        const estadoClass = `order-badge--${escapeHTML(o.idEstadoOrden || 'EO01')}`;
        tr.innerHTML = `
          <td><strong>${escapeHTML(o.idOrden)}</strong></td>
          <td>${escapeHTML(o.nombreComprador || o.idComprador)}</td>
          <td><span class="order-badge ${estadoClass}">${escapeHTML(o.nombreEstado || o.idEstadoOrden)}</span></td>
          <td><strong>${total}</strong></td>
          <td style="color:#64748B;">${fecha}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error('Error cargando ventas recientes:', err);
    }
  },

  async cargarOrdenes(estado = '') {
    const tbody = document.getElementById('tabla-ordenes-body');
    if (!tbody) return;
    try {
      const qs = estado ? `?estado=${encodeURIComponent(estado)}` : '';
      const res = await fetch(`${window.API_URL}/api/admin/ordenes${qs}`, { credentials: 'include' });
      if (!res.ok) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem;">No se pudieron cargar las órdenes.</td></tr>';
        return;
      }
      this.ordenesCache = await res.json();
      if (!Array.isArray(this.ordenesCache) || this.ordenesCache.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem;">No se registran ventas para este criterio.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      this.ordenesCache.forEach(o => {
        const tr = document.createElement('tr');
        const fecha = o.fechaCreacion ? new Date(o.fechaCreacion).toLocaleString('es-ES') : 'N/A';
        const total = Number(o.montoTotal || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        const estadoClass = `order-badge--${escapeHTML(o.idEstadoOrden || 'EO01')}`;

        tr.innerHTML = `
          <td><strong>${escapeHTML(o.idOrden)}</strong></td>
          <td>
            <strong>${escapeHTML(o.nombreComprador || o.idComprador)}</strong>
            <div style="font-size:0.75rem; color:#64748B;">${escapeHTML(o.emailComprador || '—')}</div>
          </td>
          <td style="color:#64748B; font-size:0.82rem;">${fecha}</td>
          <td><strong style="font-size:1.05rem;">${total}</strong></td>
          <td><span class="order-badge ${estadoClass}">${escapeHTML(o.nombreEstado || o.idEstadoOrden)}</span></td>
          <td><button type="button" class="btn-topbar btn-ver-factura" style="padding:4px 10px; font-size:0.8rem;">📄 Ver Factura (${(o.articulos || []).length} ítems)</button></td>
          <td style="text-align: right;">
            <select class="select-filter select-orden-estado" style="height:34px; padding:0 8px; font-size:0.8rem;">
              <option value="EO01" ${o.idEstadoOrden === 'EO01' ? 'selected' : ''}>Pendiente</option>
              <option value="EO02" ${o.idEstadoOrden === 'EO02' ? 'selected' : ''}>Pagada</option>
              <option value="EO03" ${o.idEstadoOrden === 'EO03' ? 'selected' : ''}>Enviada</option>
              <option value="EO04" ${o.idEstadoOrden === 'EO04' ? 'selected' : ''}>Entregada</option>
              <option value="EO05" ${o.idEstadoOrden === 'EO05' ? 'selected' : ''}>Cancelada</option>
            </select>
          </td>
        `;
        tr.querySelector('.btn-ver-factura').addEventListener('click', () => this.verFacturaOrden(o.idOrden));
        tr.querySelector('.select-orden-estado').addEventListener('change', (e) => this.cambiarEstadoOrden(o.idOrden, e.target.value));
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error('Error al cargar órdenes:', err);
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem;">Error de conexión.</td></tr>';
    }
  },

  verFacturaOrden(idOrden) {
    const o = this.ordenesCache.find(x => x.idOrden === idOrden);
    if (!o) return;

    document.getElementById('factura-id').textContent = o.idOrden;
    document.getElementById('factura-cliente').textContent = o.nombreComprador || o.idComprador;
    document.getElementById('factura-email').textContent = o.emailComprador || '—';
    document.getElementById('factura-fecha').textContent = o.fechaCreacion ? new Date(o.fechaCreacion).toLocaleString('es-ES') : 'N/A';
    const estEl = document.getElementById('factura-estado');
    estEl.textContent = o.nombreEstado || o.idEstadoOrden;
    estEl.className = `order-badge order-badge--${o.idEstadoOrden || 'EO01'}`;
    document.getElementById('factura-total').textContent =
      Number(o.montoTotal || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    const tbody = document.getElementById('factura-items-body');
    tbody.innerHTML = '';
    (o.articulos || []).forEach(a => {
      const r = document.createElement('tr');
      r.innerHTML = `
        <td><strong>${escapeHTML(a.tituloProducto)}</strong><div style="font-size:0.75rem; color:#64748B;">Vendido por: ${escapeHTML(a.nombreVendedor || a.idVendedor)}</div></td>
        <td style="text-align:center;">${parseInt(a.cantidad, 10) || 1}</td>
        <td style="text-align:right;"><strong>$${Number(a.subTotal || 0).toFixed(2)}</strong></td>
      `;
      tbody.appendChild(r);
    });

    document.getElementById('modal-factura').style.display = 'flex';
  },

  async cambiarEstadoOrden(idOrden, nuevoEstado) {
    try {
      const res = await fetch(`${window.API_URL}/api/admin/ordenes/${encodeURIComponent(idOrden)}/estado`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idEstadoOrden: nuevoEstado })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (typeof window.showToast === 'function') window.showToast('Estado de orden actualizado.', 'success');
        const filtro = document.getElementById('filtro-ordenes-estado');
        await this.cargarOrdenes(filtro ? filtro.value : '');
      } else if (typeof window.showToast === 'function') {
        window.showToast(data.message || 'No se pudo actualizar la orden.', 'error');
      }
    } catch {
      if (typeof window.showToast === 'function') window.showToast('Error de conexión.', 'error');
    }
  },

  cerrarModales() {
    document.querySelectorAll('.modal-overlay').forEach(m => { m.style.display = 'none'; });
  }
};

window.adminDashboard = adminDashboard;
document.addEventListener('DOMContentLoaded', () => adminDashboard.init());
