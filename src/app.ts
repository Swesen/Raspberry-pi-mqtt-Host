import path = require("path");
import mqtt = require("mqtt");
import Color = require("color");
import mdns = require("mdns")
import express = require("express");
import date = require("date-and-time");
import compression = require("compression");
import { readSavedData, TempLog, Settings, Reading } from "./fileManagement";

interface Data {
  x: Date;
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
    legend: {
      position: "bottom",
    },
    title: {
      display: true,
      text: "Temperature",
    },
  },
};

const port = 3000;
const app = express();
const router = express.Router();
const client = mqtt.connect("mqtt://127.0.0.1:1883");

let temperatureLog: TempLog;

readSavedData().then(val => temperatureLog = val);
mdns.createAdvertisement(mdns.tcp("tempbroker"), 1883, { name: "TemperatureBroker" });


// setup web hosting
app.use("/", router);
app.use(compression());
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "pug");
app.set("views", path.join(rootFolder, "views"));

// reports the last temperature reading of every sensor
function currentTemp(): Reading[] {
  return [];
}

function randomColor(): Color {
  return Color(`rgb(
    ${(Math.random() * 256).toFixed()},
    ${(Math.random() * 256).toFixed()},
    ${(Math.random() * 256).toFixed()}
    )`);
}

function newSettings() {
  return { name: "New sensor", color: randomColor(), order: Math.floor(Math.random() * 256) }
}

router.get("/", async (req, res) => {
  res.render("index", {
    currentTemp: currentTemp(),
    time: date.format(new Date(), "[Last update: ]HH:mm:ss"),
  });
});

router.get("/settings", (req, res) => {
  //let currentTemp = currentTemp();
  // inject fillcolor
  const max = 0;
  // currentTemp.forEach((element) => {
  //     let found = sensorSettings.find((post) => { if (post.id == element.id) { return true; } })
  //     element.fillcolor = found.fillcolor;
  //     element.order = found.order;
  //     max++;
  // });
  res.render("settings", {
    currentTemp: currentTemp(),
    max: max,
    time: date.format(new Date(), "[Last update: ]HH:mm:ss"),
  });
});

router.post("/settings", (req, res) => {
  // sensorSettings.forEach(element => {
  //     element.name = req.body[element.id][0];
  //     element.color = req.body[element.id][1];
  //     element.order = req.body[element.id][2];
  // });
  // let settingsStream = fs.createWriteStream(settingsFile, { flags: "w" });
  // settingsStream.write(JSON.stringify(sensorSettings));
  res.redirect("/settings");
});

router.get("/log", (req, res) => {
  // let currentTemp = currentTemp();
  const readings = []; // fix later
  res.render("log", {
    currentTemp: currentTemp(),
    readings: readings,
    time: date.format(new Date(), "[Last update: ]HH:mm:ss"),
  });
});

router.get("/about", (req, res) => {
  // let currentTemp = currentTemp();

  res.render("about", {
    currentTemp: currentTemp(),
    time: date.format(new Date(), "[Last update: ]HH:mm:ss"),
  });
});

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
        borderColor: Color,
        backgroundColor: Color,
      };
    });
  }
  res.json(chartData);
});

router.get("/chart.min.js", async (req, res) => {
  res.sendFile(path.join(rootFolder, "node_modules/chart.js/dist/chart.min.js"));
});

client.on("connect", _ => {
  console.log("Connected to mqtt broker!");
  client.subscribe("temperature/+/reading", () => {
    console.log("Subscribed to: temperature/+/reading\n+ = the id of the sensor");

  });
});

client.on("message", (topic, message) => {
  const topicHirarcy = topic.split("/");
  const id = topicHirarcy[1];

  // expected topic is "temperature/{id}/reading"
  if (topicHirarcy[0] === "temperature") {
    if (topicHirarcy[2] === "reading") {

      // should probably do some error checking on message
      // expected message: {temperature: ##}
      const parsedMessage = JSON.parse(message.toString());
      const reading: Reading = { temperature: parsedMessage.temperature, time: new Date() }
      console.log(parsedMessage);
      if (!temperatureLog) {
        temperatureLog = {
          [id]: {
            settings: newSettings(),
            data: [reading]
          }
        }
        console.log("First reading!");
      } else if (!temperatureLog[id]) {
        temperatureLog[id] = {
          settings: newSettings(),
          data: [reading]
        }
        console.log("New sensor!");
      }
      else {
        temperatureLog[id].data.push(reading);
        console.log("New reading");
      }
    }
    else {
      console.log("Received topic:" + topic + "\nWhich is not expected!");
    }

  }
});

client.on("offline", _ => console.log("Broker offline!"));


app.listen(process.env.port || port);
