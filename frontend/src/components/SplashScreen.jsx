import React, { useEffect, useState } from "react";
import "./SplashScreen.css";

const SplashScreen = ({ onFinish }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true); // trigger fade-out
      setTimeout(onFinish, 800); // wait for fade-out
    }, 2000); // show splash for 2s

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`splash-screen ${fadeOut ? "fade-out" : ""}`}>
      <div className="splash-gradient"></div>
      <img src="/logo.png" alt="App Logo" className="splash-logo" />
      <h1 className="splash-title">Image Resizer</h1>
    </div>
  );
};

export default SplashScreen;
