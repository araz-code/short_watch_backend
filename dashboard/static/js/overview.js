function loadAllCharts(year) {
  loadNumber("totalRequests", `/stats/chart/requestlogging/total/${year}/`);
  loadNumber("totalTodayRequests", `/stats/chart/requestlogging/total-today/`);
  loadNumber("latestRequestTimestamp", `/stats/chart/requestlogging/latest-request-timestamp/`);

  loadTable("requestedUrlsTable", `/stats/chart/requestlogging/requested-urls/${year}/`);

  loadTable("pickHistoricTable", `/stats/chart/requestlogging/pick-historic/${year}/`);
  loadTable("watchHistoricTable", `/stats/chart/requestlogging/watch-historic/${year}/`);
}
