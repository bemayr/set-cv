// @ts-nocheck

import { Fab } from "@rmwc/fab";
import { MenuItem, SimpleMenu } from "@rmwc/menu";
import { useState } from "preact/hooks";
import { useDidMount } from "rooks";

export default function CameraSelect({
  selectedCamera,
  cameraSelected,
}: {
  selectedCamera: MediaDeviceInfo | undefined,
  cameraSelected: (camera: MediaDeviceInfo) => void;
}) {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  useDidMount(() =>
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) =>
        setCameras(devices.filter(({ kind }) => kind === "videoinput"))
      )
  );

  return (
    <SimpleMenu
      id="camera-select"
      handle={<Fab icon="videocam" mini disabled={cameras === []} />}
      onSelect={event => cameraSelected(cameras[event.detail.index])}
    >
      {cameras.map((camera) => (
        <MenuItem selected={camera === selectedCamera}>{camera.label}</MenuItem>
      ))}
    </SimpleMenu>
  );
}
