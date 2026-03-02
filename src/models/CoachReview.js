import mongoose from "mongoose";

const coachReviewSchema = new mongoose.Schema(
  {
    coach: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Coach reference is required"],
      index: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Client reference is required"],
      index: true,
    },
    review: {
      type: String,
      required: [true, "Review text is required"],
      trim: true,
      minlength: [10, "Review must be at least 10 characters"],
      maxlength: [1000, "Review cannot exceed 1000 characters"],
    },
    isApproved: {
      type: Boolean,
      default: false,
      index: true,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying
coachReviewSchema.index({ coach: 1, isApproved: 1, createdAt: -1 });

// Prevent duplicate reviews from same client to same coach (also serves as a query index)
coachReviewSchema.index({ client: 1, coach: 1 }, { unique: true });

const CoachReview = mongoose.model("CoachReview", coachReviewSchema);

export default CoachReview;
