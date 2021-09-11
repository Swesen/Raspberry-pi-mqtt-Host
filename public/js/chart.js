const config = {
  type: 'line',
  data: fetch("/data"),
  options: {}
};

var tempChart = new Chart(
  document.getElementById("tempChart"),
  config
);
