import { createMachine } from 'xstate';
import { createModel } from "xstate/lib/model";
import { Orientation } from "../../util/hooks/use-orientation-change";

const model = createModel(
    {
      
    },
  );

export const machine = createMachine<typeof model>({
    id: "set-cv",
    context: model.initialContext,
    type: 'parallel',
    states: {
        opencv: {
            initial: "loading",
            states: {
                loading: {
                    invoke: {
                        id: "loadOpenCV",
                        src: "loadOpenCV",
                        onDone: {
                            target: "initializing"
                        }
                    }
                },
                initializing: {
                    invoke: {
                        id: "initializeOpenCV",
                        src: "initializeOpenCV",
                        onDone: {
                            target: "ready"
                        }
                    }
                },
                ready: {
                    type: 'final'
                }
            }
        },
        camera: {},
        master: {}
    }
})
