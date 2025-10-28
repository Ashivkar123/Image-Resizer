import React, { useState } from "react";
import api from "../services/api";
import { useImages } from "../context/ImageContext";
import toast from "react-hot-toast";

export default function ImageEditor({ image, onClose }) {
  const { fetchImages } = useImages();

  const [width, setWidth] = useState(image.resizedWidth);
  const [height, setHeight] = useState(image.resizedHeight);
  const [rotate, setRotate] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [format, setFormat] = useState(image.format);

  const handleSave = async () => {
    try {
      await api.put(`/images/${image._id}/edit`, {
        width,
        height,
        rotate,
        flipH,
        flipV,
        format,
      });
      toast.success("Image edited successfully!");
      fetchImages();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Edit failed");
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>Edit Image</h3>
        <img
          src={`http://localhost:5000/uploads/${image.filepath}`}
          alt={image.filename}
          style={{ width: "100%" }}
        />
        <label>Width:</label>
        <input
          type="number"
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
        />
        <label>Height:</label>
        <input
          type="number"
          value={height}
          onChange={(e) => setHeight(Number(e.target.value))}
        />
        <label>Rotate (°):</label>
        <input
          type="number"
          value={rotate}
          onChange={(e) => setRotate(Number(e.target.value))}
        />
        <label>
          <input
            type="checkbox"
            checked={flipH}
            onChange={(e) => setFlipH(e.target.checked)}
          />{" "}
          Flip Horizontal
        </label>
        <label>
          <input
            type="checkbox"
            checked={flipV}
            onChange={(e) => setFlipV(e.target.checked)}
          />{" "}
          Flip Vertical
        </label>
        <label>Format:</label>
        <select value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="png">PNG</option>
          <option value="jpeg">JPEG</option>
          <option value="webp">WEBP</option>
        </select>
        <div className="modal-actions">
          <button onClick={handleSave}>Save</button>
          <button onClick={onClose} style={{ background: "red" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
