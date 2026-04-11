window.NCUIPackages = window.NCUIPackages || {};
window.NCUIPackages['form-kit'] = {
  ready: true,
  normalizeErrors: function (errors) {
    return Array.isArray(errors) ? errors : [];
  }
};
