import { useService } from "@xstate/react";
import cv, { Mat, Rect } from "opencv-ts";
import { createRef, FunctionalComponent, h } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { useSizes as useWindowDimensions } from "react-use-sizes";
import Webcam from "react-webcam";
import { createMachine, interpret } from "xstate";

// @ts-ignore
// // Module = {
// //   onRuntimeInitialized() {
// //     setTimeout(() => {
// //       // this is our application:
// //       console.log(cv.getBuildInformation());
// //     }, 0);
// //   },
// // };

const toggleMachine = createMachine({
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
              type: "final"
            }
          }
        },
        camera: {
          initial: "waiting",
          states: {
            waiting: {
              on: { WEBCAM_READY: "ready" },
            },
            ready: {
              type: "final"
            }
          }
        },
      },
      onDone: "idle"
    },
    idle: {},
  },
});

const service = interpret(toggleMachine);
service.start();

cv.onRuntimeInitialized = () => service.send("RUNTIME_INITIALIZED");

const SetCamera: FunctionalComponent = () => {
  const [rect] = useState(new cv.Rect(0, 0, 200, 200));
  const [img, setImg] = useState("");
  const [state, send] = useService(service);
  const { windowSize } = useWindowDimensions();
  const webcamRef = useRef(null);

  const videoConstraints = {
    width: windowSize.width,
    height: windowSize.height,
    facingMode: { exact: "environment" },
  };

  useEffect(() => {
    // const video = document.getElementById('live-video');
    // console.log({video, webcam: webcamRef.current.base})

    setTimeout(() => {
      console.log({webcam: webcamRef})
      // @ts-ignore
      const video = webcamRef.current.base;
      const src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
      const dst = new cv.Mat(video.height, video.width, cv.CV_8UC1);
      const cap = new cv.VideoCapture(video);

      const FPS = 30;
      function processVideo() {
        try {
          let begin = Date.now();
          // start processing.
          cap.read(src);
          cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
          cv.imshow("drawing", dst);
          // schedule the next one.
          let delay = 1000 / FPS - (Date.now() - begin);
          setTimeout(processVideo, delay);
        } catch (err) {
          console.error(err);
        }
      }

      processVideo();
    }, 3000);

    // return () => {
    //   src.delete();
    //   dst.delete();
    // };
  }, []);

  // useEffect(() => {
  //   const worker = setInterval(() => {
  //     // Take Snapshot
  //     const imageSrc = webcamRef.current.getScreenshot();

  //     // Create temporary img-element for OpenCV
  //     let element = document.createElement("img");
  //     element.src = imageSrc;

  //     setTimeout(() => {
  //       // @ts-ignore
  //       const src = cv.imread(element);
  //       const dst: Mat = new cv.Mat(src.cols, src.rows, cv.CV_8UC4);

  //       cv.cvtColor(src, dst, cv.COLOR_BGR2GRAY);

  //       // --- FAR FROM IDEAL ---
  //       // cv.GaussianBlur(dst, dst, new cv.Size(1, 1), 1000, 0, cv.BORDER_DEFAULT)
  //       // cv.threshold(dst, dst, 120, 255, cv.THRESH_BINARY)

  //       // --- NOT IDEAL ---
  //       // cv.GaussianBlur(dst, dst, new cv.Size(1, 1), 1000, 0, cv.BORDER_DEFAULT)
  //       // cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2)

  //       // --- C++ Set Solution, not ideal as well ---
  //       // cv.normalize(dst, dst, 0, 255, cv.NORM_MINMAX)
  //       // cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 181, 10);

  //       cv.GaussianBlur(dst, dst, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
  //       cv.threshold(dst, dst, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

  //       const contours = [];
  //       const cnts = new cv.MatVector();
  //       const hierarchy: Mat = new cv.Mat();
  //       cv.findContours(
  //         dst,
  //         // @ts-ignore
  //         cnts,
  //         hierarchy,
  //         cv.RETR_TREE,
  //         cv.CHAIN_APPROX_TC89_L1
  //       );
  //       // @ts-ignore
  //       for (let i = 0; i < cnts.size(); ++i) contours.push(cnts.get(i));

  //       const result = [...contours]
  //         .sort((a, b) => cv.contourArea(b) - cv.contourArea(a))
  //         .slice(0, 18);

  //       let dst1 = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3)

  //       result.forEach((c, i) => {
  //         const temp = new cv.MatVector()
  //         temp.push_back(c)

  //         const peri = cv.arcLength(c, true)
  //         const approx = new cv.Mat();
  //         cv.approxPolyDP(c, approx, 0.04 * peri, true)

  //         if(approx.size().height === 4) {
  //           console.log(cv.contourArea(c));
  //           if(cv.contourArea(c) > 7000) {
  //             // @ts-ignore
  //             cv.drawContours(dst1, temp, 0, new cv.Scalar(255, 0, 0), 5, cv.LINE_8)
  //           }
  //           else {
  //             // @ts-ignore
  //             cv.drawContours(dst1, temp, 0, new cv.Scalar(0, 255, 0), 5, cv.LINE_8)
  //           }
  //         }
  //       });

  //       cv.imshow("drawing", dst1);

  //       src.delete();
  //       cnts.delete();
  //       hierarchy.delete();
  //       dst.delete();
  //       dst1.delete();
  //     });
  //   }, 1000);

  //   return () => clearInterval(worker);
  // }, []);

  return (
    <div>
      <Webcam
        id="live-video"
        style={{ position: "absolute" }}
        screenshotFormat="image/jpeg"
        audio={false}
        //@ts-ignore
        ref={webcamRef}
        width={windowSize.width}
        height={windowSize.height}
        videoConstraints={videoConstraints}
        onUserMedia={() => send("WEBCAM_READY")}
      />
      <canvas
        style={{ position: "absolute", opacity: 0.5 }}
        id="drawing"
      ></canvas>
      <p
        style={{ position: "absolute", color: "white" }}
      >{JSON.stringify(state.value, null, 2)}</p>
      <img id="img" src={img} style={{ display: "none" }}></img>
    </div>
  );
};

export default SetCamera;
