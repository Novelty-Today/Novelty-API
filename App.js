// express and some middleware
const express = require("express");
const cors = require("cors");
const path = require("path");
const { app } = require("./references");
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(express.json({ limit: "15mb" }));
app.set("view engine", "ejs");
app.set("views", path.join(`${__dirname}`, "Venmo"));
const corsConfig = {
  //credentials: true,
  origin: true,
  allowedHeaders: ["*"],
  exposedHeaders: ["*"],
};
app.use(cors(corsConfig));
app.options("*", cors());

//using models from Models folder: if you do not write this we cannot user mongoose.model("Model")
const mongoose = require("mongoose");
const UserCalendar = require("./Models/UserCalendar");
const UserConnection = require("./Models/UserConnection");
const Interest = require("./Models/Interest");
const Favorite = require("./Models/Favorite");
const Friendship = require("./Models/Friendship");
const PaymentMethod = require("./Models/PaymentMethod");
const PaymentHistory = require("./Models/PaymentHistory");
const Geometry = require("./Models/Geometry");
const Task = require("./Models/Task.js");
const Review = require("./Models/Review.js");
const Notification = require("./Models/Notification.js");
const Event = require("./Models/Event.js");
const User = require("./Models/User.js");
const Feedback = require("./Models/Feedback.js");
const Order = require("./Models/Order.js");
const AnalyticData = require("./Models/AnalyticData");
const Chat = require("./Models/Chat");
const Comment = require("./Models/Comment");
const ErrorLog = require("./Models/ErrorLog");
const { EventFeedback } = require("./Models/EventFeedback");
const EventVerification = require("./Models/EventVerification");

//importing urls from routes files.
const AuthRoutes = require("./routes/AuthRoutes");
const AnalyticsRoutes = require("./routes/AnalyticsRoutes");
const EventRoutes = require("./routes/EventRoutes");
const GeneralUserRoutes = require("./routes/userRoutes/GeneralUserRoutes");
const GetUserInfoRoutes = require("./routes/userRoutes/GetUserInfoRoutes");
const UpdateUserInfoRoutes = require("./routes/userRoutes/UpdateUserInfoRoutes");
const UpdateUserExtraInfoRoutes = require("./routes/userRoutes/UpdateUserExtraInfoRoutes");
const PaymentRoutes = require("./routes/PaymentRoutes");
const NotificationRoutes = require("./routes/NotificationRoutes");
const mediaRoutes = require("./routes/MediaRoutes");
const FeedbackRoutes = require("./routes/FeedbackRoutes");
const OrganiserPaymentRoutes = require("./routes/OrganiserPaymentRoutes");
const OrganiserEventRoutes = require("./routes/OrganiserEventRoutes");
const ChatRoutes = require("./routes/ChatRoutes");
const CommentRoutes = require("./routes/CommentRoutes");
const HelperRoutes = require("./routes/HelperRoutes");
const FriendshipRoutes = require("./routes/FriendshipRoutes");
const DynamicLinkRoutes = require("./routes/DynamicLinkRoutes");
const ConnectionRoutes = require("./routes/ConnectionRoutes");
const CommunityRoutes = require("./routes/CommunityRoutes");
const UserCalendarRoutes = require("./routes/UserCalendarRoutes");
const ServerRoutes = require("./routes/ServerRoutes");
const ZoomRoutes = require("./routes/ZoomRoutes");
const VenmoRoutes = require("./routes/VenmoRoutes");
const GuestConfirmationRoutes = require("./routes/GuestConfirmationRoutes");
const ActivityGuestRoutes = require("./routes/ActivityGuestRoutes");
const EventShareRoutes = require("./routes/EventShareRoutes");
const AccountRecoverRoutes = require("./routes/AccountRecoverRoutes");
const EventVerificationRoutes = require("./routes/EventVerificationRoutes");
const TokenRoutes = require("./routes/TokenRoutes");
const ClubRoutes = require("./routes/ClubRoutes");
const NftCreationRoutes = require("./routes/NftCreationRoutes");

//adding routes
app.use(AuthRoutes);
app.use(AnalyticsRoutes);
app.use(EventRoutes);
app.use(GeneralUserRoutes);
app.use(GetUserInfoRoutes);
app.use(UpdateUserInfoRoutes);
app.use(UpdateUserExtraInfoRoutes);
app.use(PaymentRoutes);
app.use(NotificationRoutes);
app.use(mediaRoutes);
app.use(FeedbackRoutes);
app.use(OrganiserPaymentRoutes);
app.use(OrganiserEventRoutes);
app.use(ChatRoutes);
app.use(CommentRoutes);
app.use(HelperRoutes);
app.use(FriendshipRoutes);
app.use(DynamicLinkRoutes);
app.use(ConnectionRoutes);
app.use(CommunityRoutes);
app.use(UserCalendarRoutes);
app.use(ZoomRoutes);
app.use(VenmoRoutes);
app.use(GuestConfirmationRoutes);
app.use(ActivityGuestRoutes);
app.use(EventShareRoutes);
app.use(AccountRecoverRoutes);
app.use(EventVerificationRoutes);
app.use(TokenRoutes);
app.use(ClubRoutes);
app.use(NftCreationRoutes);
app.use(ServerRoutes); // this should be the last one -> otherwise 'page not found error'

//socket settings: adding listeners and connecting to redis server
const constants = require("./constants");
const { socket, subClient, pubClient } = require("./sockets/SocketSettings");
const { addingSocketListeners } = require("./sockets/SocketListeners");
const { createAdapter } = require("socket.io-redis");
addingSocketListeners();
socket.adapter(
  createAdapter({
    subClient,
    pubClient,
  })
);

// starting server and running tasks on server

const { http } = require("./references");
const { mongoConnect } = require("./functions/mongodbDriver");
const { runAllTasks } = require("./Tasks/RunTasks");
//


Promise.all([mongoose.connect(constants.dbURI), mongoConnect()])
  .then(() => {
    // port 8083 is taken by nginx
    http.listen(8084 + parseInt(process?.env?.NODE_APP_INSTANCE), () => {
      console.log("Server successfully started now.");

      runAllTasks();
    });
  })
  .catch((error) => console.log("Failed to start the server ", error));

