window.sesionLogin = {
  setSession(data) {
    if (window.auth && typeof window.auth.setSession === 'function') {
      window.auth.setSession(data);
      return;
    }
    localStorage.removeItem('token');
    if (data && data.expiresAtUtc) localStorage.setItem('expiresAtUtc', data.expiresAtUtc);
    if (data && data.user) localStorage.setItem('user', JSON.stringify(data.user));
  }
};
