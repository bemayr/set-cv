// @ts-nocheck

import Spinner from "@flatlinediver/react-spinner";
import Flex from "@react-css/flex";
import { Fab } from "@rmwc/fab";
import { FunctionalComponent, h } from "preact";
import CameraSelect from "./components/CameraSelect";
import TimeoutSelect from "./components/TimeoutSelect";
import style from "./style.css";

interface ControlProps {
  masterState: "stopped" | "running",
  isInitializing: boolean,
  toggleMasterState: () => void,
  cameraSelected: (camera: MediaDeviceInfo) => void
  timeoutSelected: (timeout: number | "none") => void
}

const Controls: FunctionalComponent<ControlProps> = (props) => {
  const isStopped = props.masterState === "stopped"

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
        {props.isInitializing && <Spinner colors={["red", "green", "purple"]} size={40} thick />}
      </Flex.Item>
      <Flex row style={{ margin: "2em" }} justifySpaceBetween alignItemsCenter>
        {isStopped && <CameraSelect selectedCamera={undefined} cameraSelected={props.cameraSelected} />}
        <Fab
          style={{ margin: "2em" }}
          label={isStopped ? "Start" : "Stop"}
          theme={["primaryBg", "onPrimary"]}
          onClick={props.toggleMasterState}
        />
        {isStopped && <TimeoutSelect selectedTimeout="none" timeoutSelected={props.timeoutSelected} />}
      </Flex>
    </Flex>
  );
};

export default Controls;
