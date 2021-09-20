const fontColor = '#c1d4df';
const gridColor = '#929ba1'
const chartOptions = {
  color: fontColor,
  pointStyle: 'line',
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
      grid:{
        borderColor: gridColor,
        color: gridColor
      },
      type: 'time',
      time: {
        minUnit: 'minute',
        stepSize: 30,
        displayFormats: {
          second: 'HH:mm:ss',
          minute: 'yyyy-MM-dd, HH:mm',
          hour: 'yyyy-MM-dd, HH:mm',
          day: 'yyyy-MM-dd, HH:mm'
        }
      },
      ticks:{
        color: fontColor,
      },
      title: {
        color: fontColor,
        display: true,
        text: 'Date',
      }
    },
    y: {
      grid:{
        borderColor: gridColor,
        color: gridColor
      },
      ticks:{
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

async function createGraph() {
  const fetched = await fetch("/data")
    .then(response => response.json());
  const config = {
    type: fetched.type,
    data: fetched,
    options: chartOptions
  };
  // config.data.datasets.forEach(dataset => {
  //   dataset.data.forEach(data => {
  //     data.x = luxon.DateTime.fromISO(data.x);
  //   });
  // });
  var tempChart = new Chart(
    document.getElementById("tempChart"),
    config
  );
}

createGraph();