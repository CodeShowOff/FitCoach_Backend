import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/Order.js";
import Plan from "../models/Plan.js";
import PlanRequest from "../models/PlanRequest.js";
import Product from "../models/Product.js";
import Subscription from "../models/Subscription.js";
import Token from "../models/Token.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import ContactRequest from "../models/ContactRequest.js";
import Voucher from "../models/Voucher.js";
import ProgressPhoto from "../models/ProgressPhoto.js";
import AccountDeletionRequest from "../models/AccountDeletionRequest.js";
import BugReport from "../models/BugReport.js";
import ContactUs from "../models/ContactUs.js";
import Feedback from "../models/Feedback.js";
import WaterIntake from "../models/WaterIntake.js";
import PlatformSubscription from "../models/PlatformSubscription.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import ConversationMember from "../models/ConversationMember.js";

dotenv.config({ quiet: true });

const MONGO_URI = process.env.MONGO_URI; // Set this in your environment

async function createIndexes() {
  try {
    await mongoose.connect(MONGO_URI);

    console.log("Connected to MongoDB. Creating indexes...");

    await Promise.all([
      Order.createIndexes(),
      Plan.createIndexes(),
      PlanRequest.createIndexes(),
      Product.createIndexes(),
      Subscription.createIndexes(),
      Token.createIndexes(),
      User.createIndexes(),
      Notification.createIndexes(),
      ContactRequest.createIndexes(),
      Voucher.createIndexes(),
      ProgressPhoto.createIndexes(),
      AccountDeletionRequest.createIndexes(),
      BugReport.createIndexes(),
      ContactUs.createIndexes(),
      Feedback.createIndexes(),
      WaterIntake.createIndexes(),
      PlatformSubscription.createIndexes(),
      Conversation.createIndexes(),
      Message.createIndexes(),
      ConversationMember.createIndexes(),
    ]);

    console.log("Indexes created successfully for all models.");
    await mongoose.disconnect();
  } catch (err) {
    console.error("Error creating indexes:", err);
    process.exit(1);
  }
}

createIndexes();