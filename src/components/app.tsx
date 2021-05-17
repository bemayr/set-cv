import { FunctionalComponent, h } from 'preact';
import { useSizes as useWindowDimensions } from "react-use-sizes";
import SetCamera from './camera';

const App: FunctionalComponent = () => {
    const dimensions = useWindowDimensions();

    return (
        <div id="preact_root">
            <SetCamera/>
        </div>
    );
};

export default App;
