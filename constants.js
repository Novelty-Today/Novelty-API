const Amplitude = require("@amplitude/node");
require('dotenv').config()
const { Environment } = require("square");

const {
  getIosPushNotificationsApi,
  getNoveltyTokenConfigs,
  getEventAttendanceControlTimes,
  getNoveltyActionsToAmounts,
  getCloudMediaBuckets,
  getNotificationsConfig,
} = require("./configs");

const environment = "production"; // 'debug', 'production'

const mainServerIp = process.env.mainServerIp; // novelty.rocks points to it
const baseUrl = process.env.baseUrl; 

const redisBase = {
  ip: mainServerIp,
  port: 6379,
}; // redis server
const servicesBaseUrl = process.env.servicesBaseUrl;

const dbURI = process.env.dbURI;
const dbName = process.env.dbName;
const MY_SECRET_KEY = process.env.MY_SECRET_KEY;

// Payments
const squareConfig = {
  squareAccessToken: process.env.squareAccessToken,
  squareEnvironment: Environment.Production,
};

const opencageApiKey = process.env.opencageApiKey;

const googleDirectionsApiKey = process.env.googleDirectionsApiKey;

const amplitudeClient = Amplitude.init(process.env.AMPLITUDE_KEY);

const EMAIL_CONFIRMATION_SECRET_KEY = process.env.EMAIL_CONFIRMATION_SECRET_KEY;
const SUPPORT_GMAIL = process.env.SUPPORT_GMAIL;
const SUPPORT_GMAIL_PASSWORD = process.env.SUPPORT_GMAIL_PASSWORD;

// instagram/fb related credentials
const INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID;
const INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET;

const ZOOM_CONFIG = {
  ZOOM_PUBLIC_KEY: process.env.ZOOM_PUBLIC_KEY,
  ZOOM_PRIVATE_KEY: process.env.ZOOM_PRIVATE_KEY,
  ZOOM_DOMAIN: process.env.ZOOM_DOMAIN,
  JWT_API_KEY: process.env.JWT_API_KEY,
  JWT_API_SECRET_KEY: process.env.JWT_API_SECRET_KEY,
  clientId: process.env.clientId,
  clientSecret: process.env.clientSecret,
  redirect_uri: process.env.redirect_uri,
  licensedUserToken: process.env.licensedUserToken,
};

const noveltyTokenConfigs = getNoveltyTokenConfigs(environment);

const noveltyActionsToAmounts = getNoveltyActionsToAmounts(environment);

const mailchimpConfig = {
  NOVELTY_AUDIENCE_ID: process.env.NOVELTY_AUDIENCE_ID,
  API_KEY: process.env.API_KEY,
  SERVER_PREFIX: process.env.SERVER_PREFIX,
};

const googleCloudProjectId = process.env.googleCloudProjectId;

const eventAttendanceControlTimes = getEventAttendanceControlTimes(environment);

const googleCloudMediaBuckets = getCloudMediaBuckets(environment);

const iosPushNotificationsApi = getIosPushNotificationsApi(environment);

const notificationsConfig = getNotificationsConfig(environment);

module.exports = {
  dbURI,
  dbName,
  baseUrl,
  servicesBaseUrl,
  redisBase,
  opencageApiKey,
  MY_SECRET_KEY,
  googleDirectionsApiKey,
  amplitudeClient,
  EMAIL_CONFIRMATION_SECRET_KEY,
  SUPPORT_GMAIL,
  SUPPORT_GMAIL_PASSWORD,
  INSTAGRAM_CLIENT_ID,
  INSTAGRAM_CLIENT_SECRET,
  ZOOM_CONFIG,
  noveltyTokenConfigs,
  mailchimpConfig,
  noveltyActionsToAmounts,
  environment,
  iosPushNotificationsApi,
  eventAttendanceControlTimes,
  googleCloudMediaBuckets,
  squareConfig,
  notificationsConfig,
  googleCloudProjectId
};
