import React from 'react'

// https://github.com/preactjs/preact/issues/2748
declare global {
    namespace React {
        interface ReactElement {
            nodeName: any
            attributes: any
            children: any
        }
    }
}
