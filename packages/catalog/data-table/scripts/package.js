window.NCUIPackages = window.NCUIPackages || {};
window.NCUIPackages['data-table'] = {
  ready: true,
  enhance: function (table) {
    if (table) table.setAttribute('data-enterprise', 'true');
  }
};
