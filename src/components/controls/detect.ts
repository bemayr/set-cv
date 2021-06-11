let cv: any;

export async function loadOpenCV() {
    try {
        console.log("loading")
        const opencv = await import(/* webpackChunkName: "opencv" */ "opencv-ts");
        console.log("loaded")
        cv = opencv.default;
    } catch (err) {
        console.log("Failed to load opencv", err);
    }
}

let loadedSet: any;

export async function loadSet() {
    try {
        const set = await import(/* webpackChunkName: "set" */ "../../types/set");
        loadedSet = set;
    } catch (err) {
        console.log("Failed to load opencv", err);
    }
}

export function registerRuntimeInitializedHandler(runtimeInitialized: () => void) {
    // cv.onRuntimeInitialized = runtimeInitialized;
    console.log(loadedSet.createCard)
    runtimeInitialized()
}
