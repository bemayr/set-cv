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

  useEffect(() => {
    const worker = setTimeout(() => {
      // Take Snapshot
      const imageSrc = webcamRef.current.getScreenshot();

      // Create temporary img-element for OpenCV
      let element = document.createElement("img");
      element.src = imageSrc;

      setTimeout(() => {
        // @ts-ignore
        const src = cv.imread(element);
        const dst: Mat = new cv.Mat(src.cols, src.rows, cv.CV_8UC4);

        cv.cvtColor(src, dst, cv.COLOR_BGR2GRAY);

        // --- FAR FROM IDEAL ---
        // cv.GaussianBlur(dst, dst, new cv.Size(1, 1), 1000, 0, cv.BORDER_DEFAULT)
        // cv.threshold(dst, dst, 120, 255, cv.THRESH_BINARY)

        // --- NOT IDEAL ---
        // cv.GaussianBlur(dst, dst, new cv.Size(1, 1), 1000, 0, cv.BORDER_DEFAULT)
        // cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2)

        // --- C++ Set Solution, not ideal as well ---
        // cv.normalize(dst, dst, 0, 255, cv.NORM_MINMAX)
        // cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 181, 10);

        cv.GaussianBlur(dst, dst, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
        cv.threshold(dst, dst, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

        const contours = [];
        const cnts = new cv.MatVector();
        const hierarchy: Mat = new cv.Mat();
        cv.findContours(
          dst,
          cnts,
          hierarchy,
          cv.RETR_TREE,
          cv.CHAIN_APPROX_TC89_L1
        );
        for (let i = 0; i < cnts.size(); ++i) contours.push(cnts.get(i));

        const result = [...contours]
          .sort((a, b) => cv.contourArea(b) - cv.contourArea(a))
          .slice(0, 81);

        let dst1 = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3)

        result.forEach((c, i) => {
          const temp = new cv.MatVector()
          temp.push_back(c)

          const peri = cv.arcLength(c, true)
          const approx = new cv.Mat();
          cv.approxPolyDP(c, approx, 0.04 * peri, true)

          if(approx.size().height === 4) {
            console.log(cv.contourArea(c));
            if(cv.contourArea(c) > 7000) {
              cv.drawContours(dst1, temp, 0, new cv.Scalar(255, 0, 0), 5, cv.LINE_8)
            }
            else {
              cv.drawContours(dst1, temp, 0, new cv.Scalar(0, 255, 0), 5, cv.LINE_8)
            }
          }
        });

        cv.imshow("drawing", dst1);
      });
    }, 5000);

    return () => clearTimeout(worker);
  }, []);

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
      <img id="img" src={img} style={{ display: "none" }}></img>
    </div>
  );
};

export default SetCamera;
