import { FunctionalComponent, h } from "preact";
import { useSizes as useWindowDimensions } from "react-use-sizes";
import Webcam from "react-webcam";

const SetCamera: FunctionalComponent = () => {
  const { windowSize } = useWindowDimensions();

  const videoConstraints = {
    width: windowSize.width,
    height: windowSize.height,
    facingMode: { exact: "environment" },
  };

  return (
    <Webcam
      style={{ position: "absolute" }}
      videoConstraints={videoConstraints}
    />
  );
};

export default SetCamera;
