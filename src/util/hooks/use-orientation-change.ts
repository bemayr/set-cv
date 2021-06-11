import { useDidMount } from "rooks";
import { useCallback, useState } from "preact/hooks";

export type Orientation = "landscape" | "portrait";

export default function useOrientationChange(orientationChanged: (orientation: Orientation) => void): Orientation {
  const hasScreenOrientation = "orientation" in screen;
  const getScreenOrientation = () =>
    screen.orientation.type.startsWith("portrait") ? "portrait" : "landscape";
  const hasWindowOrientation = "orientation" in window;
  const getWindowOrientation = () =>
    Math.abs(window.orientation as number) === 90 ? "landscape" : "portrait";

  if (!(hasScreenOrientation || hasWindowOrientation))
    throw new Error("sorry you are fucked");

  const [orientation, setOrientationState] = useState<Orientation>(
    hasScreenOrientation ? getScreenOrientation() : getWindowOrientation()
  );

  const setOrientation = useCallback((orientation: Orientation) => {
      setOrientationState(orientation)
      orientationChanged(orientation)
  }, [])

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
