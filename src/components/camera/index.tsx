import { h } from "preact";
import { forwardRef } from 'preact/compat';
import style from "./style.css";

interface CameraProps {
  cameraReady: () => void;
}

const Camera = forwardRef<HTMLVideoElement, CameraProps>(
  (props, ref) => {
    return (
      <div class={style.camera}>
        <video
          autoPlay={true}
          playsInline
          style={{
            position: "absolute",
            width: "100vw",
            height: "100vh",
            background: "black",
          }}
          ref={ref}
          // width={videoDimensions.width}
          // height={videoDimensions.height}
          onLoadedMetadata={props.cameraReady}
          // height={600}
        ></video>
      </div>
    );
  }
);

export default Camera;
