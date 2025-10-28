import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import axios from "axios";

export default function ImageUpload() {
  const [files, setFiles] = useState([]);
  const [width, setWidth] = useState(500);
  const [height, setHeight] = useState(500);
  const [quality, setQuality] = useState(90);
  const [lockAspect, setLockAspect] = useState(true);
  const [previews, setPreviews] = useState([]);
  const [afterImages, setAfterImages] = useState([]);
  const [fileNames, setFileNames] = useState({});
  const [fileFormats, setFileFormats] = useState({}); // store selected format per file

  // ✅ NEW: Accurate file size estimation using canvas.toBlob()
  const getActualSizeKB = async (img, w, h, qualityPercent, format) => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      const mimeType =
        {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          gif: "image/gif",
          bmp: "image/bmp",
          tiff: "image/tiff",
          webp: "image/webp",
        }[format?.toLowerCase()] || "image/jpeg";

      canvas.toBlob(
        (blob) => {
          resolve((blob.size / 1024).toFixed(2)); // size in KB
        },
        mimeType,
        qualityPercent / 100
      );
    });
  };

  const estimateSize = (origSize, origW, origH, newW, newH, qualityPercent) =>
    Math.round(
      (((origSize * newW * newH) / (origW * origH)) * (qualityPercent / 100)) /
        1024
    );

  const resizeToDataURL = (img, targetW, targetH, qualityPercent, format) => {
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // Convert based on selected format
    const mimeType =
      {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        bmp: "image/bmp",
        tiff: "image/tiff",
        webp: "image/webp",
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
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      initialNames[file.name] = baseName;
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
          copy[idx].after.sizeKB = estimateSize(
            file.size,
            img.width,
            img.height,
            w,
            h,
            quality
          );
          return copy;
        });

        // ✅ NEW: Compute real estimated size
        getActualSizeKB(
          img,
          width,
          lockAspect ? Math.round(width * (img.height / img.width)) : height,
          quality,
          "jpg"
        ).then((actualKB) => {
          setPreviews((prev) => {
            const updated = [...prev];
            updated[idx].after.sizeKB = actualKB;
            return updated;
          });
        });

        URL.revokeObjectURL(img.src);
      };
    });
  };

  useEffect(() => {
    previews.forEach((p, idx) => {
      const img = new Image();
      img.src = URL.createObjectURL(p.file);
      img.onload = () => {
        setPreviews((prev) => {
          const copy = [...prev];
          const w = width;
          const h = lockAspect
            ? Math.round(width * (img.height / img.width))
            : height;
          const format = fileFormats[p.name] || "jpg";
          copy[idx].after.width = w;
          copy[idx].after.height = h;
          copy[idx].after.dataUrl = resizeToDataURL(img, w, h, quality, format);
          copy[idx].after.sizeKB = estimateSize(
            p.file.size,
            img.width,
            img.height,
            w,
            h,
            quality
          );
          return copy;
        });

        // ✅ NEW: Accurate size recalculation on slider change
        getActualSizeKB(
          img,
          width,
          lockAspect ? Math.round(width * (img.height / img.width)) : height,
          quality,
          fileFormats[p.name]
        ).then((actualKB) => {
          setPreviews((prev) => {
            const updated = [...prev];
            updated[idx].after.sizeKB = actualKB;
            return updated;
          });
        });

        URL.revokeObjectURL(img.src);
      };
    });
  }, [width, height, quality, lockAspect, fileFormats]);

  const handleUpload = async () => {
    if (!files.length) return toast.error("Select images first.");

    const formData = new FormData();
    files.forEach((f) => formData.append("images", f));
    formData.append("width", Math.max(width, 1));
    formData.append("height", Math.max(height, 1));
    formData.append("quality", quality);
    formData.append("lockAspect", lockAspect);

    try {
      const toastId = toast.loading("Uploading...");
      const res = await axios.post(
        "http://localhost:5000/api/upload",
        formData
      );
      toast.dismiss(toastId);
      toast.success("Uploaded & resized!");
      setAfterImages(res.data.items);
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    }
  };

  return (
    <div className="upload-container">
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
      />

      <label className="aspect-label">
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

      <button className="upload-btn" onClick={handleUpload}>
        Upload & Resize
      </button>

      {previews.length > 0 && (
        <div className="after-preview-container">
          {previews.map((p, idx) => (
            <div key={idx} className="after-preview-card">
              <div className="before-after-row">
                <div className="before-after-column">
                  <strong>Before</strong>
                  <img
                    src={URL.createObjectURL(p.file)}
                    alt={`Before ${p.name}`}
                  />
                  <div className="image-info">
                    <span>
                      {p.before.width}×{p.before.height}px
                    </span>
                    <span>~{p.before.sizeKB} KB</span>
                  </div>
                </div>

                <div className="before-after-column">
                  <strong>After</strong>
                  <img src={p.after.dataUrl} alt={`After ${p.name}`} />
                  <div className="image-info">
                    <span>
                      {p.after.width}×{p.after.height}px
                    </span>
                    {/* ✅ Show accurate estimated size */}
                    <span>
                      ~
                      {p.after.sizeKB
                        ? `${p.after.sizeKB} KB`
                        : "Calculating..."}
                    </span>
                  </div>
                </div>
              </div>

              {p.after.dataUrl && (
                <div className="rename-section">
                  <input
                    className="file-name-input"
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
                    className="file-format-select"
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
                    <option value="webp">.WebP</option>
                  </select>

                  <a
                    href={p.after.dataUrl}
                    download={`${fileNames[p.name] || "image"}.${
                      fileFormats[p.name]
                    }`}
                    className="download-btn"
                  >
                    Download
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
