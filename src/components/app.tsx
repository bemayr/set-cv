import { FunctionalComponent, h } from "preact";
import { useSizes as useWindowDimensions } from "react-use-sizes";
import Camera from "./camera";
import Controls from "./controls";
import { useMachine } from "@xstate/react";
import { loadOpencv } from "mirada";
import { machine, model } from "../logic/set-cv.machine";

// rmwc Styles
import "@rmwc/theme/styles";
import "@rmwc/icon/styles";
import "@rmwc/fab/styles";
import "@rmwc/menu/styles";
import "@rmwc/list/styles";
import { useDidMount } from "rooks";
import { useRef } from "preact/hooks";

const App: FunctionalComponent = () => {
  const dimensions = useWindowDimensions();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, send, service] = useMachine(machine, {
    devTools: true,
    guards: {
      isCameraReady: () =>
        videoRef.current.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA,
    },
    actions: {
      startVideo: ({ cameraStream }) =>
        (videoRef.current.srcObject = cameraStream),
    },
    services: {
      loadOpenCV: () => loadOpencv({ opencvJsLocation: "./assets/opencv.js" }),
    },
  });

  useDidMount(() =>
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { exact: "environment" } } })
      .then((stream) => {
        const { deviceId } = stream.getVideoTracks()[0].getSettings();
        send(model.events.CAMERA_SELECTED(deviceId!));
      })
  );

  return (
    <div id="app">
      {/* <SetCamera/> */}
      <Camera ref={videoRef} cameraReady={() => send("CAMERA_READY")} />
      <Controls />
    </div>
  );
};

export default App;
