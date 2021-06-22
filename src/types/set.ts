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
  if (count === undefined || shape === undefined) return undefined;
  return { count, color, shape, fill };
}

const colorToString = {
  green: "G",
  red: "R",
  purple: "P",
};
const shapeToString = {
  oval: "0",
  diamond: "♢",
  squiggle: "∿",
};
const fillToString = {
  blank: "☐",
  striped: "║",
  solid: "█",
};

export function cardToString(card: Card): string {
  return `${colorToString[card.color]}${card.count}${fillToString[card.fill]}${
    shapeToString[card.shape]
  }`;
}

const colorToNumber = {
  green: 0,
  red: 1,
  purple: 2,
};
const shapeToNumber = {
  oval: 0,
  diamond: 1,
  squiggle: 2,
};
const fillToNumber = {
  blank: 0,
  striped: 1,
  solid: 2,
};

export default function combinations<T>(collection: T[], n: number): T[][] {
  if (collection.length < n) return [];
  let recur = (array: T[], n: number) => {
    if (--n < 0) return [[]] as T[][];
    let combinations = [] as T[][];
    array = array.slice();
    while (array.length - n) {
      let value = array.shift();
      recur(array, n).forEach((combination: any) => {
        combination.unshift(value);
        combinations.push(combination);
      });
    }
    return combinations;
  };
  return recur(collection, n);
}

export type Set = [Card, Card, Card]

export function isSet(cards: [Card, Card, Card]): boolean {
  const result = cards
    .map((card) => [
      card.count,
      colorToNumber[card.color],
      shapeToNumber[card.shape],
      fillToNumber[card.fill],
    ])
    .reduce(
      (
        [count, color, shape, fill],
        [currentCount, currentColor, currentShape, currentFill]
      ) => [
        count + currentCount,
        color + currentColor,
        shape + currentShape,
        fill + currentFill,
      ],
      [0, 0, 0, 0]
    )
    .map((sum) => sum % 3)
    .reduce((sum, current) => sum + current, 0);
  return result === 0;
}

// def is_set(triplet):
//     # sum of attributes
//     sum_attributes = [sum(a) for a in zip(*triplet)]

//     # take modulo 3 of attribute sums
//     sum_attributes_mod3 = [a % 3 for a in sum_attributes]

//     # all attributes should have a sum of 0
//     if sum(sum_attributes_mod3) == 0:
//         return True
//     return False
