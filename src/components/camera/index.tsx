import cv, { Mat, Rect } from "opencv-ts";
import { createRef, FunctionalComponent, h } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { useSizes as useWindowDimensions } from "react-use-sizes";
import Webcam from "react-webcam";

const SetCamera: FunctionalComponent = () => {
  const [img, setImg] = useState("");
  const { windowSize } = useWindowDimensions();
  const webcamRef = createRef();

  const videoConstraints = {
    width: windowSize.width,
    height: windowSize.height,
    facingMode: { exact: "environment" },
  };

  // useEffect(() => {
  //   const worker = setTimeout(() => {
  //     const imageSrc = webcamRef.current.getScreenshot();
  //     document.getElementById("img")!.src = imageSrc
  //   }, 2000)

  //   return () => clearTimeout(worker)
  // }, [])

  useEffect(() => {
    const worker = setTimeout(() => {
      const imageSrc = webcamRef.current.getScreenshot();
      let element = document.createElement("img");
      // element.addEventListener("change", () => {
      //   console.log("changed")
      // })
      element.src = imageSrc
      // element.width = windowSize.width
      // element.height = windowSize.height
      // document.getElementById('preact_root')!.appendChild(element);
      //@ts-ignore
      // const imageSrc = webcamRef.current.getScreenshot();
      // document.getElementById("img")!.src = imageSrc
      setTimeout(() => {

        const src = cv.imread(element)
        console.log({src})
        
        const dst: Mat = new cv.Mat(src.cols, src.rows, cv.CV_8UC4);
        
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
        
        cv.imshow('drawing', dst);
      })
    }, 5000)

    return () => clearTimeout(worker)
  }, [])

  return (
    <div>

    <Webcam
      style={{ position: "absolute" }}
      screenshotFormat="image/jpeg"
      audio={false}
      //@ts-ignore
      ref={webcamRef}
      videoConstraints={videoConstraints}
      />
      <canvas style={{ position: "absolute" }} id="drawing"></canvas>
      <img id="img" src={img} style={{display: "none"}}></img>
      </div>
  );
};

export default SetCamera;
