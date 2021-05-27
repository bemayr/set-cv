import { useMachine, useSelector } from "@xstate/react";
import cv, { Mat } from "opencv-ts";
import { FunctionalComponent, h } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { useSizes as useWindowDimensions } from "react-use-sizes";
import Webcam from "react-webcam";
import { useDidMount, useInterval } from "rooks";
import { assign, createMachine } from "xstate";
import { createModel } from "xstate/lib/model";
import useOrientationChange, {
  Orientation,
} from "../../hooks/use-orientation-change";

// TODO: stop video tracks
// cameraStream: undefined as undefined | MediaStream,
// cameraStream.getTracks().forEach((track) => track.stop());

const model = createModel(
  {
    selectedCamera: undefined as undefined | string,
    cameraStream: undefined as any as MediaStream,
    streamDimension: undefined as undefined | { width: number; height: number },
    videoDimension: { width: 0, height: 0 },
    orientation: "landscape" as Orientation,
    src: undefined as any as typeof cv.Mat,
    cap: undefined as any as typeof cv.VideoCapture,
  },
  {
    events: {
      OPENCV_INITIALIZED: () => ({}),
      CAMERA_SELECTED: (deviceId: string) => ({ deviceId }),
      CAMERA_READY: () => ({}),
      ORIENTATION_CHANGED: (orientation: Orientation) => ({ orientation }),
      DETECT: () => ({}),
      PAUSE_DETECTION: () => ({}),
      RESUME_DETECTION: () => ({}),
      "done.invoke.waitingForCameraStream": (data: MediaStream) => ({ data }),
    },
  }
);

const machine = createMachine<typeof model>(
  {
    context: model.initialContext,
    initial: "initializing",
    on: {
      CAMERA_SELECTED: {
        target: [
          "initializing.opencv.history",
          "initializing.camera.startingCamera",
        ],
        actions: [
          "stopCameraStream",
          model.assign({
            selectedCamera: (_, event) => event.deviceId,
          }),
        ],
      },
      ORIENTATION_CHANGED: {
        actions: [
          model.assign({
            orientation: (_, event) => event.orientation,
          }),
          "assignVideoDimension",
        ],
      },
    },
    states: {
      initializing: {
        type: "parallel",
        states: {
          opencv: {
            initial: "loading",
            states: {
              history: {
                type: "history",
              },
              loading: {
                on: {
                  OPENCV_INITIALIZED: {
                    target: "ready",
                  },
                },
              },
              ready: {
                type: "final",
              },
            },
          },
          camera: {
            initial: "noCameraSelected",
            states: {
              noCameraSelected: {},
              startingCamera: {
                invoke: {
                  id: "waitingForCameraStream",
                  src: "startCamera",
                  onDone: {
                    target: "waitingForCamera",
                    actions: [
                      assign({
                        cameraStream: (_, event) => event.data,
                      }),
                      "startVideo",
                    ],
                  },
                },
              },
              waitingForCamera: {
                always: { target: "ready", cond: "isCameraReady" },
                on: { CAMERA_READY: "ready" },
              },
              ready: {
                entry: ["assignStreamDimension", "assignVideoDimension"],
                type: "final",
              },
            },
          },
        },
        onDone: { target: "detecting" },
      },
      detecting: {
        entry: ["detection.initialize"],
        exit: ["detection.finalize"],
        on: {
          PAUSE_DETECTION: "paused",
        },
        initial: "idle",
        states: {
          idle: {
            on: {
              DETECT: "detectionRunning",
            },
          },
          detectionRunning: {
            invoke: {
              src: "detectCards",
              onDone: "idle",
            },
          },
        },
      },
      paused: {
        tags: "paused",
        on: {
          RESUME_DETECTION: "detecting",
        },
      },
    },
  },
  {
    actions: {
      stopCameraStream: ({ cameraStream }) => {
        if (cameraStream !== undefined)
          cameraStream.getTracks().forEach((track) => track.stop());
      },
      assignStreamDimension: assign(({ orientation, cameraStream }) => {
        const { width, height } = cameraStream
          .getVideoTracks()[0]
          .getSettings();
        if (orientation === "landscape")
          return {
            streamDimension: {
              width: width!,
              height: height!,
            },
          };
        if (orientation === "portrait")
          return {
            streamDimension: {
              width: height!,
              height: width!,
            },
          };
        return {};
      }),
      assignVideoDimension: assign(({ streamDimension, orientation }) => {
        const { width = 0, height = 0 } = streamDimension || {};
        const MAX = 600;
        const scale = Math.min(MAX / width!, MAX / height!);
        if (orientation === "landscape")
          return {
            videoDimension: {
              width: width! * scale,
              height: height! * scale,
            },
          };
        if (orientation === "portrait")
          return {
            videoDimension: {
              width: height! * scale,
              height: width! * scale,
            },
          };
        return {};
      }),
    },
  }
);

