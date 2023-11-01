function loadAllCharts(year) {
  loadNumber("totalRequests", `/stats/chart/requestlogging/total/${year}/`);
  loadNumber("uniqueIPs", `/stats/chart/requestlogging/unique-ips/${year}/`);
  loadNumber("avgRequestsPerIP", `/stats/chart/requestlogging/avg-requests-per-ip/${year}/`);
  loadNumber("totalTodayRequests", `/stats/chart/requestlogging/total-today/`);
  loadNumber("uniqueIPsToday", `/stats/chart/requestlogging/unique-ips-today/`);
  loadNumber("avgRequestsPerIPToday", `/stats/chart/requestlogging/avg-requests-per-ip-today/`);
}
