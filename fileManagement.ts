import fs = require("fs");
import path = require("path");
import Color = require("color");

interface Settings {
  name: string;
  color: Color;
  order: number;
}

interface TempLog {
  [index: string]: {
    settings: Settings;
    data?: [];
  };
}
const root = path.join(__dirname, "../");
const dataFolder = root + "data";

async function readContents(folder: string): Promise<string[]> {
  if (!fs.existsSync(folder)) {
    fs.mkdir(folder, (err) => console.log(err));
  } else {
    let contents: string[];
    fs.readdir(folder, (err, files) => {
      if (err) console.log(err);
      else contents = files;
    });
    console.log(contents);
    return contents;
  }
  return [];
}

function error(err: NodeJS.ErrnoException) {
  if (err) {
    if (err.code === "ENOENT") {
      console.error(err.path + "does not exist");
      return;
    }
    throw err;
  }
}

function readFiles(id: string) {
  let temperatureLog: TempLog;
  const propertiesPath = `${dataFolder}/${id}/properties.json`;
  const logPath = `${dataFolder}/${id}/readings.log`;

  fs.open(propertiesPath, "r", (err, fd) => {
    error(err);
    try {
      fs.readFile(fd, { encoding: "utf8" }, (err, data) => {
        error(err);
        temperatureLog.id.settings = JSON.parse(data);
      });
    } finally {
      fs.close(fd, error);
    }
  });

  fs.open(logPath, "r", (err, fd) => {
    error(err);
    try {
      fs.readFile(fd, { encoding: "utf8" }, (err, data) => {
        error(err);
        temperatureLog.id.data = JSON.parse("[" + data.slice(0, -2) + "]");
      });
    } finally {
      fs.close(fd, error);
    }
  });
}

//
async function readSavedData() {
  const dataContents = readContents(dataFolder);
  //let settingsContents = readContents(settingsFolder);

  const idFolders = (await dataContents).filter((contents) => {
    return fs.statSync(dataFolder + "/" + contents).isDirectory();
  });

  idFolders.forEach(readFiles);
}
