import { useState, useEffect } from "react";

export default function useOrientationChange() {
  const [orientation, setOrientation] = useState(window.orientation);

  useEffect(() => {
    const handler = (event: any) => {
      console.log(event.orientation);
      console.log(window.orientation);
      setOrientation(window.orientation);
    };

    window.addEventListener("orientationchange", handler);

    console.log("registered handler")
    console.log(window.orientation);
    console.log(window.orientation)

    return () => {
      window.removeEventListener("orientationchange", handler);
    };
  }, []);

  return orientation === 0 ? "portrait" : "landscape"; // for -90 (right) and 90 (left)
}
