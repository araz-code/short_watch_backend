function loadAllCharts() {
  loadNumber("totalRequests", `/stats/chart/total/`);
  loadNumber("totalTodayRequests", `/stats/chart/total-today/`);
  loadNumber("totalTodayIPs", `/stats/chart/total-unique-ips-today/`);
  loadNumber("latestRequestTimestamp", `/stats/chart/latest-request-timestamp/`);

  loadTable("requestedUrlsTable", `/stats/chart/static-pages/`);
  loadTable("versionsTable", `/stats/chart/versions/`);
  loadTable("visitsByPlatformTable", `/stats/chart/visits-by-platform/`);
  loadTable("visitsBySectionTable", `/stats/chart/visits-by-section/`);
  loadTable("pickHistoricTable", `/stats/chart/pick-history/`);
  loadTable("watchHistoricTable", `/stats/chart/watch-history/`);
  loadTable("uniqueIpsTable", `/stats/chart/unique-ips/`);

  loadChart(requestsWeekChart, `/stats/chart/requests-week/`);
  loadChart(requestsHourlyChart, `/stats/chart/requests-hourly/`);
  loadChart(pickRequestsHourlyChart, `/stats/chart/pick-requests-hourly/`);
  loadChart(watchRequestsHourlyChart, `/stats/chart/watch-requests-hourly/`);
}

const requestsWeekChart = createBarChart("requestsWeekChart");
const requestsHourlyChart = createBarChart("requestsHourlyChart");
const pickRequestsHourlyChart = createBarChart("pickRequestsHourlyChart");
const watchRequestsHourlyChart = createBarChart("watchRequestsHourlyChart");
