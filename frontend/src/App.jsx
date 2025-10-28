import React, { useState } from "react";
import ImageUpload from "./components/ImageUpload";
import { Toaster } from "react-hot-toast";
import SplashScreen from "./components/SplashScreen";
import "./index.css";

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Apply/remove dark theme
  React.useEffect(() => {
    if (darkMode) document.body.classList.add("dark-theme");
    else document.body.classList.remove("dark-theme");
  }, [darkMode]);

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      {!showSplash && (
        <div className="centralize-viewport">
          <div className="app-container">
            <header>
              <h1>Image Resizer</h1>
              <p>Resize your images and download them instantly</p>

              <button
                className="theme-toggle"
                onClick={() => setDarkMode(!darkMode)}
                aria-label="Toggle theme"
              ></button>
            </header>

            <ImageUpload />

            <Toaster position="top-right" reverseOrder={false} />
          </div>
        </div>
      )}
    </>
  );
}

export default App;
