import Spinner from "@flatlinediver/react-spinner";
import Flex from "@react-css/flex";
import { Fab } from "@rmwc/fab";
import { Icon } from "@rmwc/icon";
import { ListDivider } from "@rmwc/list";
import { MenuItem, SimpleMenu } from "@rmwc/menu";
import { FunctionalComponent, h } from "preact";
import CameraSelect from "./CameraSelect";
import style from "./style.css";
import TimeoutSelect from "./TimeoutSelect";

const Controls: FunctionalComponent = () => {
  return (
    <Flex
      className={style.controls}
      column
      alignItemsCenter
      justifySpaceBetween
    >
      <Flex.Item style={{margin: "2em"}}>
        <img class={style.logo} src="/assets/logo.png" />
      </Flex.Item>
      <Flex.Item alignSelfCenter>
        <Icon icon="pending" />
        <Spinner colors={["red", "green", "purple"]} size={40} thick />
      </Flex.Item>
      <Flex row style={{margin: "2em"}} justifySpaceBetween alignItemsCenter>
        <CameraSelect selectedCamera={undefined} cameraSelected={console.log} />
        <Fab style={{margin: "2em"}} label="Start" theme={["primaryBg", "onPrimary"]} />
        <TimeoutSelect selectedTimeout="none" timeoutSelected={console.log} />
      </Flex>
    </Flex>
  );
};

export default Controls;
