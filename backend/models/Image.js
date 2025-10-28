import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
  originalName: String,
  filename: String,
  filepath: String,
  fileSize: Number,
  format: String,
  originalWidth: Number,
  originalHeight: Number,
  resizedWidth: Number,
  resizedHeight: Number,
  uploadDate: { type: Date, default: Date.now },
});

export default mongoose.model("Image", imageSchema);
