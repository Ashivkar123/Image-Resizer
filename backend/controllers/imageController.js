import sharp from "sharp";
import fs from "fs";
import path from "path";
import Image from "../models/Image.js";

// -------------------- Upload & Resize Images --------------------
export const uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "No files uploaded" });

    const { width: w, height: h, lockAspect, format, quality } = req.body;
    const width = parseInt(w, 10) || 500;
    let height = parseInt(h, 10) || 500;
    const keepAspect = lockAspect === "true";
    const results = [];

    const UPLOAD_DIR = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

    for (const file of req.files) {
      if (!file.mimetype.startsWith("image/")) continue;

      // Get metadata
      const meta = await sharp(file.path).metadata();
      let targetW = width;
      let targetH = height;

      if (keepAspect && meta.width) {
        targetH = Math.round(targetW * (meta.height / meta.width));
      }

      const outExt = (format || meta.format || "png").toLowerCase();
      const safeExt = outExt === "jpg" ? "jpeg" : outExt;

      const outFilename = `resized-${Date.now()}-${Math.round(
        Math.random() * 1e6
      )}.${outExt}`;
      const outPath = path.join(UPLOAD_DIR, outFilename);

      let pipeline = sharp(file.path).resize(targetW, targetH).withMetadata();

      // Apply quality/compression
      if (safeExt === "jpeg")
        pipeline = pipeline.jpeg({
          quality: Number(quality) || 95,
          mozjpeg: true,
        });
      if (safeExt === "webp")
        pipeline = pipeline.webp({ quality: Number(quality) || 95 });
      if (safeExt === "png")
        pipeline = pipeline.png({
          compressionLevel: 9,
          adaptiveFiltering: true,
        });

      await pipeline.toFile(outPath);

      const stats = fs.statSync(outPath);

      const saved = new Image({
        originalName: file.originalname,
        filename: outFilename,
        filepath: path.relative(process.cwd(), outPath).replace(/\\/g, "/"),
        fileSize: stats.size,
        format: outExt,
        originalWidth: meta.width,
        originalHeight: meta.height,
        resizedWidth: targetW,
        resizedHeight: targetH,
      });

      await saved.save();
      results.push(saved);

      // Remove original temp file safely
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }

    res.json({ message: "Uploaded and resized", items: results });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- Edit Image --------------------
export const editImage = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      rotate = 0,
      flipH = false,
      flipV = false,
      crop = {},
      quality = 95,
      format,
    } = req.body;

    const img = await Image.findById(id);
    if (!img) return res.status(404).json({ error: "Image not found" });

    const inputPath = path.join(process.cwd(), img.filepath);
    if (!fs.existsSync(inputPath))
      return res.status(404).json({ error: "Original file missing" });

    let outExt = (format || img.format).toLowerCase();
    if (outExt === "jpg") outExt = "jpeg";

    const outFilename = `edited-${Date.now()}-${Math.round(
      Math.random() * 1e6
    )}.${outExt}`;
    const outPath = path.join(process.cwd(), "uploads", outFilename);

    let pipeline = sharp(inputPath).withMetadata();

    // Crop if provided
    if (crop.width > 0 && crop.height > 0) {
      pipeline = pipeline.extract({
        left: Number(crop.left) || 0,
        top: Number(crop.top) || 0,
        width: Number(crop.width),
        height: Number(crop.height),
      });
    }

    // Flip/rotate
    if (flipH) pipeline = pipeline.flop();
    if (flipV) pipeline = pipeline.flip();
    if (rotate) pipeline = pipeline.rotate(Number(rotate));

    // Format & quality
    if (outExt === "jpeg")
      pipeline = pipeline.jpeg({ quality: Number(quality), mozjpeg: true });
    if (outExt === "webp")
      pipeline = pipeline.webp({ quality: Number(quality) });
    if (outExt === "png")
      pipeline = pipeline.png({ compressionLevel: 0, adaptiveFiltering: true });

    await pipeline.toFile(outPath);

    const stats = fs.statSync(outPath);
    const metadata = await sharp(outPath).metadata();

    const newImg = new Image({
      originalName: img.originalName,
      filename: outFilename,
      filepath: path.relative(process.cwd(), outPath).replace(/\\/g, "/"),
      fileSize: stats.size,
      format: outExt,
      originalWidth: metadata.width,
      originalHeight: metadata.height,
      resizedWidth: metadata.width,
      resizedHeight: metadata.height,
    });

    await newImg.save();
    res.json({ message: "Image edited successfully!", data: newImg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
