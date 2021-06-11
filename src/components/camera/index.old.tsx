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
} from "../../util/hooks/use-orientation-change";
import { drawMat, extractContours } from "../../util/opencv-helpers";
import combinations, { Card, cardToString, Color, Count, createCard, Fill, isSet, Shape } from "../../types/set";

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
    cards: [] as Card[]
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
          }),
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
              onDone: {
                target: "idle",
                actions: [
                  assign({
                    cards: (_, event) => event.data,
                  }),
                ],
              },
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
  const cardMaskRef = useRef(null);
  const initialOrientation = useOrientationChange((orientation) =>
    send(model.events.ORIENTATION_CHANGED(orientation))
  );
  const detectCards = useCallback((context: typeof model.initialContext) => {
    // @ts-ignore
    const video = videoRef.current;
    const src = context.src;
    const cap = new cv.VideoCapture(videoRef.current);
    const dst = new cv.Mat(video.height, video.width, cv.CV_8UC1);
    const overlay = new cv.Mat(
      src.rows,
      src.cols,
      cv.CV_8UC4,
      new cv.Scalar(0, 0, 0, 0)
    );

    cap.read(src);
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);

    cv.GaussianBlur(dst, dst, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    cv.threshold(dst, dst, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

    function byContourArea(first: Mat, second: Mat) {
      return cv.contourArea(second) - cv.contourArea(first);
    }

    function addApproximation(perimeterScale: number) {
      return function (contour: Mat): {
        contour: Mat;
        approximation: Mat;
      } {
        const perimeter = cv.arcLength(contour, true);
        const approximation = new cv.Mat();
        cv.approxPolyDP(
          contour,
          approximation,
          perimeter * perimeterScale,
          true
        );
        return { contour, approximation };
      };
    }

    function mightBeCard({ approximation }: { approximation: Mat }): boolean {
      const has4Corners = approximation.size().height === 4;
      const hasMinimumSize = cv.contourArea(approximation) > 500;
      const isConvex = cv.isContourConvex(approximation);
      return has4Corners && hasMinimumSize && isConvex;
    }

    function mightBeShape({ approximation }: { approximation: Mat }): boolean {
      const hasMinimumSize = cv.contourArea(approximation) > 2000;
      return hasMinimumSize;
    }

    // TODO: optimize
    function extractCard(src: Mat, approximation: Mat) {
      const points = [];
      for (let i = 0; i < 8; i = i + 2)
        points.push(
          new cv.Point(approximation.data32S[i], approximation.data32S[i + 1])
        );

      points
        .sort((p1, p2) => (p1.y < p2.y ? -1 : p1.y > p2.y ? 1 : 0))
        .slice(0, 5);

      //Determine left/right based on x position of top and bottom 2
      let tl = points[0].x < points[1].x ? points[0] : points[1];
      let tr = points[0].x > points[1].x ? points[0] : points[1];
      let bl = points[2].x < points[3].x ? points[2] : points[3];
      let br = points[2].x > points[3].x ? points[2] : points[3];

      const distance12 = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y
      );
      const distance13 = Math.hypot(
        points[0].x - points[2].x,
        points[0].y - points[2].y
      );

      const corners =
        distance12 > distance13 ? [tr, br, bl, tl] : [tl, tr, br, bl];

      const from = corners.reduce(
        (result, current) => [...result, current.x, current.y],
        [] as number[]
      );

      let card = new cv.Mat();
      // @ts-ignore
      let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, from);
      // @ts-ignore
      let dstTri = cv.matFromArray(
        4,
        1,
        cv.CV_32FC2,
        [0, 0, 200, 0, 200, 310, 0, 310]
      );
      // @ts-ignore
      let M = cv.getPerspectiveTransform(srcTri, dstTri);
      let dsize = new cv.Size(200, 310);
      // You can try more different parameters
      cv.warpPerspective(
        src,
        card,
        // @ts-ignore
        M,
        dsize,
        cv.INTER_LINEAR,
        cv.BORDER_CONSTANT,
        new cv.Scalar()
      );

      return card;
    }

    const {
      result: { contours },
      cleanup: cleanupCardContours,
    } = extractContours(dst, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    const cardContours = contours
      .sort(byContourArea)
      .map(addApproximation(0.04))
      .filter(mightBeCard)
      .slice(0, 18);

    const detectedCards = cardContours.map(({ contour, approximation }) => {
      drawMat(contour, overlay, new cv.Scalar(255, 0, 0, 255));
      drawMat(approximation, overlay, new cv.Scalar(0, 255, 0, 255));

      const card = extractCard(src, approximation);
      // cv.imshow(cardRef.current!, card);

      const cardMask = new cv.Mat(card.rows, card.cols, cv.CV_8UC1);
      const cardoverlay = new cv.Mat(
        cardMask.rows,
        cardMask.cols,
        cv.CV_8UC4,
        new cv.Scalar(0, 0, 0, 0)
      );

      cv.cvtColor(card, cardMask, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(
        cardMask,
        cardMask,
        new cv.Size(3, 3),
        0,
        0,
        cv.BORDER_DEFAULT
      );
      cv.threshold(
        cardMask,
        cardMask,
        120,
        255,
        cv.THRESH_BINARY_INV + cv.THRESH_OTSU
      );
      // cv.imshow(cardRef.current!, cardMask);

      const {
        result: { contours },
        cleanup: cleanupShapeContours,
      } = extractContours(cardMask, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      const shapeContours = contours
        .sort(byContourArea)
        .map(addApproximation(0.02))
        .filter(mightBeShape);

      shapeContours.forEach(({ approximation }) =>
        drawMat(approximation, cardoverlay, new cv.Scalar(255, 0, 0, 255))
      );

      type ApproximatedContours = {
        contour: Mat;
        approximation: Mat;
      }[];

      const detectedCard = createCard({
        count: extractCount(shapeContours),
        shape: extractShape(shapeContours),
        color: extractColor(card, cardMask),
        fill: extractFill(card, shapeContours),
      });

      function extractCount(contours: ApproximatedContours): Count | undefined {
        switch (contours.length) {
          case 1:
            return 1;
          case 2:
            return 2;
          case 3:
            return 3;
          default:
            return undefined;
        }
      }
      function extractShape(contours: ApproximatedContours): Shape | undefined {
        const approximation = contours[0]?.approximation;
        if (approximation === undefined) return undefined;
        if (!cv.isContourConvex(approximation)) return "squiggle";
        if (approximation.size().height === 4) return "diamond";
        return "oval";
      }
      function extractColor(card: Mat, mask: Mat): Color {
        // @ts-ignore
        const [red, green, blue] = cv.mean(card, mask);
        if (green > red && green > blue) return "green";
        if (red > green && red > blue) return "red";
        return "purple";
      }
      function extractFill(card: Mat, contours: ApproximatedContours): Fill {
        const gray = card.clone();
        cv.cvtColor(card, gray, cv.COLOR_RGBA2GRAY);
        cv.threshold(gray, gray, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

        let mask = new cv.Mat(
          card.rows,
          card.cols,
          cv.CV_8UC1,
          new cv.Scalar(0)
        );

        const contoursVec = new cv.MatVector();
        contours.forEach(({ contour }) => contoursVec.push_back(contour));

        // Fill Shapes
        cv.drawContours(
          mask,
          // @ts-ignore
          contoursVec,
          -1,
          new cv.Scalar(255),
          cv.FILLED
        );
        // Erase Contours
        cv.drawContours(
          mask,
          // @ts-ignore
          contoursVec,
          -1,
          new cv.Scalar(0),
          10,
          cv.LINE_8
        );

        cv.imshow(cardRef.current!, gray);
        cv.imshow(cardMaskRef.current!, mask);

        // @ts-ignore
        const mean = cv.mean(gray, mask)[0];
        gray.delete();
        mask.delete();

        if (mean < 10) return "solid";
        if (mean > 245) return "blank";
        return "striped";
      }

      // cv.imshow(cardMaskRef.current!, cardoverlay);

      shapeContours.forEach(({ contour, approximation }) => {
        contour.delete();
        approximation.delete();
      });

      cleanupShapeContours();

      contour.delete();
      approximation.delete();

      return detectedCard;
    });

    // cv.imshow(canvasRef.current!, dst);
    cv.imshow(thresholdRef.current!, dst);
    cv.imshow(overlayRef.current!, overlay);

    overlay.delete();
    dst.delete();
    cleanupCardContours();

    const result = detectedCards.filter((card) => card !== undefined) as Card[];

    const sets = combinations(result, 3)
    .map(possibleSet => ({possibleSet, isSet: isSet(possibleSet as [Card, Card, Card])}))
    .filter(({isSet}) => isSet)

    console.log(sets)
    
    return Promise.resolve(result);
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
            width: 1920,
            height: 1080,
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
          <p style={{ margin: "2px" }}>Overlay</p>
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
          <p style={{ margin: "2px" }}>Card Threshold</p>
          <canvas
            ref={cardRef}
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
          <p style={{ margin: "2px" }}>Card Mask</p>
          <canvas
            ref={cardMaskRef}
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
          fontSize: "16px",
        }}
      >
        {/* <p>State: {JSON.stringify(state.value, null, 2)}</p> */}
        {/* <p>Context: {JSON.stringify(state.context, null, 2)}</p> */}
        <div>
          Stream Dimensions: {JSON.stringify(streamDimensions, null, 2)}
        </div>
        <div>Video Dimensions: {JSON.stringify(videoDimensions, null, 2)}</div>
        <div>Orientation: {orientation}</div>
        <div><b>Detected Cards: {JSON.stringify(state.context.cards.map(cardToString), null, 2)}</b></div>
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
