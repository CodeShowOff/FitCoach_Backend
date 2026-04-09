// src/models/ProductTemplate.js
import mongoose from "mongoose";

/**
 * Global Product Template Model
 * Admin-managed reusable product blueprints that coaches can adopt
 */

const productTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product template name is required"],
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
      required: [true, "Template MRP is required"],
      min: 0,
    },
    price: {
      type: Number,
      required: [true, "Template price is required"],
      min: 0,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 50,
      index: true,
    },
    companyName: {
      type: String,
      trim: true,
      maxlength: 100,
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
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Indexes for query performance
productTemplateSchema.index({
  name: "text",
  description: "text",
  category: "text",
  companyName: "text",
  tags: "text",
});
productTemplateSchema.index({ category: 1, isActive: 1 });
productTemplateSchema.index({ companyName: 1, isActive: 1 });
productTemplateSchema.index({ isFeatured: 1, isActive: 1 });
productTemplateSchema.index({ usageCount: -1 });
productTemplateSchema.index({ createdAt: -1 });

const ProductTemplate = mongoose.model("ProductTemplate", productTemplateSchema);
export default ProductTemplate;
