import { FunctionalComponent, h } from 'preact';
import style from './style.css';
import cv, { Mat, Rect } from "opencv-ts";
import { useState } from 'preact/hooks';

const Home: FunctionalComponent = () => {
    const [rect] = useState(new cv.Rect(0, 0, 200, 200));

    return (
        <div class={style.home}>
            <h1>Home</h1>
            <p>This is the Home component. And it renders the shape of a Rectangle.</p>
            <p>{JSON.stringify(rect)}</p>
        </div>
    );
};

export default Home;
