// @ts-nocheck

import { Fab } from "@rmwc/fab";
import { ListDivider } from "@rmwc/list";
import { MenuItem, SimpleMenu } from "@rmwc/menu";

const timeouts: [number, string][] = [
  [15000, "15s"],
  [30000, "30s"],
  [60000, "1m"],
];

export default function TimeoutSelect({
  selectedTimeout,
  timeoutSelected,
}: {
  selectedTimeout: "none" | number;
  timeoutSelected: (camera: "none" | number) => void;
}) {
  return (
    <SimpleMenu handle={<Fab icon="hourglass_top" mini />}>
      <MenuItem
        selected={selectedTimeout === "none"}
        onClick={() => timeoutSelected("none")}
      >
        off
      </MenuItem>
      <ListDivider />
      {timeouts.map(([timeout, label]) => (
        <MenuItem
          selected={selectedTimeout === timeout}
          onClick={() => timeoutSelected(timeout)}
        >
          {label}
        </MenuItem>
      ))}
    </SimpleMenu>
  );
}
