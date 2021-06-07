import { useMachine, useSelector } from "@xstate/react";
import cv, { Mat } from "opencv-ts";
import { FunctionalComponent, h } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { useSizes as useWindowDimensions } from "react-use-sizes";
import Webcam from "react-webcam";
import { useDidMount, useInterval } from "rooks";
import { assign, createMachine } from "xstate";
import { raise, send } from "xstate/lib/actions";
import { createModel } from "xstate/lib/model";
import { mapContext } from "xstate/lib/utils";
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
        target: [
          "initializing.opencv.history",
          "initializing.camera.startingCamera",
        ],
        actions: [
          "stopCameraStream",
          model.assign({
            orientation: (_, event) => event.orientation,
          })
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
                entry: [
                  "assignStreamDimension",
                  "assignVideoDimension",
                  "setVideoDimension",
                ],
                type: "final",
              },
            },
          },
        },
        onDone: { target: "detecting" },
      },
      detecting: {
        entry: [
          "detection.initialize",
        ],
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
      assignStreamDimension: assign(({ cameraStream }) => {
        const { width, height } = cameraStream
          .getVideoTracks()[0]
          .getSettings();
        return {
          streamDimension: {
            width: width!,
            height: height!,
          },
        };
      }),
      assignVideoDimension: assign(({ streamDimension, orientation }) => {
        const { width = 0, height = 0 } = streamDimension || {};
        const MAX = 600;
        const scale = Math.min(MAX / width!, MAX / height!);
        return {
          videoDimension: {
            width: width! * scale,
            height: height! * scale,
          },
        };
      }),
    },
  }
);

