import Spinner from "@flatlinediver/react-spinner";
import Flex from "@react-css/flex";
import { Fab } from "@rmwc/fab";
import { Icon } from "@rmwc/icon";
import { useMachine } from "@xstate/react";
import { loadOpencv } from "mirada";
import { FunctionalComponent, h } from "preact";
import CameraSelect from "./components/CameraSelect";
import TimeoutSelect from "./components/TimeoutSelect";
import { loadOpenCV, loadSet, registerRuntimeInitializedHandler } from "./detect";
import { machine } from "./set-cv.machine";
import style from "./style.css";

const Controls: FunctionalComponent = () => {
  const [state, send, service] = useMachine(machine, {
    devTools: true,
    services: {
      loadOpenCV: () => loadOpencv({opencvJsLocation: "./assets/opencv.js"}),
    },
  });

  return (
    <Flex
      className={style.controls}
      column
      alignItemsCenter
      justifySpaceBetween
    >
      <Flex.Item style={{ margin: "2em" }}>
        <img class={style.logo} src="/assets/logo.png" />
      </Flex.Item>
      <Flex.Item alignSelfCenter>
        <Icon icon="pending" />
        <Spinner colors={["red", "green", "purple"]} size={40} thick />
      </Flex.Item>
      <Flex row style={{ margin: "2em" }} justifySpaceBetween alignItemsCenter>
        <CameraSelect selectedCamera={undefined} cameraSelected={console.log} />
        <Fab
          style={{ margin: "2em" }}
          label="Start"
          theme={["primaryBg", "onPrimary"]}
        />
        <TimeoutSelect selectedTimeout="none" timeoutSelected={console.log} />
      </Flex>
    </Flex>
  );
};

export default Controls;
