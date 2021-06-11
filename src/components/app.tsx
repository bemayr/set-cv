import { FunctionalComponent, h } from 'preact';
import { useSizes as useWindowDimensions } from "react-use-sizes";
import Camera from './camera';
import Controls from './controls';

// rmwc Styles
import '@rmwc/theme/styles';
import '@rmwc/icon/styles';
import '@rmwc/fab/styles';
import '@rmwc/menu/styles';

const App: FunctionalComponent = () => {
    const dimensions = useWindowDimensions();

    return (
        <div id="preact_root">
            {/* <SetCamera/> */}
            <Camera />
            <Controls />
        </div>
    );
};

export default App;
