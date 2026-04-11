window.NCUIPackages = window.NCUIPackages || {};
window.NCUIPackages['ops-dashboard'] = {
  ready: true,
  severityColor: function (level) {
    return level === 'critical' ? '#dc2626' : '#f97316';
  }
};
