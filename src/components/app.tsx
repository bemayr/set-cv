import { FunctionalComponent, h } from "preact";
import { useSizes as useWindowDimensions } from "react-use-sizes";
import Camera from "./camera";
import Controls from "./controls";
import { useMachine, useSelector } from "@xstate/react";
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
import { makeDetectSets } from "../logic/detect";

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
      setVideoDimension: ({ videoDimension: { width, height } }) => {
        videoRef.current.width = width;
        videoRef.current.height = height;
      },
    },
    services: {
      loadOpenCV: () => loadOpencv({ opencvJsLocation: "./assets/opencv.js" }),
      detectSets: makeDetectSets(videoRef),
    },
  });
  const masterState = useSelector(service, (state) =>
    state.hasTag("master-stopped") ? "stopped" : "running"
  );

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
      <Controls
        masterState={masterState}
        toggleMasterState={() => send("TOGGLE_MASTER")}
        cameraSelected={(camera) => send(model.events.CAMERA_SELECTED(camera.deviceId))}
        timeoutSelected={(timeout) => send(model.events.SET_REPORT_TIMEOUT(timeout === "none" ? 1000000 : timeout))} // TODO: I don't like this
      />
    </div>
  );
};

export default App;
