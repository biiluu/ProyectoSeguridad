window.sesionLogin = {
  setSession(data) {
    // Asegurar que ningún token JWT quede jamás expuesto en localStorage
    localStorage.removeItem('token');
    if (data.expiresAtUtc) localStorage.setItem('expiresAtUtc', data.expiresAtUtc);
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
  }
};
