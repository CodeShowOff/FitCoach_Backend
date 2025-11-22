import mongoose from "mongoose";

const contactRequestSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    height: {
      type: Number,
      min: 50,
      max: 300,
      default: null,
    },
    weight: {
      type: Number,
      min: 20,
      max: 500,
      default: null,
    },
    age: {
      type: Number,
      required: [true, "Age is required"],
      min: 10,
      max: 120,
    },
    gender: {
      type: String,
      required: [true, "Gender is required"],
      enum: ["male", "female", "other"],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: 1000,
    },
    coachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referralCode: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "contacted", "converted", "rejected"],
      default: "pending",
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
contactRequestSchema.index({ coachId: 1, createdAt: -1 });
contactRequestSchema.index({ status: 1, createdAt: -1 });

const ContactRequest = mongoose.model("ContactRequest", contactRequestSchema);

export default ContactRequest;
