function loadAllCharts(year) {
  loadNumber("totalRequests", `/stats/chart/requestlogging/total/${year}/`);
  loadNumber("totalTodayRequests", `/stats/chart/requestlogging/total-today/`);
   loadNumber("totalTodayIPs", `/stats/chart/requestlogging/total-unique-ips-today/`);

  loadNumber("latestRequestTimestamp", `/stats/chart/requestlogging/latest-request-timestamp/`);



  loadTable("requestedUrlsTable", `/stats/chart/requestlogging/requested-urls/${year}/`);

  loadTable("advertisementTable", `/stats/chart/requestlogging/advertisement-clicked/`);


  loadTable("pickHistoricTable", `/stats/chart/requestlogging/pick-historic/${year}/`);
  loadTable("watchHistoricTable", `/stats/chart/requestlogging/watch-historic/${year}/`);

  loadTable("uniqueIpsTable", `/stats/chart/requestlogging/unique-ips/`);

  loadChart(requestsWeekChart, `/stats/chart/requestlogging/requests-week/`);
  loadChart(requestsHourlyChart, `/stats/chart/requestlogging/requests-hourly/`);
  loadChart(pickRequestsHourlyChart, `/stats/chart/requestlogging/pick-requests-hourly/`);
  loadChart(watchRequestsHourlyChart, `/stats/chart/requestlogging/watch-requests-hourly/`);
}

const requestsWeekChart = createBarChart("requestsWeekChart");
const requestsHourlyChart = createBarChart("requestsHourlyChart");
const pickRequestsHourlyChart = createBarChart("pickRequestsHourlyChart");
const watchRequestsHourlyChart = createBarChart("watchRequestsHourlyChart");


