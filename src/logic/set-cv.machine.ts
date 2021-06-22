import { assign, createMachine } from "xstate";
import { createModel } from "xstate/lib/model";
import { Orientation } from "../util/hooks/use-orientation-change";

export const model = createModel(
  {
    selectedCamera: undefined as undefined | string,
    cameraStream: undefined as any as MediaStream,
    streamDimension: undefined as undefined | { width: number; height: number },
    videoDimension: { width: 0, height: 0 },
    orientation: "landscape" as Orientation,
  },
  {
    events: {
      CAMERA_SELECTED: (deviceId: string) => ({ deviceId }),
      CAMERA_READY: () => ({}),
      ORIENTATION_CHANGED: (orientation: Orientation) => ({ orientation }),
      "done.invoke.waitingForCameraStream": (data: MediaStream) => ({ data }),
    },
  }
);

export const machine = createMachine<typeof model>(
  {
    id: "set-cv",
    context: model.initialContext,
    type: "parallel",
    on: {
      CAMERA_SELECTED: {
        target: ["opencv.history", "camera.startingCamera"],
        actions: [
          "stopCameraStream",
          model.assign({
            selectedCamera: (_, event) => event.deviceId,
          }),
        ],
      },
      ORIENTATION_CHANGED: {
        target: ["opencv.history", "camera.startingCamera"],
        actions: [
          "stopCameraStream",
          model.assign({
            orientation: (_, event) => event.orientation,
          }),
        ],
      },
    },
    states: {
      opencv: {
        initial: "loading",
        states: {
          history: {
            type: "history",
          },
          loading: {
            invoke: {
              id: "loadOpenCV",
              src: "loadOpenCV",
              onDone: {
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
      master: {},
    },
  },
  {
    actions: {
      stopCameraStream: ({ cameraStream }) => {
        if (cameraStream !== undefined)
          cameraStream.getTracks().forEach((track) => track.stop());
      },
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
    },
  }
);