const SetCamera: FunctionalComponent = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const thresholdRef = useRef(null);
  const overlayRef = useRef(null);
  const cardRef = useRef(null);
  const initialOrientation = useOrientationChange((orientation) =>
    send(model.events.ORIENTATION_CHANGED(orientation))
  );
  const detectCards = useCallback((context: typeof model.initialContext) => {
    // @ts-ignore
    const video = videoRef.current;
    // console.log("after video");
    const src = context.src;
    // console.log("after src");
    const cap = new cv.VideoCapture(videoRef.current);
    // console.log("after cap");
    const dst = new cv.Mat(video.height, video.width, cv.CV_8UC1);
    // console.log("after dst");

    const cnts = new cv.MatVector();
    const hierarchy: Mat = new cv.Mat();

    // console.log("before cap.read");
    // console.log({ "video.size": { height: video.height, width: video.width } });
    // console.log(src);
    cap.read(src);
    // console.log("after cap.read");

    // start processing.
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
    // console.log("after cv.cvtColor");

    // --- FAR FROM IDEAL ---
    // cv.GaussianBlur(dst, dst, new cv.Size(1, 1), 1000, 0, cv.BORDER_DEFAULT)
    // cv.threshold(dst, dst, 120, 255, cv.THRESH_BINARY)

    // --- NOT IDEAL ---
    // cv.GaussianBlur(dst, dst, new cv.Size(5, 5), 1000, 0, cv.BORDER_DEFAULT);
    // cv.adaptiveThreshold(
    //   dst,
    //   dst,
    //   255,
    //   cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    //   cv.THRESH_BINARY,
    //   11,
    //   2
    // );

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

    cv.GaussianBlur(
      dst,
      dst,
      new cv.Size(5, 5),
      0,
      0,
      cv.BORDER_DEFAULT
    );
    cv.threshold(dst, dst, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
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
      .slice(0, 1);

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
      
      console.log({"approx.points.#": approx.size().height, contourArea: cv.contourArea(c)})
      cv.drawContours(
        overlay,
        // @ts-ignore
        test,
        0,
        new cv.Scalar(255, 0, 0, 255),
        5,
        cv.LINE_8
      );

      if(approx.size().height === 4) {
        const points = []
        for (let i = 0; i < 8; i = i + 2) points.push(new cv.Point(approx.data32S[i], approx.data32S[i + 1]));

        points.sort((p1, p2) => (p1.y < p2.y) ? -1 : (p1.y > p2.y) ? 1 : 0).slice(0, 5);

        //Determine left/right based on x position of top and bottom 2
        let tl = points[0].x < points[1].x ? points[0] : points[1];
        let tr = points[0].x > points[1].x ? points[0] : points[1];
        let bl = points[2].x < points[3].x ? points[2] : points[3];
        let br = points[2].x > points[3].x ? points[2] : points[3];

        console.log({tl, tr, bl, br})
        // cv.circle(overlay, tl, 10, new cv.Scalar(255, 255, 0, 255), 5);
        // cv.circle(overlay, tr, 10, new cv.Scalar(0, 255, 255, 255), 5);
        // cv.circle(overlay, br, 10, new cv.Scalar(255, 0, 255, 255), 5);
        // cv.circle(overlay, bl, 10, new cv.Scalar(255, 255, 255, 255), 5);

        let theta = Math.atan2(bl.y - tl.y, bl.x - tl.x)
        theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
        console.log({theta})

        // const tlbl = Math.hypot(tl.x - bl.x, tl.y - bl.y)
        // const tltr = Math.hypot(tl.x - tr.x, tl.y - tr.y)
        // console.log({tlbl, tltr})

        const distance12 = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
        const distance13 = Math.hypot(points[0].x - points[2].x, points[0].y - points[2].y)
        console.log({"tl is [0]": tl === points[0], shift: distance12 > distance13})

        const corners = distance12 > distance13
        ? [tr, br, bl, tl] : [tl, tr, br, bl];
        cv.circle(overlay, corners[0], 10, new cv.Scalar(255, 255, 0, 255), 5);
        cv.circle(overlay, corners[1], 10, new cv.Scalar(0, 255, 255, 255), 5);
        cv.circle(overlay, corners[2], 10, new cv.Scalar(255, 0, 255, 255), 5);
        cv.circle(overlay, corners[3], 10, new cv.Scalar(255, 255, 255, 255), 5);

        const from = corners.reduce((result, current) => ([...result, current.x, current.y]), [] as number[])

        let card = new cv.Mat();
        let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, from);
        let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 200, 0, 200, 310, 0, 310]);
        let M = cv.getPerspectiveTransform(srcTri, dstTri);
        let dsize = new cv.Size(200, 310);
        // You can try more different parameters
        cv.warpPerspective(src, card, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
        cv.imshow(cardRef.current!, card);
        
        // console.log(points)
      }

      const rotatedRect = cv.minAreaRect(c);
      const vertices = cv.RotatedRect.points(rotatedRect);
      let angle = rotatedRect.angle;
      if (rotatedRect.size.width < rotatedRect.size.height) {
        angle = angle - 90;
      }
      console.log({width: rotatedRect.size.width, height: rotatedRect.size.height})
      console.log({angle: angle})
      for (let i = 0; i < 4; i++) {
          cv.line(overlay, vertices[i], vertices[(i + 1) % 4], new cv.Scalar(0, 0, 255, 255), 2, cv.LINE_AA, 0);
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
      setVideoDimension: ({ videoDimension: { width, height } }) => {
        videoRef.current.width = width;
        videoRef.current.height = height;
      },
      startVideo: ({ cameraStream }) =>
        (videoRef.current.srcObject = cameraStream),
      "detection.initialize": assign({
        src: ({ videoDimension: { width, height } }: any) =>
          new cv.Mat(height, width, cv.CV_8UC4),
        cap: () => new cv.VideoCapture(videoRef.current),
      }),
      // "detection.initialize": assign(
      //   ({ videoDimension: { width, height } }) => {
      //     const src = new cv.Mat(height, width, cv.CV_8UC4);
      //     const cap = new cv.VideoCapture(videoRef.current);
      //     // console.log(`detection intialized width:${width}, height:${height}`)
      //     return { src, cap };
      //   }
      // ),
      "detection.finalize": assign({
        src: ({ src }) => {
          src.delete();
          return src;
        },
      }),
    },
    services: {
      startCamera: async ({ selectedCamera }) =>
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 4096 },
            height: { ideal: 2160 },
            deviceId: { exact: selectedCamera },
          },
        }),
      detectCards: detectCards,
      // detectCards: () => Promise.resolve(),
    },
  });
  const streamDimensions = useSelector(
    service,
    (state) => state.context.streamDimension
  );
  const videoDimensions = useSelector(
    service,
    (state) => state.context.videoDimension
  );
  const orientation = useSelector(
    service,
    (state) => state.context.orientation
  );
  const selectedCamera = useSelector(
    service,
    (state) => state.context.selectedCamera
  );

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

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  useDidMount(() =>
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) =>
        setCameras(devices.filter(({ kind }) => kind === "videoinput"))
      )
  );

  const FPS = 1;
  // useRaf(() => send("SCAN"), true);
  useInterval(() => send("DETECT"), 1000 / FPS, true);

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
        // width={videoDimensions.width}
        // height={videoDimensions.height}
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
        <div
          style={{
            margin: "10px",
          }}
        >
          <p style={{ margin: "2px" }}>Mask</p>
          <canvas
            ref={cardRef}
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
          fontSize: "8px",
        }}
      >
        {/* <p>State: {JSON.stringify(state.value, null, 2)}</p> */}
        {/* <p>Context: {JSON.stringify(state.context, null, 2)}</p> */}
        <div>Stream Dimensions: {JSON.stringify(streamDimensions, null, 2)}</div>
        <div>Video Dimensions: {JSON.stringify(videoDimensions, null, 2)}</div>
        <div>Orientation: {orientation}</div>
        {/* {cameras.map((camera) => (
          <div key={camera.deviceId} value={camera.deviceId}>
            {camera.label}
          </div>
        ))} */}
        {/* <button onClick={() => send("TOGGLE")}>
          {state.hasTag("paused") ? "Resume" : "Pause"}
        </button> */}
        <div>
          <select
            value={selectedCamera}
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
