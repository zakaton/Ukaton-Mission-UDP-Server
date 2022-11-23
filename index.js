// WEBSOCKETS
const WebSocketServer = require("ws");
const wss = new WebSocketServer.Server({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("new client connected");
  ws.on("message", (data) => {
    console.log(`Client has sent us: ${data}`);
  });
  ws.on("close", () => {
    console.log("the client has disconnected");
  });
  ws.onerror = function () {
    console.log("Some Error occurred");
  };
});
console.log("The WebSocket server is running on port 8080");

// UDP
const dgram = require("dgram");
const buffer = require("buffer");
const client = dgram.createSocket("udp4");

const HOST = "192.168.6.25";
const PORT = 9999;

client.on("error", (error) => {
  console.log(`server error:\n${error.stack}`);
  client.close();
});

client.on("message", (message, info) => {
  console.log("Data received from server : " + message.toString());
  console.log(
    "Received %d bytes from %s:%d\n",
    message.length,
    info.address,
    info.port
  );
});

var data = Uint8Array.from([0]);
client.send(data, PORT, HOST, function (error) {
  if (error) {
    client.close();
  } else {
    console.log("Data sent !!!");
  }
});
