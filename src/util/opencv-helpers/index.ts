import cv, { Mat, Scalar } from "opencv-ts";
import { LineTypes } from "opencv-ts/src/ImageProcessing/DrawingFunctions";
import {
  ContourApproximationModes,
  RetrievalModes,
} from "opencv-ts/src/ImageProcessing/Shape";

export function extractContours(
  image: Mat,
  mode: RetrievalModes,
  method: ContourApproximationModes
): {result: { contours: Mat[]; hierarchy: Mat }, cleanup: () => void} {
  const cnts = new cv.MatVector();
  const hierarchy: Mat = new cv.Mat();
  const contours: Mat[] = [];

  // @ts-ignore
  cv.findContours(image, cnts, hierarchy, mode, method);
  // @ts-ignore
  for (let i = 0; i < cnts.size(); ++i) contours.push(cnts.get(i));

  return {
    result: {
      contours,
      hierarchy,
    },
    cleanup: () => {
      cnts.delete();
      hierarchy.delete();
    },
  };
}

export function drawMat(
  mat: Mat,
  on: Mat,
  color: Scalar,
  thickness: number = 5,
  lineType: LineTypes = cv.LINE_8
) {
  const matVec = new cv.MatVector();
  matVec.push_back(mat);

  cv.drawContours(
    on,
    // @ts-ignore
    matVec,
    -1,
    color,
    thickness,
    lineType
  );
}
