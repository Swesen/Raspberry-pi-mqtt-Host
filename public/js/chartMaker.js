const fontColor = '#c1d4df';
const gridColor = '#929ba1'
const chartOptions = {
  color: fontColor,
  pointRadius: 0,
  pointHitRadius: 5,
  responsive: true,
  plugins: {
    title: {
      color: fontColor,
      text: 'Temperature',
      display: true
    }
  },
  scales: {
    x: {
      grid: {
        borderColor: gridColor,
        color: gridColor
      },
      type: 'time',
      time: {
        minUnit: 'second',
        displayFormats: {
          second: 'HH:mm:ss',
          minute: 'yyyy-MM-dd, HH:mm',
          hour: 'yyyy-MM-dd, HH:mm',
          day: 'yyyy-MM-dd, HH:mm',
          week: 'yyyy-MM-dd',
          month: 'yyyy-MM'
        }
      },
      ticks: {
        maxRotation: 0,
        minRotation: 0,
        maxTicksLimit: 10,
        major: {
          enabled: true
        },
        color: fontColor,
      },
      title: {
        color: fontColor,
        display: true,
        text: 'Date',
      }
    },
    y: {
      grid: {
        borderColor: gridColor,
        color: gridColor
      },
      ticks: {
        color: fontColor,
      },
      title: {
        color: fontColor,
        display: true,
        text: 'Temperature °C'
      }
    }
  },
};

async function createGraph(range) {
  const fetched = await fetch("/graph/" + range)
    .then(response => response.json());
  const config = {
    type: fetched.type,
    data: fetched,
    options: JSON.parse(JSON.stringify(chartOptions))
  };
  config.options.plugins.title.text = config.options.plugins.title.text + " last " + range;
  // config.data.datasets.forEach(dataset => {
  //   dataset.data.forEach(data => {
  //     data.x = luxon.DateTime.fromISO(data.x);
  //   });
  // });
  var tempChart = new Chart(
    document.getElementById(range + "Chart"),
    config
  );
}

async function renderGraphs() {
  createGraph("hour");
  createGraph("day");
  createGraph("week");
  createGraph("month");
}

renderGraphs();