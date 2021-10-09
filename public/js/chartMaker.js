const maxPoints = 2000;
const fontColor = '#c1d4df';
const gridColor = '#929ba1'

function constructOptionsObject() {
  return {
    color: fontColor,
    pointRadius: 0,
    pointHitRadius: 5,
    responsive: true,
    plugins: {
      title: {
        color: fontColor,
        text: 'Temperature',
        display: true
      },
      tooltip: {
        callbacks: {
          title: function (context) {
            return luxon.DateTime.fromMillis(context[0].parsed.x).toFormat('yyyy-MM-dd, HH:mm');
          },
          label: function (context) {
            return `${context.dataset.label}: ${context.parsed.y} °C`;
          }
        }
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
            day: 'yyyy-MM-dd',
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
          display: false,
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
          callback: function (tickValue) {
            return `${tickValue} °C`
          }
        },
        title: {
          color: fontColor,
          display: false,
          text: 'Temperature'
        }
      }
    },
    elements: {
      line: {
        tension: 0.3
      }
    },
    parsing: {
      xAxisKey: 'time',
      yAxisKey: 'temperature'
    }
  };
}

async function createGraph(range, max = maxPoints) {
  const fetched = await fetch(`/graph/${range}/${max}`)
    .then(response => response.json());
  const config = {
    type: fetched.type,
    data: { datasets: fetched.datasets },
    options: constructOptionsObject()
  };

  config.options.plugins.title.text = `${config.options.plugins.title.text} last ${range}`;

  new Chart(
    document.getElementById(range + "Chart"),
    config
  );
}

async function renderGraphs() {
  createGraph("hour", 60);
  document.getElementById("loaderHour").style.display = "none";
  setTimeout(() => {
    createGraph("day", 720);
    document.getElementById("loaderDay").style.display = "none";
  }, 1000);
  setTimeout(() => {
    createGraph("week");
    document.getElementById("loaderWeek").style.display = "none";
  }, 2000);
  setTimeout(() => {
    createGraph("month");
    document.getElementById("loaderMonth").style.display = "none";
  }, 3000);

}

renderGraphs();