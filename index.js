const throttle = require("lodash/throttle");

let shouldLog = false;
const log = (...args) => {
  if (shouldLog) {
    console.log(...args);
  }
};

// WEBSOCKETS
const WebSocketMessageTypeStrings = [
  "NUMBER_OF_DEVICES",
  "DEVICE_INFORMATION",
  "DEVICE_MESSAGE",
];
const WebSocketMessageTypes = {};
WebSocketMessageTypeStrings.forEach((webSocketMessageTypeString, index) => {
  WebSocketMessageTypes[webSocketMessageTypeString] = index;
});

const { createServer } = require("https");
const { readFileSync } = require("fs");
const { WebSocketServer } = require("ws");

const index = readFileSync("./index.html");

const server = createServer({
  cert: readFileSync("./sec/cert.pem"),
  key: readFileSync("./sec/key.pem"),
});
const wss = new WebSocketServer({ server, path: "/ws" }, (req, res) => {
  res.writeHead(200);
  res.end(index);
});
server.addListener("upgrade", (req, res, head) =>
  console.log("UPGRADE:", req.url)
);

wss.on("connection", (ws) => {
  log("new client connected");
  ws.on("message", (message) => {
    log(`Client has sent us: ${message.join(",")}`);

    let messageIndex = 0;
    const messageType = message.readUint8(messageIndex++);
    switch (messageType) {
      case WebSocketMessageTypes.DEVICE_INFORMATION:
        {
          const data = [];
          missionDevices.forEach((missionDevice, index) => {
            const _data = [];
            if ("name" in missionDevice) {
              _data.push(
                UDPMessageTypes.GET_NAME,
                missionDevice.name.length,
                ...missionDevice.name.split("").map((c) => c.charCodeAt(0))
              );
            }
            if ("type" in missionDevice) {
              _data.push(UDPMessageTypes.GET_TYPE, missionDevice.type);
            }
            if ("batteryLevel" in missionDevice) {
              _data.push(
                UDPMessageTypes.BATTERY_LEVEL,
                missionDevice.batteryLevel
              );
            }
            if (_data.length > 0) {
              data.push(WebSocketMessageTypes.DEVICE_MESSAGE);
              data.push(index);
              data.push(_data.length);
              data.push(_data);
            }
          });
          log("sending to ws", data.flat());
          ws.send(Uint8Array.from(data.flat()));
        }
        break;
      case WebSocketMessageTypes.DEVICE_MESSAGE:
        {
          while (messageIndex < message.byteLength) {
            const missionIndex = message.readUint8(messageIndex++);
            const byteLength = message.readUint8(messageIndex++);
            const missionDevice = missionDevices[missionIndex];
            const _message = message.subarray(
              messageIndex,
              messageIndex + byteLength
            );
            messageIndex += byteLength;
            if (client && missionDevice) {
              log(`sending to device #${missionIndex}: ${_message.join(",")}`);
              client.send(_message, PORT, missionDevice.HOST, function (error) {
                if (error) {
                  // log(error);
                }
              });
            }
          }
        }
        break;
      default:
        log(`uncaught message #${messageType}`);
        break;
    }
  });
  ws.on("close", () => {
    log("the client has disconnected");
  });
  ws.onerror = function () {
    log("Some Error occurred");
  };
  ws.send(
    Uint8Array.from([WebSocketMessageTypes.NUMBER_OF_DEVICES, HOSTS.length])
  );
});
server.listen(8080);
console.log("The WebSocket server is running on port 8080");

// UDP
const UDPMessageTypeStrings = [
  "PING",

  "BATTERY_LEVEL",

  "GET_TYPE",
  "SET_TYPE",

  "GET_NAME",
  "SET_NAME",

  "MOTION_CALIBRATION",

  "GET_SENSOR_DATA_CONFIGURATIONS",
  "SET_SENSOR_DATA_CONFIGURATIONS",

  "SENSOR_DATA",
];
const UDPMessageTypes = {};
UDPMessageTypeStrings.forEach((udpMessageTypeString, index) => {
  UDPMessageTypes[udpMessageTypeString] = index;
});

const dgram = require("dgram");

