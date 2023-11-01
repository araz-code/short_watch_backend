$(document).ready(function () {
  $.ajax({
    url: "/stats/chart/filter-options/",
    type: "GET",
    dataType: "json",
    success: (jsonResponse) => {
      // Load all the options
      jsonResponse.options.forEach((option) => {
        $("#year").append(new Option(option, option));
      });

      // Load data for the first option if there is data
      if ($("#year").children().length == 0) return;

      loadAllCharts($("#year").children().first().val());
    },
    error: () => console.log("Failed to fetch chart filter options!"),
  });
});

function loadChart(chart, endpoint) {
  $.ajax({
    url: endpoint,
    type: "GET",
    dataType: "json",
    success: (jsonResponse) => {
      // Extract data from the response
      const title = jsonResponse.title;
      const labels = jsonResponse.data.labels;
      const datasets = jsonResponse.data.datasets;

      // Reset the current chart
      chart.data.datasets = [];
      chart.data.labels = [];

      // Load new data into the chart
      chart.options.title.text = title;
      chart.options.title.display = true;
      chart.data.labels = labels;
      datasets.forEach((dataset) => {
        chart.data.datasets.push(dataset);
      });
      chart.update();
    },
    error: () =>
      console.log("Failed to fetch chart data from " + endpoint + "!"),
  });
}

function loadNumber(fieldId, endpoint) {
  $.ajax({
    url: endpoint,
    type: "GET",
    dataType: "json",
    success: (jsonResponse) => {
      const title = jsonResponse.title;
      const count = jsonResponse.count;

      const valueField = document.getElementById(fieldId);
      valueField.innerHTML = count;

      const titleField = document.getElementById(fieldId + "Title");
      titleField.innerHTML = title;
    },
    error: () =>
      console.log("Failed to fetch number data from " + endpoint + "!"),
  });
}

function loadTable(fieldId, endpoint) {
  $.ajax({
    url: endpoint,
    type: "GET",
    dataType: "json",
    success: (jsonResponse) => {
      const caption = jsonResponse.caption;
      const headers = jsonResponse.headers;
      const data = jsonResponse.data;

      let table = document.getElementById(fieldId);
      $(`#${fieldId} tr`).remove();

      createTable(table, caption, headers, data);
    },
    error: () =>
      console.log("Failed to fetch number data from " + endpoint + "!"),
  });
}

function createBarChart(chartId) {
  const ctx = document.getElementById(chartId).getContext("2d");
  let chart = new Chart(ctx, {
    type: "bar",
    options: {
      responsive: true,
      layout: {
        padding: {
          left: 0,
          right: 0,
          top: 30,
          bottom: 2,
        },
      },
      scales: {
        yAxes: [
          {
            ticks: {
              precision: 0,
              suggestedMin: 0,
            },
          },
        ],
      },
    },
  });

  return chart;
}

function createPieChart(chartId) {
  let ctx = document.getElementById(chartId).getContext("2d");
  let chart = new Chart(ctx, {
    type: "pie",
    options: {
      responsive: true,
      layout: {
        padding: {
          left: 0,
          right: 0,
          top: 15,
          bottom: 2,
        },
      },
    },
  });

  return chart;
}

function createTable(table, captionText, headers, data) {
  const caption = table.createCaption();
  caption.innerHTML = captionText;

  const thead = table.createTHead();
  thead.className = "thead-light text-center";
  const row = thead.insertRow();
  for (const key of headers) {
    const th = document.createElement("th");
    const text = document.createTextNode(key);
    th.appendChild(text);
    row.appendChild(th);
  }

  const tbody = table.createTBody();
  for (const element of data) {
    const row = tbody.insertRow();

    for (key in element) {
      const cell = row.insertCell();
      const text = document.createTextNode(element[key]);

      if (!isNaN(element[key])) {
        cell.className = "text-right";
      }
      cell.appendChild(text);
    }
  }
}
