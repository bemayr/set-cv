import Flex from "@react-css/flex";
import { Fab } from "@rmwc/fab";
import { Icon } from "@rmwc/icon";
import { MenuItem, SimpleMenu } from "@rmwc/menu";
import { FunctionalComponent, h } from "preact";
import style from "./style.css";

const Controls: FunctionalComponent = () => {
  return (
    <Flex
      className={style.controls}
      column
      alignItemsCenter
      justifySpaceBetween
    >
      <Flex.Item>
        <img class={style.logo} src="/assets/logo.png" />
      </Flex.Item>
      <Flex.Item alignSelfCenter>
        <Icon icon="pending" />
      </Flex.Item>
      <Flex row>
        <SimpleMenu handle={<Fab icon="videocam" mini />}>
          <MenuItem>Cookies</MenuItem>
          <MenuItem>Pizza</MenuItem>
          <MenuItem>
            <b>Test</b>
          </MenuItem>
        </SimpleMenu>
        <Fab label="Start" theme={["primaryBg", "onPrimary"]} />
        <SimpleMenu handle={<Fab icon="hourglass_top" mini />}>
          <MenuItem>Cookies</MenuItem>
          <MenuItem>Pizza</MenuItem>
          <MenuItem>
            <b>Test</b>
          </MenuItem>
        </SimpleMenu>
      </Flex>
    </Flex>
  );
};

export default Controls;
