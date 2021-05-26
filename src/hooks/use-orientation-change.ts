import { useState, useEffect } from "react";

export default function useOrientationChange() {
  const [orientation, setOrientation] = useState(screen.orientation.type);

  useEffect(() => {
    const handler = () => setOrientation(screen.orientation.type);

    screen.orientation.addEventListener("change", handler);

    return () => {
      screen.orientation.removeEventListener("change", handler);
    };
  }, []);

  return orientation.startsWith("portrait") ? "portrait" : "landscape";
}
