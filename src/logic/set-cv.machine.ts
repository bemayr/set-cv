import { raise, send } from "xstate/lib/actions";
import { assign, createMachine } from "xstate";
import { assertEvent } from "xstate-helpers";
import { createModel } from "xstate/lib/model";
import { Set } from "../types/set";
import { Orientation } from "../util/hooks/use-orientation-change";

export const model = createModel(
  {
    selectedCamera: undefined as undefined | string,
    cameraStream: undefined as any as MediaStream,
    streamDimension: undefined as undefined | { width: number; height: number },
    videoDimension: { width: 0, height: 0 },
    orientation: "landscape" as Orientation,
    reportTimeout: 30000,
    fps: 3,
    detectedSets: [] as Set[],
    visibleSets: [] as Set[],
  },
  {
    events: {
      CAMERA_SELECTED: (deviceId: string) => ({ deviceId }),
      CAMERA_READY: () => ({}),
      ORIENTATION_CHANGED: (orientation: Orientation) => ({ orientation }),
      TOGGLE_MASTER: () => ({}),
      SET_REPORT_TIMEOUT: (timeout: number) => ({ timeout }),
      DETECTION_DONE: () => ({}),
      RECHECK_VISIBLE_SETS: () => ({}),
      "done.invoke.waitingForCameraStream": (data: MediaStream) => ({ data }),
      "done.invoke.detectSets": (sets: Set[]) => ({ sets }),
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
      master: {
        initial: "stopped",
        states: {
          stopped: {
            tags: "master-stopped",
            on: {
              TOGGLE_MASTER: "running",
              SET_REPORT_TIMEOUT: {
                actions: "setReportTimeout",
              },
            },
          },
          running: {
            tags: "master-running",
            on: {
              TOGGLE_MASTER: "stopped",
            },
            type: "parallel",
            states: {
              detection: {
                initial: "idle",
                states: {
                  idle: {
                    after: {
                      FPS_ELAPSED: "detecting",
                    },
                  },
                  detecting: {
                    invoke: {
                      id: "detectSets",
                      src: "detectSets",
                      onDone: {
                        target: "idle",
                        actions: ["setDetectedSets", raise("DETECTION_DONE")],
                      },
                    },
                  },
                },
              },
              reporting: {
                on: {
                  RECHECK_VISIBLE_SETS: ".initial",
                },
                initial: "initial",
                states: {
                  initial: {
                    always: [
                      { target: "setVisible", cond: "isSetVisible" },
                      { target: "noSetVisible" },
                    ],
                  },
                  noSetVisible: {
                    on: {
                      DETECTION_DONE: {
                        target: "setVisible",
                        cond: "isSetVisible",
                      },
                    },
                  },
                  setVisible: {
                    after: {
                      REPORT_TIMEOUT_ELAPSED: {
                        actions: "reportSet",
                      },
                    },
                    initial: "sure",
                    states: {
                      sure: {
                        on: {
                          DETECTION_DONE: {
                            target: "unsure",
                            cond: "detected==visible",
                          },
                        },
                      },
                      unsure: {
                        on: {
                          DETECTION_DONE: {
                            target: "sure",
                            cond: "detected!=visible",
                          },
                        },
                        after: {
                          5000: {
                            actions: [send("RECHECK_VISIBLE_SETS")]
                          }
                        }
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  {
    delays: {
      FPS_ELAPSED: ({ fps }) => 1000 / fps,
      REPORT_TIMEOUT_ELAPSED: ({ reportTimeout }) => reportTimeout,
    },
    guards: {
      isSetVisible: ({ visibleSets }) => visibleSets.length > 0,
    },
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
      assignVideoDimension: assign(({ streamDimension }) => {
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
      setReportTimeout: assign({
        reportTimeout: (_, event) => {
          assertEvent(event, "SET_REPORT_TIMEOUT");
          return event.timeout;
        },
      }),
      setDetectedSets: assign({
        detectedSets: (_, event) => {
          assertEvent(event, "done.invoke.detectSets");
          return event.sets;
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
    },
  }
);
