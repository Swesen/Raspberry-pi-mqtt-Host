Installing on a fresh image of raspberry pi OS full:
1. Update raspberry pi: `sudo apt-get update && sudo apt-get upgrade`
2. Download node: `curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -`
3. Install node: `sudo apt-get install -y nodejs`
4. Install mDNS libraries: `sudo apt-get install -y libavahi-compat-libdnssd-dev`
5. Clone this repo: `git clone https://github.com/Swesen/Raspberry-pi-mqtt-Host.git`
6. Go into repo folder: `cd Raspberry-pi-mqtt-Host`
7. Install required node modules: `npm install --only=prod`
8. Build: `npm build` or start manually `npm start`

To setup auto starting install some process manager like PM2:
1. Install PM2: `sudo npm install pm2 -g`
2. After having built the app start the app with PM2:
    `pm2 start dist/app.js`
3. Generate startup script: `pm2 startup`
4. Save the list current running PM2 apps: `pm2 save`