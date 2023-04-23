# Ukaton-Mission-UDP-Server

a simple server to connect to the Ukaton Missions via UDP, then relay sensor data to a WebSocket client

On macOS:
for the security stuff, run the command in the terminal:
`sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ./key.pem -out cert.pem`
Windows is the same but without `sudo`, if you have openssl installed

put the \*.pem files in the /sec/ folder

install https://code.visualstudio.com/ & https://nodejs.org/en/
install npm in terminal: sudo npm install
install yarn in VS Code terminal: npm install
start localhost: node index.js
open https://_YOUR_IP_ADDRESS_:8080/ws on chrome replacing `YOUR_IP_ADDRESS` with our ip address, and select "Proceed to _YOUR_IP_ADDRESS_ (unsafe)"
open http://ukaton-side-mission-dev.glitch.me/udp in chrome, and type in your ip address
