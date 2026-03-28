import { useState, useEffect } from "react";
import { DotLottiePlayer } from "@dotlottie/react-player";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Show splash for 2.5s then fade out
    const timer = setTimeout(() => setFadeOut(true), 2500);
    const removeTimer = setTimeout(() => onComplete(), 3000);
    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-background transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="w-40 h-40">
        <DotLottiePlayer
          src="/animations/splash.lottie"
          autoplay
          loop
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
};

export default SplashScreen;
