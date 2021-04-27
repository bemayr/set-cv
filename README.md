# Computer Vision aided Set Instructor (*set-cv*)

supporting the card game Set using computer vision

## Development

> IMPORTANT: READ THIS FIRST

Until [theothergrantdavidson/opencv-ts#2](https://github.com/theothergrantdavidson/opencv-ts/pull/2) is merged and pushed to npm you have to monkey-patch opencv-ts' `package.json` first.
Simply add

```json
,
"browser": {
    "fs": false
}
```

to its `package.json` under `node_modules`, after that, the webpack build will work. 🎉

```sh
npm run dev
```
