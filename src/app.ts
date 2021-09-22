import path = require("path");
import mqtt = require("mqtt");
import Color = require("color");
import express = require("express");
import compression = require("compression");
import mdns from "mdns";
import { DateTime } from "luxon";
import { readSavedData, TempLog, Settings, Reading, saveReading, saveSettings } from "./fileManagement";

interface Data {
  x: string;
  y: number;
}

interface ValidReading {
  temperature: number
}

interface Dataset {
  label: string;
  data: Data[];
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
        text: 'value'
      }
    }
  },
};
// {
//   responsive: true,
//   plugins: {
//     legend: {
//       position: "bottom",
//     },
//     title: {
//       display: true,
//       text: "Temperature",
//     },
//     scales: {
//       x: {
//         type: 'time',
//         time: {
//           // Luxon format string
//           tooltipFormat: 'HH:mm, DD-MM-YY'
//         },
//         title: {
//           display: true,
//           text: 'Date'
//         }
//       },
//       y: {
//         title: {
//           display: true,
//           text: 'value'
//         }
//       }
//     },
//   },
// };

const port = 3000;
const app = express();
const router = express.Router();
const client = mqtt.connect("mqtt://127.0.0.1:1883");

let temperatureLog: TempLog = {};

readSavedData().then(val => temperatureLog = val);
mdns.createAdvertisement(mdns.tcp("tempbroker"), 1883, { name: "TemperatureBroker" });


// setup web hosting
app.use(compression());
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "pug");
app.set("views", path.join(rootFolder, "views"));

function lastUpdate() {
  return `Last update: ${DateTime.now().toFormat("HH:mm:ss")}`;
}

// reports the last temperature reading of every sensor
function currentTemp() {
  const latestTemp = {};
  Object.keys(temperatureLog).forEach(key => {
    latestTemp[temperatureLog[key].settings.order] = {
      name: temperatureLog[key].settings.name.slice(0,1).toUpperCase() + temperatureLog[key].settings.name.slice(1),
      temperature: temperatureLog[key].data.at(-1).temperature
    };
  });
  return latestTemp;
}

function randomColor(): Color {
  return Color.rgb(
    (Math.random() * 255),
    (Math.random() * 255),
    (Math.random() * 255)
  ).hex();
}

function newSettings() {
  return { name: "New sensor", color: randomColor(), order: Object.keys(temperatureLog).length }
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

router.get("/data", async (req, res) => {
  const chartData: ChartData = {
    type: "line",
    datasets: [],
    options: chartOptions,
  };
  if (temperatureLog) {
    Object.keys(temperatureLog).forEach(id => {
      chartData.datasets[temperatureLog[id].settings.order] = {
        label: temperatureLog[id].settings.name,
        data: temperatureLog[id].data.map(reading => { return { x: reading.time, y: reading.temperature } }),
        borderColor: temperatureLog[id].settings.color,
        backgroundColor: temperatureLog[id].settings.color,
      };
    });
  }
  res.json(chartData);
});

router.get("/chart.min.js", async (req, res) => {
  res.sendFile(path.join(rootFolder, "node_modules/chart.js/dist/chart.min.js"));
});
router.get("/luxon.min.js", async (req, res) => {
  res.sendFile(path.join(rootFolder, "node_modules/luxon/build/global/luxon.min.js"));
});
router.get("/chartjs-adapter-luxon.min.js", async (req, res) => {
  res.sendFile(path.join(rootFolder, "node_modules/chartjs-adapter-luxon/dist/chartjs-adapter-luxon.min.js"));
});

client.on("connect", _ => {
  console.log("Connected to mqtt broker!");
  client.subscribe("temperature/+/reading", () => {
    console.log("Subscribed to: temperature/+/reading\n+ = the id of the sensor");

  });
});

// MQTT message received from sensor client
client.on("message", (topic, message) => {
  const topicHirarcy = topic.split("/");
  const id = topicHirarcy[1];

  // expected topic is "temperature/{id}/reading"
  if (topicHirarcy[0] === "temperature") {
    if (topicHirarcy[2] === "reading") {

      // should probably do some error checking on message
      // expected message: {temperature: ##}
      const parsedMessage: ValidReading = JSON.parse(message.toString());
      const reading: Reading = { temperature: parsedMessage.temperature, time: DateTime.now().toISO() }

      if (!temperatureLog[id]) {
        const settings: Settings = newSettings();
        saveSettings(id, settings);
        temperatureLog[id] = {
          settings: settings,
          data: [reading]
        }
      }
      else {
        temperatureLog[id].data.push(reading);
      }
      saveReading(id, reading);
    }
    else {
      console.log("Received topic:" + topic + "\nWhich is not expected!");
    }

  }
});

client.on("offline", _ => console.log("Broker offline!"));

app.use("/", router);
// app.use(function (req, res, next) {
//   res.status(404).send("Sorry can't find that!");
// });
app.listen(process.env.port || port);
