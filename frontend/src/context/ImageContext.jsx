import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const ImageContext = createContext();

export const ImageProvider = ({ children }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await api.get("/images");
      setImages(res.data);
      localStorage.setItem("imageHistory", JSON.stringify(res.data));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  return (
    <ImageContext.Provider value={{ images, setImages, loading, fetchImages }}>
      {children}
    </ImageContext.Provider>
  );
};

export const useImages = () => useContext(ImageContext);
