module.exports=function(t){var e={};function n(r){if(e[r])return e[r].exports;var o=e[r]={i:r,l:!1,exports:{}};return t[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=t,n.c=e,n.d=function(t,e,r){n.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:r})},n.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},n.t=function(t,e){if(1&e&&(t=n(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var o in t)n.d(r,o,function(e){return t[e]}.bind(null,o));return r},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="/",n(n.s="qVkA")}({FA6U:function(t,e,n){t.exports={home:"home__MseGd"}},GFNa:function(t,e,n){},HteQ:function(t,e){t.exports=require("preact")},NWYn:function(t,e,n){t.exports={profile:"profile__t2Dqz"}},Y3FI:function(t,e,n){"use strict";n.r(e),n.d(e,"subscribers",(function(){return h})),n.d(e,"getCurrentUrl",(function(){return d})),n.d(e,"route",(function(){return v})),n.d(e,"Router",(function(){return x})),n.d(e,"Route",(function(){return k})),n.d(e,"Link",(function(){return C})),n.d(e,"exec",(function(){return u}));var r=n("HteQ"),o={};function i(t,e){for(var n in e)t[n]=e[n];return t}function u(t,e,n){var r,i=/(?:\?([^#]*))?(#.*)?$/,u=t.match(i),c={};if(u&&u[1])for(var a=u[1].split("&"),p=0;p<a.length;p++){var s=a[p].split("=");c[decodeURIComponent(s[0])]=decodeURIComponent(s.slice(1).join("="))}t=f(t.replace(i,"")),e=f(e||"");for(var l=Math.max(t.length,e.length),h=0;h<l;h++)if(e[h]&&":"===e[h].charAt(0)){var _=e[h].replace(/(^:|[+*?]+$)/g,""),d=(e[h].match(/[+*?]+$/)||o)[0]||"",v=~d.indexOf("+"),m=~d.indexOf("*"),b=t[h]||"";if(!b&&!m&&(d.indexOf("?")<0||v)){r=!1;break}if(c[_]=decodeURIComponent(b),v||m){c[_]=t.slice(h).map(decodeURIComponent).join("/");break}}else if(e[h]!==t[h]){r=!1;break}return(!0===n.default||!1!==r)&&c}function c(t,e){return t.rank<e.rank?1:t.rank>e.rank?-1:t.index-e.index}function a(t,e){return t.index=e,t.rank=function(t){return t.props.default?0:(e=t.props.path,f(e).map(p).join(""));var e}(t),t.props}function f(t){return t.replace(/(^\/+|\/+$)/g,"").split("/")}function p(t){return":"==t.charAt(0)?1+"*+?".indexOf(t.charAt(t.length-1))||4:5}var s=null,l=[],h=[],_={};function d(){var t;return""+((t=s&&s.location?s.location:s&&s.getCurrentLocation?s.getCurrentLocation():"undefined"!=typeof location?location:_).pathname||"")+(t.search||"")}function v(t,e){return void 0===e&&(e=!1),"string"!=typeof t&&t.url&&(e=t.replace,t=t.url),function(t){for(var e=l.length;e--;)if(l[e].canRoute(t))return!0;return!1}(t)&&function(t,e){void 0===e&&(e="push"),s&&s[e]?s[e](t):"undefined"!=typeof history&&history[e+"State"]&&history[e+"State"](null,null,t)}(t,e?"replace":"push"),m(t)}function m(t){for(var e=!1,n=0;n<l.length;n++)!0===l[n].routeTo(t)&&(e=!0);for(var r=h.length;r--;)h[r](t);return e}function b(t){if(t&&t.getAttribute){var e=t.getAttribute("href"),n=t.getAttribute("target");if(e&&e.match(/^\//g)&&(!n||n.match(/^_?self$/i)))return v(e)}}function y(t){if(!(t.ctrlKey||t.metaKey||t.altKey||t.shiftKey||0!==t.button))return b(t.currentTarget||t.target||this),g(t)}function g(t){return t&&(t.stopImmediatePropagation&&t.stopImmediatePropagation(),t.stopPropagation&&t.stopPropagation(),t.preventDefault()),!1}function O(t){if(!(t.ctrlKey||t.metaKey||t.altKey||t.shiftKey||0!==t.button)){var e=t.target;do{if("A"===String(e.nodeName).toUpperCase()&&e.getAttribute("href")){if(e.hasAttribute("native"))return;if(b(e))return g(t)}}while(e=e.parentNode)}}var j=!1;var x=function(t){function e(e){t.call(this,e),e.history&&(s=e.history),this.state={url:e.url||d()},j||("function"==typeof addEventListener&&(s||addEventListener("popstate",(function(){m(d())})),addEventListener("click",O)),j=!0)}return t&&(e.__proto__=t),e.prototype=Object.create(t&&t.prototype),e.prototype.constructor=e,e.prototype.shouldComponentUpdate=function(t){return!0!==t.static||(t.url!==this.props.url||t.onChange!==this.props.onChange)},e.prototype.canRoute=function(t){var e=Object(r.toChildArray)(this.props.children);return this.getMatchingChildren(e,t,!1).length>0},e.prototype.routeTo=function(t){this.setState({url:t});var e=this.canRoute(t);return this.updating||this.forceUpdate(),e},e.prototype.componentWillMount=function(){l.push(this),this.updating=!0},e.prototype.componentDidMount=function(){var t=this;s&&(this.unlisten=s.listen((function(e){t.routeTo(""+(e.pathname||"")+(e.search||""))}))),this.updating=!1},e.prototype.componentWillUnmount=function(){"function"==typeof this.unlisten&&this.unlisten(),l.splice(l.indexOf(this),1)},e.prototype.componentWillUpdate=function(){this.updating=!0},e.prototype.componentDidUpdate=function(){this.updating=!1},e.prototype.getMatchingChildren=function(t,e,n){return t.filter(a).sort(c).map((function(t){var o=u(e,t.props.path,t.props);if(o){if(!1!==n){var c={url:e,matches:o};return i(c,o),delete c.ref,delete c.key,Object(r.cloneElement)(t,c)}return t}})).filter(Boolean)},e.prototype.render=function(t,e){var n=t.children,o=t.onChange,i=e.url,u=this.getMatchingChildren(Object(r.toChildArray)(n),i,!0),c=u[0]||null,a=this.previousUrl;return i!==a&&(this.previousUrl=i,"function"==typeof o&&o({router:this,url:i,previous:a,active:u,current:c})),c},e}(r.Component),C=function(t){return Object(r.createElement)("a",i({onClick:y},t))},k=function(t){return Object(r.createElement)(t.component,t)};x.subscribers=h,x.getCurrentUrl=d,x.route=v,x.Router=x,x.Route=k,x.Link=C,x.exec=u,e.default=x},bGx1:function(t,e,n){t.exports={notfound:"notfound__3HqSM"}},"ox/y":function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.Link=e.Match=void 0;var r=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(t[r]=n[r])}return t},o=n("HteQ"),i=n("Y3FI");function u(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function c(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}var a=e.Match=function(t){function e(){var n,r;u(this,e);for(var o=arguments.length,i=Array(o),a=0;a<o;a++)i[a]=arguments[a];return n=r=c(this,t.call.apply(t,[this].concat(i))),r.update=function(t){r.nextUrl=t,r.setState({})},c(r,n)}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,t),e.prototype.componentDidMount=function(){i.subscribers.push(this.update)},e.prototype.componentWillUnmount=function(){i.subscribers.splice(i.subscribers.indexOf(this.update)>>>0,1)},e.prototype.render=function(t){var e=this.nextUrl||(0,i.getCurrentUrl)(),n=e.replace(/\?.+$/,"");return this.nextUrl=null,t.children({url:e,path:n,matches:!1!==(0,i.exec)(n,t.path,{})})},e}(o.Component),f=function(t){var e=t.activeClassName,n=t.path,u=function(t,e){var n={};for(var r in t)e.indexOf(r)>=0||Object.prototype.hasOwnProperty.call(t,r)&&(n[r]=t[r]);return n}(t,["activeClassName","path"]);return(0,o.h)(a,{path:n||u.href},(function(t){var n=t.matches;return(0,o.h)(i.Link,r({},u,{class:[u.class||u.className,n&&e].filter(Boolean).join(" ")}))}))};e.Link=f,e.default=a,a.Link=f},qVkA:function(t,e,n){"use strict";n.r(e);n("GFNa");var r,o,i,u=n("HteQ"),c=n("Y3FI"),a=n("FA6U"),f=n.n(a),p=function(){return Object(u.h)("div",{class:f.a.home},Object(u.h)("h1",null,"Home"),Object(u.h)("p",null,"This is the Home component."))},s=0,l=[],h=u.options.__b,_=u.options.__r,d=u.options.diffed,v=u.options.__c,m=u.options.unmount;function b(t,e){u.options.__h&&u.options.__h(o,t,s||e),s=0;var n=o.__H||(o.__H={__:[],__h:[]});return t>=n.__.length&&n.__.push({}),n.__[t]}function y(t){return s=1,function(t,e,n){var i=b(r++,2);return i.t=t,i.__c||(i.__=[n?n(e):k(void 0,e),function(t){var e=i.t(i.__[0],t);i.__[0]!==e&&(i.__=[e,i.__[1]],i.__c.setState({}))}],i.__c=o),i.__}(k,t)}function g(){l.forEach((function(t){if(t.__P)try{t.__H.__h.forEach(j),t.__H.__h.forEach(x),t.__H.__h=[]}catch(e){t.__H.__h=[],u.options.__e(e,t.__v)}})),l=[]}u.options.__b=function(t){o=null,h&&h(t)},u.options.__r=function(t){_&&_(t),r=0;var e=(o=t.__c).__H;e&&(e.__h.forEach(j),e.__h.forEach(x),e.__h=[])},u.options.diffed=function(t){d&&d(t);var e=t.__c;e&&e.__H&&e.__H.__h.length&&(1!==l.push(e)&&i===u.options.requestAnimationFrame||((i=u.options.requestAnimationFrame)||function(t){var e,n=function(){clearTimeout(r),O&&cancelAnimationFrame(e),setTimeout(t)},r=setTimeout(n,100);O&&(e=requestAnimationFrame(n))})(g)),o=void 0},u.options.__c=function(t,e){e.some((function(t){try{t.__h.forEach(j),t.__h=t.__h.filter((function(t){return!t.__||x(t)}))}catch(n){e.some((function(t){t.__h&&(t.__h=[])})),e=[],u.options.__e(n,t.__v)}})),v&&v(t,e)},u.options.unmount=function(t){m&&m(t);var e=t.__c;if(e&&e.__H)try{e.__H.__.forEach(j)}catch(t){u.options.__e(t,e.__v)}};var O="function"==typeof requestAnimationFrame;function j(t){var e=o;"function"==typeof t.__c&&t.__c(),o=e}function x(t){var e=o;t.__c=t.__(),o=e}function C(t,e){return!t||t.length!==e.length||e.some((function(e,n){return e!==t[n]}))}function k(t,e){return"function"==typeof e?e(t):e}var H=n("NWYn"),U=n.n(H),A=function(t){var e,n,i,c=t.user,a=y(Date.now()),f=a[0],p=a[1],s=y(0),l=s[0],h=s[1];e=function(){var t=window.setInterval((function(){return p(Date.now())}),1e3);return function(){clearInterval(t)}},n=[],i=b(r++,3),!u.options.__s&&C(i.__H,n)&&(i.__=e,i.__H=n,o.__H.__h.push(i));return Object(u.h)("div",{class:U.a.profile},Object(u.h)("h1",null,"Profile: ",c),Object(u.h)("p",null,"This is the user profile for a user named ",c,"."),Object(u.h)("div",null,"Current time: ",new Date(f).toLocaleString()),Object(u.h)("p",null,Object(u.h)("button",{onClick:function(){h(l+1)}},"Click Me")," Clicked ",l," ","times."))},M=n("ox/y"),E=n("bGx1"),P=n.n(E),w=function(){return Object(u.h)("div",{class:P.a.notfound},Object(u.h)("h1",null,"Error 404"),Object(u.h)("p",null,"That page doesn't exist."),Object(u.h)(M.Link,{href:"/"},Object(u.h)("h4",null,"Back to Home")))},L=n("ySiU"),R=n.n(L),S=function(){return Object(u.h)("header",{class:R.a.header},Object(u.h)("h1",null,"Preact App"),Object(u.h)("nav",null,Object(u.h)(M.Link,{activeClassName:R.a.active,href:"/"},"Home"),Object(u.h)(M.Link,{activeClassName:R.a.active,href:"/profile"},"Me"),Object(u.h)(M.Link,{activeClassName:R.a.active,href:"/profile/john"},"John")))},T=function(){return Object(u.h)("div",{id:"preact_root"},Object(u.h)(S,null),Object(u.h)(c.Router,null,Object(u.h)(c.Route,{path:"/",component:p}),Object(u.h)(c.Route,{path:"/profile/",component:A,user:"me"}),Object(u.h)(c.Route,{path:"/profile/:user",component:A}),Object(u.h)(w,{default:!0})))};e.default=T},ySiU:function(t,e,n){t.exports={header:"header__3QGkI",active:"active__3gItZ"}}});
//# sourceMappingURL=ssr-bundle.js.map