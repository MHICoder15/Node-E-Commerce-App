const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();
const MONGO_DB_URI = process.env.MONGO_DB_URI;

const connectMongoDB = (callback) => {
  mongoose
    .connect(MONGO_DB_URI)
    .then((mongoInstance) => {
      console.log(
        `MongoDB Connected!! DB Host: ${mongoInstance.connection.host}`
      );
      callback();
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log("🚀 ~ MongoDB Connection", error);
      return next(error);
    });
};
exports.connectMongoDB = connectMongoDB;
