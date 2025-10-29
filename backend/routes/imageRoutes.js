import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import Image from "../models/Image.js";
import sharp from "sharp";
import { uploadImages, editImage } from "../controllers/imageController.js";

const router = express.Router();
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// -------------------- Multer Setup --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) =>
    cb(
      null,
      `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(
        file.originalname
      )}`
    ),
});
const upload = multer({ storage });

// -------------------- Preview Route --------------------
router.post("/preview", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image provided" });

    const { width: w, height: h, lockAspect, quality, format } = req.body;
    const width = parseInt(w, 10) || null;
    const height = parseInt(h, 10) || null;
    const keepAspect = lockAspect === "true";
    const q = parseInt(quality, 10) || 90;

    const imgBuffer = fs.readFileSync(req.file.path);
    const meta = await sharp(imgBuffer).metadata();

    let targetW = width || meta.width;
    let targetH = height || meta.height;

    if (keepAspect && targetW) {
      targetH = Math.round(targetW * (meta.height / meta.width));
    }

    let pipeline = sharp(imgBuffer).resize(targetW, targetH);

    const outFormat = (format || meta.format || "png").toLowerCase();
    if (outFormat === "jpeg") pipeline = pipeline.jpeg({ quality: q });
    if (outFormat === "png") pipeline = pipeline.png();
    if (outFormat === "webp") pipeline = pipeline.webp({ quality: q });

    const buffer = await pipeline.toBuffer();
    const sizeKB = Math.round(buffer.length / 1024);

    res.json({
      width: targetW,
      height: targetH,
      sizeKB,
      format: outFormat,
    });

    // Remove temp uploaded file
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------- Upload Images --------------------
router.post("/upload", upload.array("images", 12), uploadImages);

// -------------------- Edit Image --------------------
router.put("/images/:id/edit", editImage);

// -------------------- List All Images --------------------
router.get("/images", async (req, res) => {
  try {
    const images = await Image.find().sort({ uploadDate: -1 });
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------- Delete Image --------------------
router.delete("/images/:id", async (req, res) => {
  try {
    const img = await Image.findById(req.params.id);
    if (!img) return res.status(404).json({ error: "Image not found" });

    const absolute = path.join(process.cwd(), img.filepath);
    if (fs.existsSync(absolute)) fs.unlinkSync(absolute);

    await img.deleteOne();
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------- Download Single Image --------------------
router.get("/download/:filename", (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send("Not found");
  res.download(filePath, req.params.filename);
});

// -------------------- Download ZIP of Images --------------------
router.post("/download-zip", express.json(), (req, res) => {
  const { filenames } = req.body || {};
  if (!Array.isArray(filenames) || filenames.length === 0) {
    return res.status(400).json({ error: "Provide filenames array" });
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="images.zip"');

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => res.status(500).send({ error: err.message }));
  archive.pipe(res);

  filenames.forEach((fn) => {
    const fullPath = path.join(UPLOAD_DIR, fn);
    if (fs.existsSync(fullPath)) archive.file(fullPath, { name: fn });
  });

  archive.finalize();
});

export default router;
