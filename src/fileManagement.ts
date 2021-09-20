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
  time: string;
}

export interface TempLog {
  [x: string]: {
    settings: Settings;
    data: Reading[];
  };
}

interface IdFileHandle {
  [id: string]: fs.WriteStream;
}

const rootFolder = path.join(__dirname, "../");
const dataFolder = rootFolder + "data";
const logFiles: IdFileHandle = {};

async function readContents(folder: string): Promise<string[]> {
  let contents: string[] = [];
  if (!fs.existsSync(folder)) {
    console.log("Folder " + folder + " doesn't exist!");
    fs.mkdir(folder, (err) => error(err));
    console.log("Created folder " + folder);
  } else {
    const contains = fs.readdirSync(folder, { withFileTypes: true });
    contents = contains.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
    return contents;
  }
}

function error(err: NodeJS.ErrnoException) {
  if (err) {
    if (err.code) {
      switch (err.code) {
        case "ENOENT":
          console.log("No such file or folder")
      }
    }
    console.log(err);
  }
}

function getPath(id) {
  const propertiesPath = `${dataFolder}/${id}/properties.json`;
  const logPath = `${dataFolder}/${id}/readings.log`;
  return { logPath, propertiesPath };
}

async function readFiles(id: string): Promise<TempLog> {
  const { logPath, propertiesPath } = getPath(id);
  console.log(logPath);
  console.log(propertiesPath);

  const settings = new Promise<Settings>((resolve) =>
    fs.open(propertiesPath, "r", (err, fd) => {
      error(err);
      fs.readFile(fd, { encoding: "utf8" }, (err, data) => {
        error(err);
        const settings = JSON.parse(data);
        resolve(settings);
      });
    })
  );

  const readings = new Promise<Reading[]>((resolve,) =>
    fs.open(logPath, "r", (err, fd) => {
      error(err);
      fs.readFile(fd, { encoding: "utf8" }, (err, data) => {
        error(err);
        // slice of the new line and comma at the end of the file
        const readings = JSON.parse("[" + data.slice(0, -2) + "]");
        resolve(readings);
      });
    })
  );

  return Promise.all([settings, readings]).then((val) => {
    const [settings, readings] = val;
    const tempLog: TempLog = {};
    tempLog[id] = { data: readings, settings };
    return tempLog;
  });
}

// reads all of the saved data
export async function readSavedData(): Promise<TempLog> {
  const temperatureLog = readContents(dataFolder)
    .then(contents => {
      console.log("Contents of " + dataFolder + " : " + contents);
      if (contents) {
        return contents;
      } else {
        throw new Error("Nothing in " + dataFolder);
      }
    })
    .then(idFolders => {
      const promises: Promise<TempLog>[] = [];
      if (idFolders) {
        idFolders.forEach(id => {
          promises.push(readFiles(id));
        });
      } else console.log("No saved sensor data found");
      return Promise.all(promises).then(val => {
        const log: TempLog = {};
        val.forEach(entry => {
          Object.assign(log, entry);
        });
        return log;
      });
    })
    .catch(err => {
      error(err);
      return {};
    });

  return await temperatureLog;
}

export async function saveReading(id: string, reading: Reading): Promise<void> {
  await readContents(dataFolder + "/" + id);
  const { logPath } = getPath(id);
  if (!logFiles || !logFiles[id]) {
    logFiles[id] = fs.createWriteStream(logPath, { flags: "a" });
  } logFiles[id].write(JSON.stringify(reading) + ",\n");
}

export async function saveSettings(id: string, settings: Settings): Promise<void> {
  await readContents(dataFolder + "/" + id);
  const { propertiesPath } = getPath(id);
  const settingsFile = fs.createWriteStream(propertiesPath, { flags: "w" });
  settingsFile.write(JSON.stringify(settings));
  settingsFile.close();
}