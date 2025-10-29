import React, { useState, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../services/api.js";
import debounce from "lodash.debounce";

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
  const [targetSize, setTargetSize] = useState("");

  // Clean up ObjectURLs on unmount
  useEffect(() => {
    return () => {
      previews.forEach((p) => {
        if (p.before.objectUrl) URL.revokeObjectURL(p.before.objectUrl);
        if (p.after.objectUrl) URL.revokeObjectURL(p.after.objectUrl);
      });
    };
  }, [previews]);

  // Resize image in browser
  const getResizedDataUrl = (file, targetW, targetH) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, targetW, targetH);
          resolve(canvas.toDataURL(file.type || "image/png"));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });

  // Handle file selection
  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setAfterImages([]);

    previews.forEach((p) => {
      if (p.before.objectUrl) URL.revokeObjectURL(p.before.objectUrl);
      if (p.after.objectUrl) URL.revokeObjectURL(p.after.objectUrl);
    });

    const newPreviews = await Promise.all(
      selectedFiles.map(async (file) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        await new Promise((resolve) => {
          img.onload = resolve;
          img.src = objectUrl;
        });

        const w = width;
        const h = lockAspect
          ? Math.round(width * (img.height / img.width))
          : height;
        const afterDataUrl = await getResizedDataUrl(file, w, h);

        return {
          file,
          name: file.name,
          before: {
            width: img.width,
            height: img.height,
            sizeKB: Math.round(file.size / 1024),
            objectUrl,
          },
          after: {
            width: w,
            height: h,
            dataUrl: afterDataUrl,
            sizeKB: null,
            objectUrl: null,
          },
        };
      })
    );

    setPreviews(newPreviews);

    const initialNames = {};
    const initialFormats = {};
    selectedFiles.forEach((file) => {
      initialNames[file.name] = file.name.replace(/\.[^/.]+$/, "");
      initialFormats[file.name] = "jpg";
    });
    setFileNames(initialNames);
    setFileFormats(initialFormats);
  };

  // Debounced preview update
  const updateAfterPreview = useCallback(
    debounce(async (newWidth, newHeight) => {
      const updated = await Promise.all(
        previews.map(async (p) => {
          const dataUrl = await getResizedDataUrl(p.file, newWidth, newHeight);
          return {
            ...p,
            after: { ...p.after, width: newWidth, height: newHeight, dataUrl },
          };
        })
      );
      setPreviews(updated);
    }, 200),
    [previews]
  );

  // Slider handlers
  const handleWidthChange = (newWidth) => {
    setWidth(newWidth);
    const newHeight = lockAspect
      ? Math.round(
          newWidth *
            (previews[0]?.before.height / previews[0]?.before.width || 1)
        )
      : height;
    setHeight(newHeight);
    updateAfterPreview(newWidth, newHeight);
  };

  const handleHeightChange = (newHeight) => {
    setHeight(newHeight);
    const newWidth = lockAspect
      ? Math.round(
          newHeight *
            (previews[0]?.before.width / previews[0]?.before.height || 1)
        )
      : width;
    setWidth(newWidth);
    updateAfterPreview(newWidth, newHeight);
  };

  const parseTargetSize = (sizeStr) => {
    if (!sizeStr) return null;
    const match = sizeStr.match(/^([\d.]+)\s*(KB|MB)?$/i);
    if (!match) return null;
    let size = parseFloat(match[1]);
    if ((match[2]?.toUpperCase() || "KB") === "MB") size *= 1024;
    return size; // in KB
  };

  // Upload images
  const handleUpload = async () => {
    if (!files.length) return toast.error("Select images first.");

    const targetKB = parseTargetSize(targetSize);
    const formData = new FormData();
    files.forEach((f) => formData.append("images", f));

    let finalWidth = width;
    let finalHeight = height;
    let finalQuality = quality;

    if (targetKB) {
      const originalKB = Math.round(files[0].size / 1024);
      const scale = targetKB / originalKB;
      finalQuality = Math.min(Math.max(Math.floor(quality * scale), 10), 100);
      const scaleDim = Math.sqrt(scale);
      finalWidth = Math.max(Math.floor(width * scaleDim), 50);
      finalHeight = lockAspect
        ? Math.max(Math.floor(finalWidth * (height / width)), 50)
        : Math.max(Math.floor(height * scaleDim), 50);
    }

    formData.append("width", finalWidth);
    formData.append("height", finalHeight);
    formData.append("quality", finalQuality);
    formData.append("lockAspect", lockAspect);

    const toastId = toast.loading("Uploading...");
    try {
      const res = await api.post("/upload", formData);
      toast.success("Uploaded & resized!", { id: toastId });
      setAfterImages(res.data.items);

      setPreviews((prev) =>
        prev.map((p, idx) => {
          const uploaded = res.data.items[idx];
          return {
            ...p,
            after: {
              ...p.after,
              sizeKB: Math.round(uploaded.fileSize / 1024),
              dataUrl: `${api.defaults.baseURL.replace("/api", "")}/${
                uploaded.filepath
              }`,
            },
          };
        })
      );
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Upload failed", { id: toastId });
    } finally {
      toast.dismiss(toastId);
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

      <label className="lock-aspect-ratio-container">
        <input
          type="checkbox"
          checked={lockAspect}
          onChange={() => setLockAspect(!lockAspect)}
        />
        Lock Aspect Ratio
      </label>

      <div className="sliders">
        <label>Width: {width}px</label>
        <input
          type="range"
          min="100"
          max="2000"
          value={width}
          onChange={(e) => handleWidthChange(Number(e.target.value))}
        />
        <label>Height: {height}px</label>
        <input
          type="range"
          min="100"
          max="2000"
          value={height}
          onChange={(e) => handleHeightChange(Number(e.target.value))}
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

      <div className="upload-action-container">
        <button onClick={handleUpload}>Resize</button>
        <input
          type="text"
          placeholder="Target size (300KB or 1.5MB)"
          value={targetSize}
          onChange={(e) => setTargetSize(e.target.value)}
        />
      </div>

      {previews.length > 0 && (
        <div className="after-preview-container">
          {previews.map((p, idx) => (
            <div key={idx} className="after-preview-card">
              <div className="before-after-row">
                <div>
                  <strong>Before</strong>
                  <img src={p.before.objectUrl} alt={`Before ${p.name}`} />
                  <div className="image-info">
                    {p.before.width}×{p.before.height}px ~ {p.before.sizeKB} KB
                  </div>
                </div>
                <div>
                  <strong>After</strong>
                  <img src={p.after.dataUrl} alt={`After ${p.name}`} />
                  <div className="image-info">
                    {p.after.width}×{p.after.height}px ~{" "}
                    {p.after.sizeKB ?? "..."}
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
                  <option value="webp">.WebP</option>
                </select>
                <a
                  href={p.after.dataUrl}
                  download={`${fileNames[p.name]}.${fileFormats[p.name]}`}
                >
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
