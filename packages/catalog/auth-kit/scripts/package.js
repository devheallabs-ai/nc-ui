window.NCUIPackages = window.NCUIPackages || {};
window.NCUIPackages['auth-kit'] = {
  ready: true,
  useAuthStatus: function () {
    return window.NCUIAuth ? window.NCUIAuth.isAuthenticated() : false;
  }
};
