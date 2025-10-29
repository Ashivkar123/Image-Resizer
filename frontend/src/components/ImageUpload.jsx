import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../services/api.js";

export default function ImageUpload() {
  const [files, setFiles] = useState([]);
  const [width, setWidth] = useState(500);
  const [height, setHeight] = useState(500);
  const [quality, setQuality] = useState(90);
  const [lockAspect, setLockAspect] = useState(true);
  const [previews, setPreviews] = useState([]);
  const [afterImages, setAfterImages] = useState([]);
  const [fileNames, setFileNames] = useState({});
  const [fileFormats, setFileFormats] = useState({});

  const resizeToDataURL = (img, targetW, targetH, qualityPercent, format) => {
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const mimeType =
      {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
        bmp: "image/bmp",
        tiff: "image/tiff",
      }[format?.toLowerCase()] || "image/jpeg";

    return canvas.toDataURL(mimeType, qualityPercent / 100);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setAfterImages([]);

    const newPreviews = selectedFiles.map((file) => ({
      file,
      name: file.name,
      before: { width: 0, height: 0, sizeKB: Math.round(file.size / 1024) },
      after: { width, height, sizeKB: 0, dataUrl: null },
    }));

    setPreviews(newPreviews);

    const initialNames = {};
    const initialFormats = {};
    selectedFiles.forEach((file) => {
      initialNames[file.name] = file.name.replace(/\.[^/.]+$/, "");
      initialFormats[file.name] = "jpg";
    });
    setFileNames(initialNames);
    setFileFormats(initialFormats);

    selectedFiles.forEach((file, idx) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        setPreviews((prev) => {
          const copy = [...prev];
          const w = width;
          const h = lockAspect
            ? Math.round(width * (img.height / img.width))
            : height;
          copy[idx].before.width = img.width;
          copy[idx].before.height = img.height;
          copy[idx].after.width = w;
          copy[idx].after.height = h;
          copy[idx].after.dataUrl = resizeToDataURL(img, w, h, quality, "jpg");
          copy[idx].after.sizeKB = Math.round(
            (file.size * w * h) / (img.width * img.height) / 1024
          );
          return copy;
        });
        URL.revokeObjectURL(img.src);
      };
    });
  };

  const handleUpload = async () => {
    if (!files.length) return toast.error("Select images first.");

    const formData = new FormData();
    files.forEach((f) => formData.append("images", f));
    formData.append("width", Math.max(width, 1));
    formData.append("height", Math.max(height, 1));
    formData.append("quality", quality);
    formData.append("lockAspect", lockAspect);

    const toastId = toast.loading("Uploading...");
    try {
      const res = await api.post("/upload", formData);
      toast.success("Uploaded & resized!", { id: toastId });
      setAfterImages(res.data.items);
    } catch (err) {
      console.error(err);
      toast.error("Upload failed", { id: toastId });
    } finally {
      toast.dismiss(toastId);
    }
  };

  // format size to KB/MB
  const formatFileSize = (sizeKB) => {
    if (sizeKB < 1024) return sizeKB + " KB";
    else return (sizeKB / 1024).toFixed(2) + " MB";
  };

  return (
    <div className="upload-container">
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
      />

      <label>
        <input
          type="checkbox"
          checked={lockAspect}
          onChange={() => setLockAspect(!lockAspect)}
        />{" "}
        Lock Aspect Ratio
      </label>

      <div className="sliders">
        <label>Width: {width}px</label>
        <input
          type="range"
          min="100"
          max="2000"
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
        />
        <label>Height: {height}px</label>
        <input
          type="range"
          min="100"
          max="2000"
          value={height}
          onChange={(e) => setHeight(Number(e.target.value))}
        />
        <label>Quality: {quality}%</label>
        <input
          type="range"
          min="10"
          max="100"
          value={quality}
          onChange={(e) => setQuality(Number(e.target.value))}
        />
      </div>

      <button onClick={handleUpload}>Resize</button>

      {previews.length > 0 && (
        <div className="after-preview-container">
          {previews.map((p, idx) => (
            <div key={idx} className="after-preview-card-container">
              <div className="after-preview-card">
                <div className="before-after-row">
                  <div className="preview-card-container">
                    <strong>Before</strong>
                    <div className="preview-card">
                      <img
                        src={URL.createObjectURL(p.file)}
                        alt={`Before ${p.name}`}
                      />
                    </div>
                    <div className="image-info">
                      <span className="dimensions">
                        {p.before.width}×{p.before.height}px
                      </span>
                      <span className="file-size">
                        {formatFileSize(p.before.sizeKB)}
                      </span>
                    </div>
                  </div>

                  <div className="preview-card-container">
                    <strong>After</strong>
                    <div className="preview-card">
                      <img src={p.after.dataUrl} alt={`After ${p.name}`} />
                    </div>
                    <div className="image-info">
                      <span className="dimensions">
                        {p.after.width}×{p.after.height}px
                      </span>
                      <span className="file-size">
                        {formatFileSize(p.after.sizeKB)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rename-section">
                  <input
                    type="text"
                    value={fileNames[p.name]}
                    onChange={(e) =>
                      setFileNames((prev) => ({
                        ...prev,
                        [p.name]: e.target.value,
                      }))
                    }
                  />
                  <select
                    value={fileFormats[p.name]}
                    onChange={(e) =>
                      setFileFormats((prev) => ({
                        ...prev,
                        [p.name]: e.target.value,
                      }))
                    }
                  >
                    <option value="jpg">.JPG</option>
                    <option value="png">.PNG</option>
                    <option value="gif">.GIF</option>
                    <option value="bmp">.BMP</option>
                    <option value="tiff">.TIFF</option>
                    <option value="webp">.WEBP</option>
                  </select>
                  <a
                    href={p.after.dataUrl}
                    download={`${fileNames[p.name]}.${fileFormats[p.name]}`}
                  >
                    Download
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
