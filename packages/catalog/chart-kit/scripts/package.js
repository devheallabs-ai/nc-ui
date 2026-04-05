window.NCUIPackages = window.NCUIPackages || {};
window.NCUIPackages['chart-kit'] = {
  ready: true,
  sparkline: function (values) {
    return Array.isArray(values) ? values.join(',') : '';
  }
};
