const { http } = require("../references");
const { RedisClient } = require("redis");
const { redisBase } = require("../constants");
const socketIo = require("socket.io");

const socket = socketIo(http, {
  path: "/noveltySocket",
  pingTimeout: 180000,
  maxHttpBufferSize: 1e8,
  cors: { origin: "*" }, // for website
});

// redis adapter settings for socket
const pubClient = new RedisClient({
  host: redisBase.ip, // here should be ip of server with redis
  port: redisBase.port,
});
const subClient = pubClient.duplicate();

module.exports = { socket, subClient, pubClient };
