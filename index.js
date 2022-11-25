const throttle = require("lodash/throttle");
const buffer = require("buffer");

let shouldLog = true;
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

const WebSocketServer = require("ws");
const wss = new WebSocketServer.Server({ port: 8080 });

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
log("The WebSocket server is running on port 8080");

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
const HOSTS = [
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
const missionDevices = HOSTS.map((HOST, index) => ({ HOST, index }));
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
        // log(error);
      }
    });
  });
  setTimeout(() => {
    ping();
  }, 1000);
}
ping();
