type Count = 1 | 2 | 3;
type Color = "green" | "red" | "purple";
type Shape = "oval" | "diamond" | "squiggle";
type Fill = "blank" | "striped" | "solid";

export interface Card {
    count: Count;
    color: Color;
    shape: Shape;
    fill: Fill;
}
