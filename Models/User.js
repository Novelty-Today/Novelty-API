const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcrypt");
const Notification = mongoose.model("Notification").schema;
const geometry = mongoose.model("Geometry").schema;
const PaymentHistory = mongoose.model("PaymentHistory").schema;
const PaymentMethod = mongoose.model("PaymentMethod").schema;

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: false, default: "" },
  name: { type: String, required: false },
  lastname: { type: String, required: false },
  gender: { type: String, required: false, default: "" },
  password: { type: String, required: true },
  description: { type: String, required: false, default: "" },
  clubAffiliations: [{ type: String, required: false }],
  classYear: { type: String, required: false, default: "" },
  major: { type: String, required: false, default: "" },
  location: { type: String, required: false, default: "" },
  geometry: geometry,
  interests: [{ type: String, required: false }],
  pushToken: { type: String, required: false }, // should this be removed?
  expoPushTokensList: [{ type: Object, required: false }],
  notifications: [Notification],
  favorites: [{ type: String, required: false }],
  connectedAccounts: [{ type: Object, required: false }],
  media: { type: String, required: false },
  miniMedia: { type: String, required: false },
  microMedia: { type: String, required: false },
  squareId: { type: String, required: false },
  currentEventNumber: { type: Number, required: false, default: 0 },
  paymentHistory: [{ type: PaymentHistory, required: false }],
  events: [{ type: String, required: false }],
  paymentMethods: [{ type: PaymentMethod, required: false }],
  accountStatus: {
    type: String,
    required: true,
    enum: ["active", "deleted", "guest"],
    default: "active",
  },
  socketIdList: [{ type: String, required: false }],
  sessionId: { type: String, required: false },
  deviceOs: {
    type: String,
    required: false,
    enum: ["android", "ios", "unknown"],
    default: "unknown",
  },
  device: { type: String, required: false, default: "" },
  nativeAppVersion: { type: String, required: false, default: "" },
  coOrganisedEvents: [{ type: String, required: true }],
  emailConfirmed: { type: Boolean, required: true, default: false },
  socialIntegrations: [
    {
      type: {
        type: String,
        required: true,
        enum: ["Instagram", "Twitter", "LinkedIn"],
      },
      id: { type: String, required: true },
      username: { type: String, required: true },
      profileUrl: { type: String, required: true },
    },
  ],
  mediaArray: [
    {
      normal: { type: String, required: false },
      mini: { type: String, required: false },
    },
  ],
  phone: { type: String, required: false },
  phoneContacts: [
    {
      phone: { type: String, required: false },
      givenName: { type: String, required: false },
      middleName: { type: String, required: false },
      familyName: { type: String, required: false },
      jobTitle: { type: String, required: false },
      postalAddresses: [
        {
          label: { type: String, required: false },
          address: { type: String, required: false },
        },
      ],
      emails: [
        {
          label: { type: String, required: false },
          email: { type: String, required: false },
        },
      ],
    },
  ],
  crypto: {
    noveltyTokens: { type: Number, required: true, default: 0 },
  },
  ancestorComunities: [{ type: String, required: false }],
  role: {
    type: String,
    required: false,
    default: "user",
    enum: ["pendingUser", "waitlistedUser", "user", "admin"],
  },
  zoomConnection: {
    zoomEmail: { type: String, required: false },
    accessToken: { type: String, required: false },
    refreshToken: { type: String, required: false },
  },
  enabledCalendarPermissions: {
    type: Boolean,
    required: false,
    default: false,
  },
  finishedOnBoarding: {
    type: Boolean,
    required: false,
    default: false,
  },
  unsubscribedMail: {
    type: Boolean,
    required: false,
    default: false,
  },
});

userSchema.pre("save", function (next) {
  const user = this;

  if (!user.isModified("password")) {
    return next();
  }

  bcrypt.genSalt(10, (error, salt) => {
    if (error) {
      nexterror;
    }

    bcrypt.hash(user.password, salt, (error, hash) => {
      if (error) {
        return nexterror;
      }
      user.password = hash;

      return next();
    });
  });
});

userSchema.methods.comparePassword = function (candidatePassword) {
  const user = this;

  return new Promise((resolve, reject) => {
    bcrypt.compare(candidatePassword, user.password, (error, isMatch) => {
      if (error) {
        console.log("Error mckdslmcsdv", error);
        return reject(false);
      }
      if (!isMatch) {
        return reject(false);
      }
      resolve(true);
    });
  });
};

const User = mongoose.model("User", userSchema);

module.exports = User;
