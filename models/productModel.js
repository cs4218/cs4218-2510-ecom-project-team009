import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      index: true, 
    },
    category: {
      type: mongoose.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    photo: {
      data: Buffer,
      contentType: String,
    },
    shipping: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

// Compound index for filtering by both category AND price
productSchema.index({ category: 1, price: 1 });

export default mongoose.model("Products", productSchema);