import path = require("path");
import Color = require("color");
import express = require("express");
import date = require("date-and-time");
import compression = require("compression");

interface Settings {
  name: string;
  color: Color;
  order: number;
}

interface Reading {
  id: string;
  temperature: number;
  time: Date;
}

interface Data {
  x: string;
  y: number;
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

interface TempLog {
  [index: string]: {
    settings: Settings;
    data?: [];
  };
}

const root = path.join(__dirname, "../");

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

let temperatureLog: TempLog;

// setup web hosting
app.use("/", router);
app.use(compression());
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "pug");
app.set("views", path.join(root, "views"));

// reports the last temperature reading of every sensor
function currentTemp(): Reading[] {
  return [];
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
  let currentTemp = currentTemp();
  const readings = []; // fix later
  res.render("log", {
    currentTemp: currentTemp,
    readings: readings,
    time: date.format(new Date(), "[Last update: ]HH:mm:ss"),
  });
});

router.get("/about", (req, res) => {
  let currentTemp = currentTemp();

  res.render("about", {
    currentTemp,
    time: date.format(new Date(), "[Last update: ]HH:mm:ss"),
  });
});

router.get("/data", async (req, res) => {
  const chartData: ChartData = {
    type: "line",
    datasets: [],
    options: chartOptions,
  };
  res.json(chartData);
});

router.get("/chart.min.js", async (req, res) => {
  res.sendFile(path.join(root, "node_modules/chart.js/dist/chart.min.js"));
});

app.listen(process.env.port || port);
