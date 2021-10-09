import path = require("path");
import Color = require("color");
import express = require("express");
import compression = require("compression");
import mdns from "mdns";
import mqttHandler from "./mqttHandler"
import { DateTime } from "luxon";
import { readSavedData, TempLog, saveSettings, Reading } from "./fileManagement";


export interface ValidReading {
  temperature: number
}

interface Dataset {
  label: string;
  data: Reading[];
  borderColor: Color;
  backgroundColor: Color;
}

interface ChartData {
  type: string;
  datasets: Dataset[];
  options: any;
}

const rootFolder = path.join(__dirname, "../");

const chartOptions = {
  responsive: true,
  plugins: {
    title: {
      text: 'Temperature',
      display: true
    }
  },
  scales: {
    x: {
      type: 'time',
      time: {
        unit: 'minute',
        stepSize: 10,
        displayFormats: {
          minute: 'YYYY-MM-DD, HH:mm'
        }
      },
      title: {
        display: true,
        text: 'Date'
      }
    },
    y: {
      title: {
        display: true,
        text: 'Temperature'
      }
    }
  },
  parsing: {
    xAxisKey: 'time',
    yAxisKey: 'temperature'
  }
};

const port = 3000;
const app = express();
const router = express.Router();
export let temperatureLog: TempLog = {};

readSavedData().then(val => temperatureLog = val);
mdns.createAdvertisement(mdns.tcp("tempbroker"), 1883, { name: "TemperatureBroker" });


// setup web hosting
app.use(compression());
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "pug");
app.set("views", path.join(rootFolder, "views"));

mqttHandler("127.0.0.1");

function lastUpdate() {
  return `Last update: ${DateTime.now().toFormat("HH:mm:ss")}`;
}

// reports the last temperature reading of every sensor
function currentTemp() {
  const latestTemp = {};
  Object.keys(temperatureLog).forEach(key => {
    latestTemp[temperatureLog[key].settings.order] = {
      name: temperatureLog[key].settings.name.slice(0, 1).toUpperCase() + temperatureLog[key].settings.name.slice(1),
      temperature: temperatureLog[key].data.at(-1).temperature
    };
  });
  return latestTemp;
}

router.get("/", async (req, res) => {
  res.render("index", {
    currentTemp: currentTemp(),
    time: lastUpdate(),
  });
});

router.get("/settings", (req, res) => {
  const max = Object.keys(temperatureLog).length;
  const settings = []
  Object.keys(temperatureLog).forEach(key => {
    settings.push({
      id: key,
      name: temperatureLog[key].settings.name,
      color: temperatureLog[key].settings.color,
      order: temperatureLog[key].settings.order
    });
  });
  res.render("settings", {
    currentTemp: currentTemp(),
    settings,
    max: max,
    time: lastUpdate(),
  });
});

router.post("/settings", (req, res) => {
  Object.keys(temperatureLog).forEach(key => {
    temperatureLog[key].settings.name = req.body[key][0];
    temperatureLog[key].settings.color = req.body[key][1];
    temperatureLog[key].settings.order = req.body[key][2];
    saveSettings(key, temperatureLog[key].settings);
  });
  res.redirect("/");
});

// router.get("/log", (req, res) => {
//   // let currentTemp = currentTemp();
//   const readings = []; // fix later
//   res.render("log", {
//     currentTemp: currentTemp(),
//     readings: readings,
//     time: lastUpdate(),
//   });
// });

// router.get("/about", (req, res) => {
//   // let currentTemp = currentTemp();

//   res.render("about", {
//     currentTemp: currentTemp(),
//     time: lastUpdate(),
//   });
// });

router.get("/graph/:range?/:maxPoints", async (req, res) => {
  const chartData: ChartData = {
    type: "line",
    datasets: [],
    options: chartOptions,
  };
  const min = setMinRange(req.params.range);
  if (temperatureLog) {
    Object.keys(temperatureLog).forEach(id => {
      chartData.datasets[temperatureLog[id].settings.order] = {
        label: temperatureLog[id].settings.name.slice(0,1) + temperatureLog[id].settings.name.slice(1),
        data: filterAmountOfDataPoints(filterReadingsByDates(temperatureLog[id].data, min), parseInt(req.params.maxPoints)),
        borderColor: temperatureLog[id].settings.color,
        backgroundColor: temperatureLog[id].settings.color,
      };
    });
  }
  res.json(chartData);
});

function setMinRange(range: string): DateTime {
  const now = DateTime.now();
  let min = DateTime.fromMillis(0);
  switch (range) {
    case "hour":
      min = now.minus({ hours: 1 });
      break;

    case "day":
      min = now.minus({ days: 1 });
      break;

    case "week":
      min = now.minus({ weeks: 1 });
      break;

    case "month":
      min = now.minus({ months: 1 });
      break;

    case "year":
      min = now.minus({ years: 1 });
      break;

    default:
      break;
  }
  return min;
}

function filterAmountOfDataPoints(readings: Reading[], max: number): Reading[] {
  const filteredReadings = [];

  const pointDistance = Math.round(readings.length / max);

  if (pointDistance > 1) {
    for (let i = 0; i < readings.length; i += pointDistance) {
      filteredReadings.push(readings[i]);
    }
  } else return readings;


  return filteredReadings;
}

function filterReadingsByDates(readings: Reading[], startDate: DateTime, endDate: DateTime = DateTime.now()): Reading[] {
  let result: Reading[] = [];

  // find minutes between start and end date from what should be last index in readings
  const startIndex = findClosestReadingToDate(readings, startDate);
  const endIndex = findClosestReadingToDate(readings, endDate);
  if (startIndex !== endIndex) result = readings.slice(startIndex, endIndex);

  return result;
}

function findClosestReadingToDate(readings: Reading[], date: DateTime): number {
  let index = Math.round((readings.length - 1) - Math.abs(date.diffNow('minutes').toObject()['minutes']));
  if (index < 0) index = 0;
  if (index > readings.length - 1) index = readings.length - 1;
  let diff = readingDiffMinutes(readings[index], date);
  if (index > 0) {
    while (diff > 1) {
      if (DateTime.fromISO(readings[index].time) > date && index > 0) {
        const newDiff = readingDiffMinutes(readings[index - 1], date);
        if (newDiff < diff) {
          index--;
          diff = newDiff;
        } else break;
      } else if (DateTime.fromISO(readings[index].time) < date && index < readings.length - 1) {
        const newDiff = readingDiffMinutes(readings[index + 1], date);
        if (newDiff < diff) {
          index++;
          diff = newDiff;
        } else break;
      }
    }
  } else index = 0;
  return index;
}

function readingDiffMinutes(reading: Reading, compare: DateTime): number {
  return Math.round(DateTime.fromISO(reading.time).diff(compare, 'minutes').toObject()['minutes']);
}

router.get("/chart.min.js", async (req, res) => {
  res.sendFile(path.join(rootFolder, "node_modules/chart.js/dist/chart.min.js"));
});
router.get("/luxon.min.js", async (req, res) => {
  res.sendFile(path.join(rootFolder, "node_modules/luxon/build/global/luxon.min.js"));
});
router.get("/chartjs-adapter-luxon.min.js", async (req, res) => {
  res.sendFile(path.join(rootFolder, "node_modules/chartjs-adapter-luxon/dist/chartjs-adapter-luxon.min.js"));
});

router.get("*", function (req, res) {
  res.status(404).send("Sorry can't find that!");
});

app.use("/", router);
app.listen(process.env.port || port);

