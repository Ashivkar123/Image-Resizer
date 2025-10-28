import sharp from "sharp";

export const resizeImage = async ({
  inputPath,
  outputPath,
  width,
  height,
  rotate = 0,
  flipH = false,
  flipV = false,
  format = "png",
  quality = 90,
  crop,
}) => {
  let pipeline = sharp(inputPath);

  // Crop if specified
  if (crop) {
    pipeline = pipeline.extract({
      left: crop.left,
      top: crop.top,
      width: crop.width,
      height: crop.height,
    });
  }

  // Resize
  pipeline = pipeline.resize(width, height);

  // Rotate & flip
  if (rotate) pipeline = pipeline.rotate(rotate);
  if (flipH) pipeline = pipeline.flop();
  if (flipV) pipeline = pipeline.flip();

  // Format conversion
  if (format === "jpeg") pipeline = pipeline.jpeg({ quality });
  if (format === "png") pipeline = pipeline.png();
  if (format === "webp") pipeline = pipeline.webp({ quality });

  await pipeline.toFile(outputPath);
  return outputPath;
};
