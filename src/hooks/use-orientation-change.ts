import { useDidMount } from "rooks";
import { useState } from "preact/hooks";

export type Orientation = "landscape" | "portrait";

export default function useOrientationChange(): Orientation {
  const hasScreenOrientation = "orientation" in screen;
  const getScreenOrientation = () =>
    screen.orientation.type.startsWith("portrait") ? "portrait" : "landscape";
  const hasWindowOrientation = "orientation" in window;
  const getWindowOrientation = () =>
    Math.abs(window.orientation as number) === 90 ? "landscape" : "portrait";

  if (!(hasScreenOrientation || hasWindowOrientation))
    throw new Error("sorry you are fucked");

  const [orientation, setOrientation] = useState<Orientation>(
    hasScreenOrientation ? getScreenOrientation() : getWindowOrientation()
  );

  useDidMount(() => {
    if (hasScreenOrientation) {
      const handler = () => setOrientation(getScreenOrientation());
      screen.orientation.addEventListener("change", handler);
      return () => screen.orientation.removeEventListener("change", handler);
    }
    if (hasWindowOrientation) {
      const handler = () => setOrientation(getWindowOrientation());
      window.addEventListener("orientationchange", handler);
      return () =>
        window.removeEventListener("changeorientationchange", handler);
    }
  });

  return orientation;
}
