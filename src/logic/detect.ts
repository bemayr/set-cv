// @ts-nocheck

import { Ref } from "preact/hooks";
import combinations, {
  Card,
  Color,
  Count,
  createCard,
  Fill,
  isSet,
  Shape,
} from "../types/set";
import { extractContours } from "../util/opencv-helpers";
import { machine } from "./set-cv.machine";

export function makeDetectSets(videoRef: Ref<HTMLVideoElement>) {
  return function detectSets(context: typeof machine.context) {
    // @ts-ignore
    const video = videoRef.current;
    const src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    const cap = new cv.VideoCapture(videoRef.current);
    const dst = new cv.Mat(video.height, video.width, cv.CV_8UC1);

    console.log(src.rows)

    cap.read(src);
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);

    cv.GaussianBlur(dst, dst, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    cv.threshold(dst, dst, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

    function byContourArea(first: cv.Mat, second: cv.Mat) {
      return cv.contourArea(second) - cv.contourArea(first);
    }

    function addApproximation(perimeterScale: number) {
      return function (contour: cv.Mat): {
        contour: cv.Mat;
        approximation: cv.Mat;
      } {
        const perimeter = cv.arcLength(contour, true);
        const approximation = new cv.Mat();
        cv.approxPolyDP(
          contour,
          approximation,
          perimeter * perimeterScale,
          true
        );
        return { contour, approximation };
      };
    }

    function mightBeCard({
      approximation,
    }: {
      approximation: cv.Mat;
    }): boolean {
      const has4Corners = approximation.size().height === 4;
      const hasMinimumSize = cv.contourArea(approximation) > 500;
      const isConvex = cv.isContourConvex(approximation);
      return has4Corners && hasMinimumSize && isConvex;
    }

    function mightBeShape({
      approximation,
    }: {
      approximation: cv.Mat;
    }): boolean {
      const hasMinimumSize = cv.contourArea(approximation) > 2000;
      return hasMinimumSize;
    }

    // TODO: optimize
    function extractCard(src: cv.Mat, approximation: cv.Mat) {
      const points = [];
      for (let i = 0; i < 8; i = i + 2)
        points.push(
          new cv.Point(approximation.data32S[i], approximation.data32S[i + 1])
        );

      points
        .sort((p1, p2) => (p1.y < p2.y ? -1 : p1.y > p2.y ? 1 : 0))
        .slice(0, 5);

      //Determine left/right based on x position of top and bottom 2
      let tl = points[0].x < points[1].x ? points[0] : points[1];
      let tr = points[0].x > points[1].x ? points[0] : points[1];
      let bl = points[2].x < points[3].x ? points[2] : points[3];
      let br = points[2].x > points[3].x ? points[2] : points[3];

      const distance12 = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y
      );
      const distance13 = Math.hypot(
        points[0].x - points[2].x,
        points[0].y - points[2].y
      );

      const corners =
        distance12 > distance13 ? [tr, br, bl, tl] : [tl, tr, br, bl];

      const from = corners.reduce(
        (result, current) => [...result, current.x, current.y],
        [] as number[]
      );

      let card = new cv.Mat();
      // @ts-ignore
      let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, from);
      // @ts-ignore
      let dstTri = cv.matFromArray(
        4,
        1,
        cv.CV_32FC2,
        [0, 0, 200, 0, 200, 310, 0, 310]
      );
      // @ts-ignore
      let M = cv.getPerspectiveTransform(srcTri, dstTri);
      let dsize = new cv.Size(200, 310);
      // You can try more different parameters
      cv.warpPerspective(
        src,
        card,
        // @ts-ignore
        M,
        dsize,
        cv.INTER_LINEAR,
        cv.BORDER_CONSTANT,
        new cv.Scalar()
      );

      return card;
    }

    const {
      result: { contours },
      cleanup: cleanupCardContours,
    } = extractContours(dst, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    const cardContours = contours
      .sort(byContourArea)
      .map(addApproximation(0.04))
      .filter(mightBeCard)
      .slice(0, 18);

    const detectedCards = cardContours.map(({ contour, approximation }) => {
      const card = extractCard(src, approximation);

      const cardMask = new cv.Mat(card.rows, card.cols, cv.CV_8UC1);

      cv.cvtColor(card, cardMask, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(
        cardMask,
        cardMask,
        new cv.Size(3, 3),
        0,
        0,
        cv.BORDER_DEFAULT
      );
      cv.threshold(
        cardMask,
        cardMask,
        120,
        255,
        cv.THRESH_BINARY_INV + cv.THRESH_OTSU
      );
      // cv.imshow(cardRef.current!, cardMask);

      const {
        result: { contours },
        cleanup: cleanupShapeContours,
      } = extractContours(cardMask, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      cardMask.delete()

      const shapeContours = contours
        .sort(byContourArea)
        .map(addApproximation(0.02))
        .filter(mightBeShape);

      type ApproximatedContours = {
        contour: cv.Mat;
        approximation: cv.Mat;
      }[];

      const detectedCard = createCard({
        count: extractCount(shapeContours),
        shape: extractShape(shapeContours),
        color: extractColor(card, shapeContours),
        fill: extractFill(card, shapeContours),
      });

      function extractCount(contours: ApproximatedContours): Count | undefined {
        switch (contours.length) {
          case 1:
            return 1;
          case 2:
            return 2;
          case 3:
            return 3;
          default:
            return undefined;
        }
      }
      function extractShape(contours: ApproximatedContours): Shape | undefined {
        const approximation = contours[0]?.approximation;
        if (approximation === undefined) return undefined;
        // console.log(!cv.isContourConvex(approximation))
        if (!cv.isContourConvex(approximation)) return "squiggle";
        if (approximation.size().height === 4) return "diamond";
        return "oval";
      }
      function createMask(
        card: cv.Mat,
        contours: ApproximatedContours,
        mode: "fill" | "border" = "fill",
        invert: boolean = false,
        includeShapeBorder: boolean = false
      ): cv.Mat {
        let line_width = 10

        const contoursVec = new cv.MatVector();
        contours.forEach(({ contour }) => contoursVec.push_back(contour));

        let mask = new cv.Mat(
          card.rows,
          card.cols,
          cv.CV_8UC1,
          new cv.Scalar(0)
        );

        switch (mode) {
          case "fill":
            cv.drawContours(
              mask,
              // @ts-ignore
              contoursVec,
              -1,
              new cv.Scalar(255),
              cv.FILLED
            );
            break;
          case "border":
            cv.drawContours(
              mask,
              // @ts-ignore
              contoursVec,
              -1,
              new cv.Scalar(255),
              line_width,
              cv.LINE_8
            );
            break;
        }

        // Invert Mask
        if (invert) {
          cv.bitwise_not(mask, mask);
        }

        // Erase Contours
        if (mode === "fill" && !includeShapeBorder) {
          cv.drawContours(
            mask,
            // @ts-ignore
            contoursVec,
            -1,
            new cv.Scalar(0),
            line_width,
            cv.LINE_8
          );
        }
        contoursVec.delete();
        return mask;
      }
      function extractColor(
        card: cv.Mat,
        contours: ApproximatedContours
      ): Color {
        const min_dif = 0.02;
        const mask = createMask(card, contours, "border");
        const mask_invers = createMask(card, contours, "fill", true, false);
        // @ts-ignore
        const [r_white, g_white, b_white] = cv.mean(card, mask_invers);
        // @ts-ignore
        let [red, green, blue] = cv.mean(card, mask);
        [red, green, blue] = [red / r_white, green / g_white, blue / b_white];

        mask.delete();
        mask_invers.delete();

        if (green - red > min_dif && green - blue > min_dif) return "green";
        if (red - green > min_dif && red - blue > min_dif) return "red";
        return "purple";
      }
      function extractFill(card: cv.Mat, contours: ApproximatedContours): Fill {
        const gray = card.clone();
        cv.cvtColor(card, gray, cv.COLOR_RGBA2GRAY);
        cv.normalize(gray, gray, 0, 255, cv.NORM_MINMAX);

        const mask = createMask(card, contours, "fill");
        const mask_invers = createMask(card, contours, "fill", true);

        // cv.imshow('canvasOutput', card);
        // cv.imshow('canvasOutputOverlay', mask);

        // @ts-ignore
        const mean_symbols = cv.mean(gray, mask)[0];
        // @ts-ignore
        const mean_card = cv.mean(gray, mask_invers)[0];

        // console.log(mean_symbols)
        // console.log(mean_card)

        gray.delete();
        mask.delete();
        mask_invers.delete();

        const mean_similarity = mean_symbols / mean_card;
        // console.log(mean_similarity)
        if (mean_similarity > .97) return "blank";
        if (mean_similarity < .2) return "solid";
        return "striped";
      }

      shapeContours.forEach(({ contour, approximation }) => {
        contour.delete();
        approximation.delete();
      });

      cleanupShapeContours();

      card.delete()
      contour.delete();
      approximation.delete();

      return detectedCard;
    });

    dst.delete();
    src.delete();
    cleanupCardContours();

    const cards = detectedCards.filter((card) => card !== undefined) as Card[];
    const sets = combinations(cards, 3).filter((possibleSet) =>
      isSet(possibleSet as [Card, Card, Card])
    );

    // console.log(JSON.stringify(cards))
    console.log(JSON.stringify(sets))

    return Promise.resolve(sets);
  };
}
