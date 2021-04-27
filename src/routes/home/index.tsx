import { FunctionalComponent, h } from 'preact';
import style from './style.css';
import cv, { Mat, Rect } from "opencv-ts";

const Home: FunctionalComponent = () => {
    const roiRect: Rect = new cv.Rect(0, 0, 200, 200);

    console.log(roiRect)

    return (
        <div class={style.home}>
            <h1>Home</h1>
            <p>This is the Home component.</p>
        </div>
    );
};

export default Home;