const SetCamera: FunctionalComponent = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const thresholdRef = useRef(null);
  const overlayRef = useRef(null);
  const initialOrientation = useOrientationChange((orientation) => send(model.events.ORIENTATION_CHANGED(orientation)));
  const detectCards = useCallback((context: typeof model.initialContext) => {
    // @ts-ignore
    const video = videoRef.current;
    const src = context.src;
    const cap = context.cap;
    const dst = new cv.Mat(video.height, video.width, cv.CV_8UC1);

    const cnts = new cv.MatVector();
    const hierarchy: Mat = new cv.Mat();

    cap.read(src);

    // start processing.
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);

    // --- FAR FROM IDEAL ---
    // cv.GaussianBlur(dst, dst, new cv.Size(1, 1), 1000, 0, cv.BORDER_DEFAULT)
    // cv.threshold(dst, dst, 120, 255, cv.THRESH_BINARY)

    // --- NOT IDEAL ---
    cv.GaussianBlur(dst, dst, new cv.Size(5, 5), 1000, 0, cv.BORDER_DEFAULT);
    cv.adaptiveThreshold(
      dst,
      dst,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      11,
      2
    );

    // // --- C++ Set Solution, not ideal as well ---
    // cv.normalize(dst, dst, 0, 255, cv.NORM_MINMAX);
    // cv.adaptiveThreshold(
    //   dst,
    //   dst,
    //   255,
    //   cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    //   cv.THRESH_BINARY,
    //   181,
    //   10
    // );
    // cv.imshow(thresholdRef.current!, dst);

    // cv.GaussianBlur(
    //   dst,
    //   dst,
    //   new cv.Size(5, 5),
    //   0,
    //   0,
    //   cv.BORDER_DEFAULT
    // );
    // cv.threshold(dst, dst, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
    cv.imshow(thresholdRef.current!, dst);

    const contours = [];

    cv.findContours(
      dst,
      // @ts-ignore
      cnts,
      hierarchy,
      cv.RETR_TREE,
      cv.CHAIN_APPROX_TC89_L1
    );
    // @ts-ignore
    for (let i = 0; i < cnts.size(); ++i) contours.push(cnts.get(i));

    const result = [...contours]
      .sort((a, b) => cv.contourArea(b) - cv.contourArea(a))
      .slice(0, 18);

    // const overlay = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
    const overlay = new cv.Mat(
      src.rows,
      src.cols,
      cv.CV_8UC4,
      new cv.Scalar(0, 0, 0, 0)
    );

    result.forEach((c, i) => {
      const temp = new cv.MatVector();
      temp.push_back(c);

      const peri = cv.arcLength(c, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(c, approx, 0.04 * peri, true);

      const test = new cv.MatVector();
      test.push_back(approx);

      // console.log({height: approx.size().height, width: approx.size().width})

      if (approx.size().height === 4) {
        if (cv.contourArea(c) > 7000) {
          cv.drawContours(
            overlay,
            // @ts-ignore
            test,
            0,
            new cv.Scalar(255, 0, 0, 255),
            5,
            cv.LINE_8
          );
        } else {
          cv.drawContours(
            overlay,
            // @ts-ignore
            test,
            0,
            new cv.Scalar(0, 255, 0, 255),
            5,
            cv.LINE_8
          );
        }
      }
    });

    // cv.imshow(canvasRef.current!, dst);
    cv.imshow(overlayRef.current!, overlay);

    overlay.delete();
    dst.delete();
    cnts.delete();
    hierarchy.delete();

    return Promise.resolve();
  }, []);
  const [state, send, service] = useMachine(machine, {
    devTools: true,
    context: {
      orientation: initialOrientation,
    },
    guards: {
      isCameraReady: () =>
        videoRef.current.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA,
    },
    actions: {
      startVideo: ({ cameraStream }) =>
        (videoRef.current.srcObject = cameraStream),
      "detection.initialize": assign((context) => {
        // @ts-ignore
        // const video = webcamRef.current.base;
        const video = videoRef.current;
        const src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
        // const cap = new cv.VideoCapture(video);
        // cap.read(src);
        return { src };
      }),
      "detection.finalize": (context) => {
        context.src?.delete();
      },
    },
    services: {
      startCamera: async ({ selectedCamera }) => {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 4096 },
            height: { ideal: 2160 },
            deviceId: selectedCamera,
          },
        });
        // const { width, height } = stream.getVideoTracks()[0].getSettings();
        // const MAX = 600;
        // const scale = Math.min(MAX / width!, MAX / height!);
        // if (orientation === "landscape")
        //   setVideoDimensions({
        //     width: width!,
        //     height: height!,
        //     displayWidth: width! * scale,
        //     displayHeight: height! * scale,
        //   });
        // if (orientation === "portrait")
        //   setVideoDimensions({
        //     width: height!,
        //     height: width!,
        //     displayWidth: height! * scale,
        //     displayHeight: width! * scale,
        //   });
        // videoRef.current.srcObject = stream;
        return stream;
      },
      detectCards: detectCards,
    },
  });
  const videoDimensions = useSelector(
    service,
    (state) => state.context.videoDimension
  );
  const orientation = useSelector(
    service,
    (state) => state.context.orientation
  );

  // const [videoDimensions, setVideoDimensions] = useState({
  //   width: 0,
  //   height: 0,
  //   displayWidth: 0,
  //   displayHeight: 0,
  // });

  const constraints: MediaStreamConstraints = {
    video: {
      width: { ideal: 4096 },
      height: { ideal: 2160 },
      facingMode: { exact: "environment" },
    },
  };

  useDidMount(() => {
    cv.onRuntimeInitialized = () => send("OPENCV_INITIALIZED");
  });

  useDidMount(() =>
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { exact: "environment" } } })
      .then((stream) => {
        const { deviceId } = stream.getVideoTracks()[0].getSettings();
        send(model.events.CAMERA_SELECTED(deviceId!));
      })
  );

  // useDidMount(() => {
  //   if (navigator.mediaDevices.getUserMedia) {
  //     navigator.mediaDevices
  //       .getUserMedia(constraints)
  //       .then(function (stream) {
  //         const { width, height } = stream.getVideoTracks()[0].getSettings();
  //         const MAX = 600;
  //         const scale = Math.min(MAX / width!, MAX / height!);
  //         if (orientation === "landscape")
  //           setVideoDimensions({
  //             width: width!,
  //             height: height!,
  //             displayWidth: width! * scale,
  //             displayHeight: height! * scale,
  //           });
  //         if (orientation === "portrait")
  //           setVideoDimensions({
  //             width: height!,
  //             height: width!,
  //             displayWidth: height! * scale,
  //             displayHeight: width! * scale,
  //           });
  //         videoRef.current.srcObject = stream;
  //         console.log(videoRef.current.readyState);
  //       })
  //       .catch(function (error) {
  //         console.error(error);
  //       });
  //   }
  // });

  const [selectedCamera, selectCamera] =
    useState<MediaDeviceInfo | undefined>(undefined);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);

  const handleDevices = useCallback(
    (mediaDevices: MediaDeviceInfo[]) =>
      setCameras(mediaDevices.filter(({ kind }) => kind === "videoinput")),
    [setCameras]
  );

  useDidMount(() =>
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) =>
        setCameras(devices.filter(({ kind }) => kind === "videoinput"))
      )
  );

  const FPS = 5;
  // useRaf(() => send("SCAN"), true);
  // useInterval(() => send("DETECT"), 1000 / FPS, true);

  // var orientation = (screen.orientation || {}).type || screen.mozOrientation || screen.msOrientation;
  // const orientation = screen.orientation
  // console.log(screen.orientation.type)

  return (
    <div>
      <video
        autoPlay={true}
        playsInline
        style={{
          position: "absolute",
          width: "100vw",
          height: "100vh",
          background: "black",
        }}
        ref={videoRef}
        width={videoDimensions.width}
        height={videoDimensions.height}
        onLoadedMetadata={() => send("CAMERA_READY")}
        // height={600}
      ></video>
      {/* <canvas
        ref={overlayRef}
        style={{ position: "absolute", opacity: 0.95 }}
      ></canvas> */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          display: "flex",
          flexDirection: "row",
          width: "100vw",
          background: "#00000055",
          overflowX: "auto",
          color: "white",
        }}
      >
        <div
          style={{
            margin: "10px",
          }}
        >
          <p style={{ margin: "2px" }}>Threshold</p>
          <canvas
            ref={thresholdRef}
            style={{
              height: "20vh",
              minHeight: "100px",
              border: "1px white solid",
            }}
          ></canvas>
        </div>
        <div
          style={{
            margin: "10px",
          }}
        >
          <p style={{ margin: "2px" }}>Mask</p>
          <canvas
            ref={overlayRef}
            style={{
              height: "20vh",
              minHeight: "100px",
              border: "1px white solid",
            }}
          ></canvas>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          backgroundColor: "white",
          padding: "1em",
        }}
      >
        {/* <p>State: {JSON.stringify(state.value, null, 2)}</p> */}
        <p>Context: {JSON.stringify(state.context, null, 2)}</p>
        <p>Video Dimensions: {JSON.stringify(videoDimensions, null, 2)}</p>
        <p>Orientation: {orientation}</p>
        {/* <button onClick={() => send("TOGGLE")}>
          {state.hasTag("paused") ? "Resume" : "Pause"}
        </button> */}
        <div>
          <select
            value={selectedCamera?.deviceId}
            onChange={(event) => {
              /* @ts-ignore */
              send(model.events.CAMERA_SELECTED(event.target.value));
            }}
          >
            {cameras.map((camera) => (
              <option key={camera.deviceId} value={camera.deviceId}>
                {camera.label}
              </option>
            ))}
          </select>
        </div>
        {/* <p>Selected Camera: {cameras.find(selectedCamera?.label}</p> */}
      </div>
    </div>
  );
};

export default SetCamera;
