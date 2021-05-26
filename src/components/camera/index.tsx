import { useMachine } from "@xstate/react";
import cv, { Mat } from "opencv-ts";
import { FunctionalComponent, h } from "preact";
import { useRef, useState } from "preact/hooks";
import { useSizes as useWindowDimensions } from "react-use-sizes";
import Webcam from "react-webcam";
import { useDidMount, useInterval } from "rooks";
import { assign, createMachine } from "xstate";

const machine = createMachine({
  id: "toggle",
  initial: "initializing",
  states: {
    initializing: {
      type: "parallel",
      states: {
        opencv: {
          initial: "ready",
          states: {
            waiting: {
              on: { RUNTIME_INITIALIZED: "ready" },
            },
            ready: {
              type: "final",
            },
          },
        },
        camera: {
          initial: "waiting",
          states: {
            waiting: {
              on: { WEBCAM_READY: "ready" },
            },
            ready: {
              type: "final",
            },
          },
        },
      },
      onDone: { target: "detecting" },
    },
    detecting: {
      entry: ['initialize'],
      exit: ['cleanup'],
      on: {
        TOGGLE: "paused",
      },
      initial: "idle",
      states: {
        idle: {
          on: {
            SCAN: "scanning",
          },
        },
        scanning: {
          invoke: {
            src: "detect",
            onDone: "idle",
          },
        },
      },
    },
    paused: {
      tags: "paused",
      on: {
        TOGGLE: "detecting",
      },
    },
  },
});

const SetCamera: FunctionalComponent = () => {
  const webcamRef = useRef(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const thresholdRef = useRef(null);
  const overlayRef = useRef(null);
  const [state, send] = useMachine(machine, {
    devTools: true,
    actions: {
      initialize: assign(() => {
        // @ts-ignore
        // const video = webcamRef.current.base;
        const video = videoRef.current;
        const src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
        const cap = new cv.VideoCapture(video);
        cap.read(src);
        return { src, cap };
      }),
      cleanup: (context) => {
        context.src.delete();
      },
    },
    services: {
      detect: (context) => {
        
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
        cv.GaussianBlur(
          dst,
          dst,
          new cv.Size(5, 5),
          1000,
          0,
          cv.BORDER_DEFAULT
        );
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
      },
    },
  });
  
  const [{width: videoWidth, height: videoHeight}, setVideoSize] = useState({width: 0, height: 0});

  const constraints: MediaStreamConstraints = {
    video: {
      width: { ideal: 4096 },
      height: { ideal: 2160 } ,
    facingMode: { exact: "environment" },
  } 
  }

  useDidMount(() => {
    cv.onRuntimeInitialized = () => send("RUNTIME_INITIALIZED");
  });

  useDidMount(() => {
    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function (stream) {
          const {width, height} = stream.getVideoTracks()[0].getSettings()
          const MAX = 600;
          const scale = Math.min(MAX / width!, MAX / height!);
          setVideoSize({width: width! * scale, height: height! * scale})
          videoRef.current.srcObject = stream;
        })
        .catch(function (error) {
          console.error(error);
        });
    }
  });

  const FPS = 5;
  // useRaf(() => send("SCAN"), true);
  useInterval(() => send("SCAN"), 1000 / FPS, true);

  return (
    <div>
      {/* <Webcam
        id="live-video"
        style={{
          position: "absolute",
          width: "100vw",
          height: "100vh",
        }}
        audio={false}
        //@ts-ignore
        ref={webcamRef}
        width={width * scale}
        height={height * scale}
        videoConstraints={videoConstraints}
        onUserMedia={(stream) => {
          console.log(navigator.mediaDevices.getSupportedConstraints())
          console.log({settings: stream.getVideoTracks()[0].getSettings()})
          send("WEBCAM_READY");
        }}
      /> */}
      <video
        autoPlay={true}
        style={{
          position: "absolute",
          width: "100vw",
          height: "100vh",
          background: "black"
        }}
        ref={videoRef}
        width={videoWidth}
        height={videoHeight}
        onLoadedMetadata={() => send("WEBCAM_READY")}
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
              minHeight: "150px",
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
              minHeight: "150px",
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
        <p>State: {JSON.stringify(state.value, null, 2)}</p>
        <p>Video Dimensions: {JSON.stringify({ videoWidth, videoHeight }, null, 2)}</p>
        <button onClick={() => send("TOGGLE")}>
          {state.hasTag("paused") ? "Resume" : "Pause"}
        </button>
      </div>
    </div>
  );
};

export default SetCamera;
