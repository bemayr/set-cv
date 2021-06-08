export type Count = 1 | 2 | 3;
export type Color = "green" | "red" | "purple";
export type Shape = "oval" | "diamond" | "squiggle";
export type Fill = "blank" | "striped" | "solid";

export interface Card {
  count: Count;
  color: Color;
  shape: Shape;
  fill: Fill;
}

function createCard(properties: {
  count: Count | undefined;
  color: Color | undefined;
  shape: Shape | undefined;
  fill: Fill | undefined;
}): Card | Error {
  return new Error("oh noooo");
}
