import { Fab } from "@rmwc/fab";
import { MenuItem, SimpleMenu } from "@rmwc/menu";
import { FunctionalComponent, h } from "preact";
import style from "./style.css";

const Controls: FunctionalComponent = () => {
  return (
    <div class={style.controls}>
      <img class={style.logo} src="/assets/logo.png" />
      <SimpleMenu handle={<Fab icon="videocam" mini />}>
        <MenuItem>Cookies</MenuItem>
        <MenuItem>Pizza</MenuItem>
        <MenuItem><b>Test</b></MenuItem>
        
      </SimpleMenu>
      <Fab label="Start" theme={['primaryBg', 'onPrimary']} />
      <SimpleMenu handle={<Fab icon="hourglass_top" mini />}>
        <MenuItem>Cookies</MenuItem>
        <MenuItem>Pizza</MenuItem>
        <MenuItem><b>Test</b></MenuItem>
        
      </SimpleMenu>
    </div>
  );
};

export default Controls;
