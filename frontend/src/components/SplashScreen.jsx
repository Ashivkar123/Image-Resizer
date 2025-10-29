import React, { useEffect, useState } from "react";
import "./SplashScreen.css";

const SplashScreen = ({ onFinish }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Use requestAnimationFrame for smoother animation timing
    const timer = setTimeout(() => {
      setFadeOut(true); // trigger fade-out animation
      const finishTimer = setTimeout(() => {
        if (typeof onFinish === "function") onFinish();
      }, 1000); // wait for fade-out to complete smoothly
      return () => clearTimeout(finishTimer);
    }, 2500); // display splash for 2 seconds

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`splash-screen ${fadeOut ? "fade-out" : ""}`}
      style={{ willChange: "opacity, transform" }} // hint browser to optimize rendering
    >
      <div className="splash-gradient"></div>
      <img
        src="/logo.png"
        alt="App Logo"
        className="splash-logo"
        loading="eager" // ensures logo loads before animation
      />
      <h1 className="splash-title">Image Resizer</h1>
    </div>
  );
};

export default SplashScreen;