const PORT = 9999;
const _HOSTS = [
  "192.168.6.22",
  "192.168.6.17",
  "192.168.6.23",
  "192.168.6.24",
  "192.168.6.21",
  "192.168.6.25",
  "192.168.6.26",
  "192.168.6.27",
  "192.168.6.20",
  "192.168.6.28",
  "192.168.6.19",
  "192.168.6.29",
];
const __HOSTS = [
  "192.168.6.48", // upperTorso
  "192.168.6.38", // lowerTorso

  "192.168.6.49", // leftBicep
  "192.168.4.59", // leftForearm

  "192.168.6.34", // rightBicep
  "192.168.6.50", // rightForearm

  "192.168.6.47", // leftThigh
  "192.168.6.31", // leftShin
  "192.168.6.44", // leftFoot

  "192.168.6.35", // rightThigh
  "192.168.6.46", // rightShin
  "192.168.6.18", // rightFoot
];
const HOSTS = [
  "192.168.1.35", // TEST
  "192.168.1.45", // TEST
  "192.168.1.30",

  "192.168.4.49", // upperTorso
  "192.168.4.50", // lowerTorso
  "192.168.4.47", // leftBicep
  "192.168.4.45", // rightBicep
  "192.168.4.59", // leftForearm
  "192.168.4.48", // rightForearm
  "192.168.4.51", // leftThigh
  "192.168.4.52", // rightThigh
  "192.168.4.53", // leftShin
  "192.168.4.54", // rightShin
  "192.168.4.55", // leftFoot
  "192.168.4.56", // rightFoot
];
const missionDevices = HOSTS.map((HOST, index) => ({
  HOST,
  index,
  isConnected: false,
}));
const missionDevicesMap = {};
missionDevices.forEach(
  (missionDevice) => (missionDevicesMap[missionDevice.HOST] = missionDevice)
);
const client = dgram.createSocket("udp4");
client.on("error", (error) => {
  log(`server error:\n${error.stack}`);
  client.close();
});
client.on("message", (message, info) => {
  log("Data received from server : " + message.join(","));
  log(
    "Received %d bytes from %s:%d\n",
    message.length,
    info.address,
    info.port
  );

  const missionDevice = missionDevicesMap[info.address];
  if (!missionDevice) {
    console.log("missionDevice not found!");
    return;
  }
  const { index, HOST } = missionDevice;

  const array = [WebSocketMessageTypes.DEVICE_MESSAGE, index];
  const _data = [];
  let messageIndex = 0;
  while (messageIndex < message.byteLength) {
    const messageType = message.readUint8(messageIndex++);
    switch (messageType) {
      case UDPMessageTypes.PING:
        log(`ping #${index}`);
        break;
      case UDPMessageTypes.BATTERY_LEVEL:
        const batteryLevel = message.readUint8(messageIndex++);
        _data.push(UDPMessageTypes.BATTERY_LEVEL, batteryLevel);
        missionDevice.batteryLevel = batteryLevel;
        log(`batteryLevel #${index}: ${batteryLevel}`);
        break;
      case UDPMessageTypes.GET_TYPE:
        const type = message.readUint8(messageIndex++);
        _data.push(UDPMessageTypes.GET_TYPE, type);
        missionDevice.type = type;
        log(`type #${index}: ${type}`);
        break;
      case UDPMessageTypes.GET_NAME:
        const nameLength = message.readUint8(messageIndex++);
        const name = message
          .subarray(messageIndex, messageIndex + nameLength)
          .toString();
        missionDevice.name = name;
        messageIndex += nameLength;
        log(`name #${index}: ${name}`);
        _data.push(
          UDPMessageTypes.GET_NAME,
          name.length,
          ...name.split("").map((c) => c.charCodeAt(0))
        );
        break;
      case UDPMessageTypes.SENSOR_DATA:
        const sensorData = message.subarray(messageIndex, message.byteLength);
        const sensorDataArray = [];
        sensorData.forEach((value) => {
          sensorDataArray.push(value);
        });
        _data.push(UDPMessageTypes.SENSOR_DATA, ...sensorDataArray);
        messageIndex = message.byteLength;
        break;
      default:
        log(`uncaught message type #${messageType}`);
        messageIndex = message.byteLength;
        break;
    }
  }
  if (
    !missionDevice.receivedInformation &&
    "name" in missionDevice &&
    "type" in missionDevice
  ) {
    missionDevice.receivedInformation = true;
  }
  if (_data.length > 0) {
    array.push(_data.length);
    array.push(..._data);
    messageForWebSocketClients.push(array);
    sendToWebSocketClients();
  }
});
const pingData = Uint8Array.from([UDPMessageTypes.PING]);
const informationData = Uint8Array.from([
  UDPMessageTypes.GET_TYPE,
  UDPMessageTypes.GET_NAME,
  UDPMessageTypes.BATTERY_LEVEL,
]);

var messageForWebSocketClients = [];
const sendToWebSocketClients = throttle(() => {
  log("sending to clients", messageForWebSocketClients.flat());
  wss.clients.forEach((client) =>
    client.send(
      Uint8Array.from(messageForWebSocketClients.flat()),
      function (error) {
        if (error) {
          // log(error);
        }
      }
    )
  );
  messageForWebSocketClients.length = 0;
}, 20);

function ping() {
  missionDevices.forEach((missionDevice) => {
    const data = missionDevice.receivedInformation ? pingData : informationData;
    client.send(data, PORT, missionDevice.HOST, function (error) {
      if (error) {
        log(error);
      }
    });
  });
  setTimeout(() => {
    ping();
  }, 1000);
}
ping();
