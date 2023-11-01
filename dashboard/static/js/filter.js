$("#filterForm").on("submit", (event) => {
  event.preventDefault();

  const year = $("#year").val();

  loadAllCharts(year);
});
