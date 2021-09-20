# Still WIP

Installing on a fresh image of raspberry pi OS full:
1. Update raspberry pi: `sudo apt-get update && sudo apt-get upgrade`
2. Download node: `curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -`
3. Install node: `sudo apt-get install -y nodejs`
4. Install mDNS libraries: `sudo apt-get install -y libavahi-compat-libdnssd-dev`
5. Install mosquitto MQTT broker: `sudo apt install -y mosquitto mosquitto-clients`
6. Clone this repo: `git clone https://github.com/Swesen/Raspberry-pi-mqtt-Host.git`
7. Go into repo folder: `cd Raspberry-pi-mqtt-Host`
8. Install required node modules: `npm i`
9. Install typescript `sudo npm i -g typescript`
10. Build: `npm run build` or start manually `npm run start`

To setup auto starting install some process manager like PM2:
1. Install PM2: `sudo npm i -g pm2`
2. After having built the app start the app with PM2:
    `pm2 start dist/app.js`
3. Generate startup script: `pm2 startup`
4. Save the list current running PM2 apps: `pm2 save`

Website is avaliable at: `http://raspberrypi.local:3000/` if your pc supports bonjour,
or at the ip of the pi example: `http://192.168.1.10:3000/` 

Now setup a sensor from my other repo: https://github.com/Swesen/ESP-8266-MQTT-ds18b20-sensor-client

Or setup your own MQTT client:
    Topic: `temperature/[ID]/reading`
    Message as: `{ "temperature": 25.5 }`
The ID needs to be uniqe.

I use ds18b20 temperature sensors which have a uniqe id built in and send it as a hex string: `288535C13C19019A`
Example: 
    MQTT topic: `temperature/288535C13C19019A/reading`
    Message: `{ "temperature": 10.32 }`
