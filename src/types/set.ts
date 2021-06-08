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

export function createCard({
  count,
  color,
  shape,
  fill,
}: {
  count: Count | undefined;
  color: Color;
  shape: Shape | undefined;
  fill: Fill;
}): Card | undefined {
  if (count === undefined || shape === undefined)
    return undefined;
  return { count, color, shape, fill };
}

const colorToString = {
  green: "G",
  red: "R",
  purple: "P"
}
const shapeToString = {
  oval: "0",
  diamond: "♢",
  squiggle: "∿"
}
const fillToString = {
  blank: "☐",
  striped: "║",
  solid: "█"
}

export function cardToString(card: Card): string {
  return `${colorToString[card.color]}${card.count}${fillToString[card.fill]}${shapeToString[card.shape]}`
}
