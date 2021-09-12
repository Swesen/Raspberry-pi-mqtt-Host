import fs = require("fs");
import path = require("path");
import Color = require("color");

export interface Settings {
  name: string,
  color: Color,
  order: number,
}

export interface Reading {
  temperature: number;
  time: Date;
}

export interface TempLog {
  [x: string]: {
    settings: Settings;
    data?: Reading[];
  };
}

interface IdFileHandle {
  [id: string]: fs.WriteStream;
}

const rootFolder = path.join(__dirname, "../");
const dataFolder = rootFolder + "data";
let logFiles: IdFileHandle;

async function readContents(folder: string): Promise<string[]> {
  if (!fs.existsSync(folder)) {
    fs.mkdir(folder, (err) => error(err));
  } else {
    let contents: string[];
    fs.readdir(folder, (err, files) => {
      if (err) error(err);
      else contents = files;
    });
    return contents;
  }
  throw new Error("Creating folder: " + folder);
}

function error(err: NodeJS.ErrnoException) {
  if (err.code === "ENOENT") {
    console.error(err.path + "does not exist");
    return;
  }
  console.log(err);
}

function getPath(id) {
  const propertiesPath = `${dataFolder}/${id}/properties.json`;
  const logPath = `${dataFolder}/${id}/readings.log`;
  return { logPath, propertiesPath };
}

async function readFiles(id: string): Promise<TempLog> {
  const { logPath, propertiesPath } = getPath(id);

  const settings = new Promise<TempLog>((resolve) => fs.open(propertiesPath, "r", (err, fd) => {
    error(err);
    try {
      fs.readFile(fd, { encoding: "utf8" }, (err, data) => {
        error(err);
        resolve({ id: { settings: JSON.parse(data) } });
      });
    } finally {
      fs.close(fd, error);
    }
  }));

  const readings = new Promise<TempLog>((resolve, reject) => fs.open(logPath, "r", (err, fd) => {
    error(err);
    try {
      fs.readFile(fd, { encoding: "utf8" }, (err, data) => {
        error(err);
        resolve({ id: { settings: null, data: JSON.parse("[" + data.slice(0, -2) + "]") } });
      });
    } finally {
      fs.close(fd, (err) => { if (err) { error(err); reject; } });
    }
  }));

  return Promise.all([settings, readings]).then((val) => {
    let tempLog: TempLog;
    val.forEach(element => {
      if (element.id.data) tempLog.id.data = element.id.data;
      if (element.id.settings) tempLog.id.settings = element.id.settings;
    });
    return tempLog;
  });
}

// reads all of the saved data
export async function readSavedData(): Promise<TempLog> {
  const temperatureLog = readContents(dataFolder)
    .then(contents => {
      if (contents) {
        return contents.filter(contents => fs.statSync(dataFolder + "/" + contents).isDirectory());
      }
    })
    .then(idFolders => {
      let tempLog: TempLog;
      if (idFolders) {
        idFolders.forEach(id => { readFiles(id).then(val => { if (val.id) tempLog[id] = val.id; }) });
      } else throw new Error("No saved sensor data found");
      return tempLog;
    })
    .catch(err => {
      error(err)
      let tempLog: TempLog;
      return tempLog;
    });

  return temperatureLog;
}

export async function saveReading(id: string, reading: Reading): Promise<void> {
  await readContents(dataFolder + "/" + id);
  const { logPath } = getPath(id);
  if (logFiles[id]) {
    logFiles[id].write(JSON.stringify(reading) + ",\n");
  } else {
    logFiles[id] = fs.createWriteStream(logPath, { flags: "a" });
    logFiles[id].write(JSON.stringify(reading) + ",\n");
  }
}

export function saveSettings(id: string, settings: Settings): void {
  readContents(dataFolder + "/" + id);
  const { propertiesPath } = getPath(id);
  const settingsFile = fs.createWriteStream(propertiesPath, { flags: "w" });
  settingsFile.write(JSON.stringify(settings));
  settingsFile.close();
}