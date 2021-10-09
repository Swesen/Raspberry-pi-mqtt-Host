import mqtt = require("mqtt");
import Color = require("color");
import { DateTime } from "luxon";
import { Settings, Reading, saveReading, saveSettings } from "./fileManagement";
import { ValidReading, temperatureLog } from "./app";

export default function mqttHandler(address: string): mqtt.MqttClient {
  const client = mqtt.connect(`mqtt://${address}:1883`);

  client.on("connect", () => {
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
        const reading: Reading = { temperature: parsedMessage.temperature, time: DateTime.now().toISO() };

        if (!temperatureLog[id]) {
          const settings: Settings = newSettings();
          saveSettings(id, settings);
          temperatureLog[id] = {
            settings: settings,
            data: [reading]
          };
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

  client.on("offline", () => console.log("Broker offline!"));
  return client;
}

function newSettings() {
  return { name: "New sensor", color: randomColor(), order: Object.keys(temperatureLog).length }
}

function randomColor(): Color {
  return Color.rgb(
    (Math.random() * 255),
    (Math.random() * 255),
    (Math.random() * 255)
  ).hex();
}