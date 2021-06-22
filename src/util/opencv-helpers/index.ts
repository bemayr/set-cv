export function extractContours(
  image: any,
  mode: any,
  method: any
): {result: { contours: cv.Mat[]; hierarchy: cv.Mat }, cleanup: () => void} {
  const cnts = new cv.MatVector();
  const hierarchy: cv.Mat = new cv.Mat();
  const contours: cv.Mat[] = [];

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
