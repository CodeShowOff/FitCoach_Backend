
// src/models/Product.js
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    coachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Coach ID is required"],
      index: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductTemplate",
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: 100,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    mrp: {
      type: Number,
      required: [true, "Product MRP is required"],
      min: 0,
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: 0,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 50,
      index: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    imagePublicId: {
      type: String,
      trim: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// 🔍 Indexes for performance
productSchema.index({ createdAt: -1 });
productSchema.index({ name: "text", description: "text", category: "text" });
productSchema.index({ coachId: 1, isActive: 1, createdAt: -1 });

const Product = mongoose.model("Product", productSchema);
export default Product;
