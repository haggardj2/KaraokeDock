var e=Object.create,t=Object.defineProperty,n=Object.getOwnPropertyDescriptor,r=Object.getOwnPropertyNames,i=Object.getPrototypeOf,a=Object.prototype.hasOwnProperty,o=(e,t)=>()=>(t||(e((t={exports:{}}).exports,t),e=null),t.exports),s=(e,i,o,s)=>{if(i&&typeof i==`object`||typeof i==`function`)for(var c=r(i),l=0,u=c.length,d;l<u;l++)d=c[l],!a.call(e,d)&&d!==o&&t(e,d,{get:(e=>i[e]).bind(null,d),enumerable:!(s=n(i,d))||s.enumerable});return e},c=(n,r,a)=>(a=n==null?{}:e(i(n)),s(r||!n||!n.__esModule?t(a,`default`,{value:n,enumerable:!0}):a,n));(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var l=o((e=>{var t=Symbol.for(`react.transitional.element`),n=Symbol.for(`react.portal`),r=Symbol.for(`react.fragment`),i=Symbol.for(`react.strict_mode`),a=Symbol.for(`react.profiler`),o=Symbol.for(`react.consumer`),s=Symbol.for(`react.context`),c=Symbol.for(`react.forward_ref`),l=Symbol.for(`react.suspense`),u=Symbol.for(`react.memo`),d=Symbol.for(`react.lazy`),f=Symbol.for(`react.activity`),p=Symbol.iterator;function m(e){return typeof e!=`object`||!e?null:(e=p&&e[p]||e[`@@iterator`],typeof e==`function`?e:null)}var h={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},g=Object.assign,_={};function v(e,t,n){this.props=e,this.context=t,this.refs=_,this.updater=n||h}v.prototype.isReactComponent={},v.prototype.setState=function(e,t){if(typeof e!=`object`&&typeof e!=`function`&&e!=null)throw Error(`takes an object of state variables to update or a function which returns an object of state variables.`);this.updater.enqueueSetState(this,e,t,`setState`)},v.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,`forceUpdate`)};function y(){}y.prototype=v.prototype;function b(e,t,n){this.props=e,this.context=t,this.refs=_,this.updater=n||h}var x=b.prototype=new y;x.constructor=b,g(x,v.prototype),x.isPureReactComponent=!0;var ee=Array.isArray;function S(){}var C={H:null,A:null,T:null,S:null},w=Object.prototype.hasOwnProperty;function T(e,n,r){var i=r.ref;return{$$typeof:t,type:e,key:n,ref:i===void 0?null:i,props:r}}function E(e,t){return T(e.type,t,e.props)}function D(e){return typeof e==`object`&&!!e&&e.$$typeof===t}function O(e){var t={"=":`=0`,":":`=2`};return`$`+e.replace(/[=:]/g,function(e){return t[e]})}var k=/\/+/g;function A(e,t){return typeof e==`object`&&e&&e.key!=null?O(``+e.key):t.toString(36)}function te(e){switch(e.status){case`fulfilled`:return e.value;case`rejected`:throw e.reason;default:switch(typeof e.status==`string`?e.then(S,S):(e.status=`pending`,e.then(function(t){e.status===`pending`&&(e.status=`fulfilled`,e.value=t)},function(t){e.status===`pending`&&(e.status=`rejected`,e.reason=t)})),e.status){case`fulfilled`:return e.value;case`rejected`:throw e.reason}}throw e}function ne(e,r,i,a,o){var s=typeof e;(s===`undefined`||s===`boolean`)&&(e=null);var c=!1;if(e===null)c=!0;else switch(s){case`bigint`:case`string`:case`number`:c=!0;break;case`object`:switch(e.$$typeof){case t:case n:c=!0;break;case d:return c=e._init,ne(c(e._payload),r,i,a,o)}}if(c)return o=o(e),c=a===``?`.`+A(e,0):a,ee(o)?(i=``,c!=null&&(i=c.replace(k,`$&/`)+`/`),ne(o,r,i,``,function(e){return e})):o!=null&&(D(o)&&(o=E(o,i+(o.key==null||e&&e.key===o.key?``:(``+o.key).replace(k,`$&/`)+`/`)+c)),r.push(o)),1;c=0;var l=a===``?`.`:a+`:`;if(ee(e))for(var u=0;u<e.length;u++)a=e[u],s=l+A(a,u),c+=ne(a,r,i,s,o);else if(u=m(e),typeof u==`function`)for(e=u.call(e),u=0;!(a=e.next()).done;)a=a.value,s=l+A(a,u++),c+=ne(a,r,i,s,o);else if(s===`object`){if(typeof e.then==`function`)return ne(te(e),r,i,a,o);throw r=String(e),Error(`Objects are not valid as a React child (found: `+(r===`[object Object]`?`object with keys {`+Object.keys(e).join(`, `)+`}`:r)+`). If you meant to render a collection of children, use an array instead.`)}return c}function re(e,t,n){if(e==null)return e;var r=[],i=0;return ne(e,r,``,``,function(e){return t.call(n,e,i++)}),r}function j(e){if(e._status===-1){var t=e._result;t=t(),t.then(function(t){(e._status===0||e._status===-1)&&(e._status=1,e._result=t)},function(t){(e._status===0||e._status===-1)&&(e._status=2,e._result=t)}),e._status===-1&&(e._status=0,e._result=t)}if(e._status===1)return e._result.default;throw e._result}var M=typeof reportError==`function`?reportError:function(e){if(typeof window==`object`&&typeof window.ErrorEvent==`function`){var t=new window.ErrorEvent(`error`,{bubbles:!0,cancelable:!0,message:typeof e==`object`&&e&&typeof e.message==`string`?String(e.message):String(e),error:e});if(!window.dispatchEvent(t))return}else if(typeof process==`object`&&typeof process.emit==`function`){process.emit(`uncaughtException`,e);return}console.error(e)},N={map:re,forEach:function(e,t,n){re(e,function(){t.apply(this,arguments)},n)},count:function(e){var t=0;return re(e,function(){t++}),t},toArray:function(e){return re(e,function(e){return e})||[]},only:function(e){if(!D(e))throw Error(`React.Children.only expected to receive a single React element child.`);return e}};e.Activity=f,e.Children=N,e.Component=v,e.Fragment=r,e.Profiler=a,e.PureComponent=b,e.StrictMode=i,e.Suspense=l,e.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE=C,e.__COMPILER_RUNTIME={__proto__:null,c:function(e){return C.H.useMemoCache(e)}},e.cache=function(e){return function(){return e.apply(null,arguments)}},e.cacheSignal=function(){return null},e.cloneElement=function(e,t,n){if(e==null)throw Error(`The argument must be a React element, but you passed `+e+`.`);var r=g({},e.props),i=e.key;if(t!=null)for(a in t.key!==void 0&&(i=``+t.key),t)!w.call(t,a)||a===`key`||a===`__self`||a===`__source`||a===`ref`&&t.ref===void 0||(r[a]=t[a]);var a=arguments.length-2;if(a===1)r.children=n;else if(1<a){for(var o=Array(a),s=0;s<a;s++)o[s]=arguments[s+2];r.children=o}return T(e.type,i,r)},e.createContext=function(e){return e={$$typeof:s,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null},e.Provider=e,e.Consumer={$$typeof:o,_context:e},e},e.createElement=function(e,t,n){var r,i={},a=null;if(t!=null)for(r in t.key!==void 0&&(a=``+t.key),t)w.call(t,r)&&r!==`key`&&r!==`__self`&&r!==`__source`&&(i[r]=t[r]);var o=arguments.length-2;if(o===1)i.children=n;else if(1<o){for(var s=Array(o),c=0;c<o;c++)s[c]=arguments[c+2];i.children=s}if(e&&e.defaultProps)for(r in o=e.defaultProps,o)i[r]===void 0&&(i[r]=o[r]);return T(e,a,i)},e.createRef=function(){return{current:null}},e.forwardRef=function(e){return{$$typeof:c,render:e}},e.isValidElement=D,e.lazy=function(e){return{$$typeof:d,_payload:{_status:-1,_result:e},_init:j}},e.memo=function(e,t){return{$$typeof:u,type:e,compare:t===void 0?null:t}},e.startTransition=function(e){var t=C.T,n={};C.T=n;try{var r=e(),i=C.S;i!==null&&i(n,r),typeof r==`object`&&r&&typeof r.then==`function`&&r.then(S,M)}catch(e){M(e)}finally{t!==null&&n.types!==null&&(t.types=n.types),C.T=t}},e.unstable_useCacheRefresh=function(){return C.H.useCacheRefresh()},e.use=function(e){return C.H.use(e)},e.useActionState=function(e,t,n){return C.H.useActionState(e,t,n)},e.useCallback=function(e,t){return C.H.useCallback(e,t)},e.useContext=function(e){return C.H.useContext(e)},e.useDebugValue=function(){},e.useDeferredValue=function(e,t){return C.H.useDeferredValue(e,t)},e.useEffect=function(e,t){return C.H.useEffect(e,t)},e.useEffectEvent=function(e){return C.H.useEffectEvent(e)},e.useId=function(){return C.H.useId()},e.useImperativeHandle=function(e,t,n){return C.H.useImperativeHandle(e,t,n)},e.useInsertionEffect=function(e,t){return C.H.useInsertionEffect(e,t)},e.useLayoutEffect=function(e,t){return C.H.useLayoutEffect(e,t)},e.useMemo=function(e,t){return C.H.useMemo(e,t)},e.useOptimistic=function(e,t){return C.H.useOptimistic(e,t)},e.useReducer=function(e,t,n){return C.H.useReducer(e,t,n)},e.useRef=function(e){return C.H.useRef(e)},e.useState=function(e){return C.H.useState(e)},e.useSyncExternalStore=function(e,t,n){return C.H.useSyncExternalStore(e,t,n)},e.useTransition=function(){return C.H.useTransition()},e.version=`19.2.6`})),u=o(((e,t)=>{t.exports=l()})),d=o((e=>{function t(e,t){var n=e.length;e.push(t);a:for(;0<n;){var r=n-1>>>1,a=e[r];if(0<i(a,t))e[r]=t,e[n]=a,n=r;else break a}}function n(e){return e.length===0?null:e[0]}function r(e){if(e.length===0)return null;var t=e[0],n=e.pop();if(n!==t){e[0]=n;a:for(var r=0,a=e.length,o=a>>>1;r<o;){var s=2*(r+1)-1,c=e[s],l=s+1,u=e[l];if(0>i(c,n))l<a&&0>i(u,c)?(e[r]=u,e[l]=n,r=l):(e[r]=c,e[s]=n,r=s);else if(l<a&&0>i(u,n))e[r]=u,e[l]=n,r=l;else break a}}return t}function i(e,t){var n=e.sortIndex-t.sortIndex;return n===0?e.id-t.id:n}if(e.unstable_now=void 0,typeof performance==`object`&&typeof performance.now==`function`){var a=performance;e.unstable_now=function(){return a.now()}}else{var o=Date,s=o.now();e.unstable_now=function(){return o.now()-s}}var c=[],l=[],u=1,d=null,f=3,p=!1,m=!1,h=!1,g=!1,_=typeof setTimeout==`function`?setTimeout:null,v=typeof clearTimeout==`function`?clearTimeout:null,y=typeof setImmediate<`u`?setImmediate:null;function b(e){for(var i=n(l);i!==null;){if(i.callback===null)r(l);else if(i.startTime<=e)r(l),i.sortIndex=i.expirationTime,t(c,i);else break;i=n(l)}}function x(e){if(h=!1,b(e),!m)if(n(c)!==null)m=!0,ee||(ee=!0,D());else{var t=n(l);t!==null&&A(x,t.startTime-e)}}var ee=!1,S=-1,C=5,w=-1;function T(){return g?!0:!(e.unstable_now()-w<C)}function E(){if(g=!1,ee){var t=e.unstable_now();w=t;var i=!0;try{a:{m=!1,h&&(h=!1,v(S),S=-1),p=!0;var a=f;try{b:{for(b(t),d=n(c);d!==null&&!(d.expirationTime>t&&T());){var o=d.callback;if(typeof o==`function`){d.callback=null,f=d.priorityLevel;var s=o(d.expirationTime<=t);if(t=e.unstable_now(),typeof s==`function`){d.callback=s,b(t),i=!0;break b}d===n(c)&&r(c),b(t)}else r(c);d=n(c)}if(d!==null)i=!0;else{var u=n(l);u!==null&&A(x,u.startTime-t),i=!1}}break a}finally{d=null,f=a,p=!1}i=void 0}}finally{i?D():ee=!1}}}var D;if(typeof y==`function`)D=function(){y(E)};else if(typeof MessageChannel<`u`){var O=new MessageChannel,k=O.port2;O.port1.onmessage=E,D=function(){k.postMessage(null)}}else D=function(){_(E,0)};function A(t,n){S=_(function(){t(e.unstable_now())},n)}e.unstable_IdlePriority=5,e.unstable_ImmediatePriority=1,e.unstable_LowPriority=4,e.unstable_NormalPriority=3,e.unstable_Profiling=null,e.unstable_UserBlockingPriority=2,e.unstable_cancelCallback=function(e){e.callback=null},e.unstable_forceFrameRate=function(e){0>e||125<e?console.error(`forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported`):C=0<e?Math.floor(1e3/e):5},e.unstable_getCurrentPriorityLevel=function(){return f},e.unstable_next=function(e){switch(f){case 1:case 2:case 3:var t=3;break;default:t=f}var n=f;f=t;try{return e()}finally{f=n}},e.unstable_requestPaint=function(){g=!0},e.unstable_runWithPriority=function(e,t){switch(e){case 1:case 2:case 3:case 4:case 5:break;default:e=3}var n=f;f=e;try{return t()}finally{f=n}},e.unstable_scheduleCallback=function(r,i,a){var o=e.unstable_now();switch(typeof a==`object`&&a?(a=a.delay,a=typeof a==`number`&&0<a?o+a:o):a=o,r){case 1:var s=-1;break;case 2:s=250;break;case 5:s=1073741823;break;case 4:s=1e4;break;default:s=5e3}return s=a+s,r={id:u++,callback:i,priorityLevel:r,startTime:a,expirationTime:s,sortIndex:-1},a>o?(r.sortIndex=a,t(l,r),n(c)===null&&r===n(l)&&(h?(v(S),S=-1):h=!0,A(x,a-o))):(r.sortIndex=s,t(c,r),m||p||(m=!0,ee||(ee=!0,D()))),r},e.unstable_shouldYield=T,e.unstable_wrapCallback=function(e){var t=f;return function(){var n=f;f=t;try{return e.apply(this,arguments)}finally{f=n}}}})),f=o(((e,t)=>{t.exports=d()})),p=o((e=>{var t=u();function n(e){var t=`https://react.dev/errors/`+e;if(1<arguments.length){t+=`?args[]=`+encodeURIComponent(arguments[1]);for(var n=2;n<arguments.length;n++)t+=`&args[]=`+encodeURIComponent(arguments[n])}return`Minified React error #`+e+`; visit `+t+` for the full message or use the non-minified dev environment for full errors and additional helpful warnings.`}function r(){}var i={d:{f:r,r:function(){throw Error(n(522))},D:r,C:r,L:r,m:r,X:r,S:r,M:r},p:0,findDOMNode:null},a=Symbol.for(`react.portal`);function o(e,t,n){var r=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:a,key:r==null?null:``+r,children:e,containerInfo:t,implementation:n}}var s=t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;function c(e,t){if(e===`font`)return``;if(typeof t==`string`)return t===`use-credentials`?t:``}e.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE=i,e.createPortal=function(e,t){var r=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!t||t.nodeType!==1&&t.nodeType!==9&&t.nodeType!==11)throw Error(n(299));return o(e,t,null,r)},e.flushSync=function(e){var t=s.T,n=i.p;try{if(s.T=null,i.p=2,e)return e()}finally{s.T=t,i.p=n,i.d.f()}},e.preconnect=function(e,t){typeof e==`string`&&(t?(t=t.crossOrigin,t=typeof t==`string`?t===`use-credentials`?t:``:void 0):t=null,i.d.C(e,t))},e.prefetchDNS=function(e){typeof e==`string`&&i.d.D(e)},e.preinit=function(e,t){if(typeof e==`string`&&t&&typeof t.as==`string`){var n=t.as,r=c(n,t.crossOrigin),a=typeof t.integrity==`string`?t.integrity:void 0,o=typeof t.fetchPriority==`string`?t.fetchPriority:void 0;n===`style`?i.d.S(e,typeof t.precedence==`string`?t.precedence:void 0,{crossOrigin:r,integrity:a,fetchPriority:o}):n===`script`&&i.d.X(e,{crossOrigin:r,integrity:a,fetchPriority:o,nonce:typeof t.nonce==`string`?t.nonce:void 0})}},e.preinitModule=function(e,t){if(typeof e==`string`)if(typeof t==`object`&&t){if(t.as==null||t.as===`script`){var n=c(t.as,t.crossOrigin);i.d.M(e,{crossOrigin:n,integrity:typeof t.integrity==`string`?t.integrity:void 0,nonce:typeof t.nonce==`string`?t.nonce:void 0})}}else t??i.d.M(e)},e.preload=function(e,t){if(typeof e==`string`&&typeof t==`object`&&t&&typeof t.as==`string`){var n=t.as,r=c(n,t.crossOrigin);i.d.L(e,n,{crossOrigin:r,integrity:typeof t.integrity==`string`?t.integrity:void 0,nonce:typeof t.nonce==`string`?t.nonce:void 0,type:typeof t.type==`string`?t.type:void 0,fetchPriority:typeof t.fetchPriority==`string`?t.fetchPriority:void 0,referrerPolicy:typeof t.referrerPolicy==`string`?t.referrerPolicy:void 0,imageSrcSet:typeof t.imageSrcSet==`string`?t.imageSrcSet:void 0,imageSizes:typeof t.imageSizes==`string`?t.imageSizes:void 0,media:typeof t.media==`string`?t.media:void 0})}},e.preloadModule=function(e,t){if(typeof e==`string`)if(t){var n=c(t.as,t.crossOrigin);i.d.m(e,{as:typeof t.as==`string`&&t.as!==`script`?t.as:void 0,crossOrigin:n,integrity:typeof t.integrity==`string`?t.integrity:void 0})}else i.d.m(e)},e.requestFormReset=function(e){i.d.r(e)},e.unstable_batchedUpdates=function(e,t){return e(t)},e.useFormState=function(e,t,n){return s.H.useFormState(e,t,n)},e.useFormStatus=function(){return s.H.useHostTransitionStatus()},e.version=`19.2.6`})),m=o(((e,t)=>{function n(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>`u`||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!=`function`))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n)}catch(e){console.error(e)}}n(),t.exports=p()})),h=o((e=>{var t=f(),n=u(),r=m();function i(e){var t=`https://react.dev/errors/`+e;if(1<arguments.length){t+=`?args[]=`+encodeURIComponent(arguments[1]);for(var n=2;n<arguments.length;n++)t+=`&args[]=`+encodeURIComponent(arguments[n])}return`Minified React error #`+e+`; visit `+t+` for the full message or use the non-minified dev environment for full errors and additional helpful warnings.`}function a(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11)}function o(e){var t=e,n=e;if(e.alternate)for(;t.return;)t=t.return;else{e=t;do t=e,t.flags&4098&&(n=t.return),e=t.return;while(e)}return t.tag===3?n:null}function s(e){if(e.tag===13){var t=e.memoizedState;if(t===null&&(e=e.alternate,e!==null&&(t=e.memoizedState)),t!==null)return t.dehydrated}return null}function c(e){if(e.tag===31){var t=e.memoizedState;if(t===null&&(e=e.alternate,e!==null&&(t=e.memoizedState)),t!==null)return t.dehydrated}return null}function l(e){if(o(e)!==e)throw Error(i(188))}function d(e){var t=e.alternate;if(!t){if(t=o(e),t===null)throw Error(i(188));return t===e?e:null}for(var n=e,r=t;;){var a=n.return;if(a===null)break;var s=a.alternate;if(s===null){if(r=a.return,r!==null){n=r;continue}break}if(a.child===s.child){for(s=a.child;s;){if(s===n)return l(a),e;if(s===r)return l(a),t;s=s.sibling}throw Error(i(188))}if(n.return!==r.return)n=a,r=s;else{for(var c=!1,u=a.child;u;){if(u===n){c=!0,n=a,r=s;break}if(u===r){c=!0,r=a,n=s;break}u=u.sibling}if(!c){for(u=s.child;u;){if(u===n){c=!0,n=s,r=a;break}if(u===r){c=!0,r=s,n=a;break}u=u.sibling}if(!c)throw Error(i(189))}}if(n.alternate!==r)throw Error(i(190))}if(n.tag!==3)throw Error(i(188));return n.stateNode.current===n?e:t}function p(e){var t=e.tag;if(t===5||t===26||t===27||t===6)return e;for(e=e.child;e!==null;){if(t=p(e),t!==null)return t;e=e.sibling}return null}var h=Object.assign,g=Symbol.for(`react.element`),_=Symbol.for(`react.transitional.element`),v=Symbol.for(`react.portal`),y=Symbol.for(`react.fragment`),b=Symbol.for(`react.strict_mode`),x=Symbol.for(`react.profiler`),ee=Symbol.for(`react.consumer`),S=Symbol.for(`react.context`),C=Symbol.for(`react.forward_ref`),w=Symbol.for(`react.suspense`),T=Symbol.for(`react.suspense_list`),E=Symbol.for(`react.memo`),D=Symbol.for(`react.lazy`),O=Symbol.for(`react.activity`),k=Symbol.for(`react.memo_cache_sentinel`),A=Symbol.iterator;function te(e){return typeof e!=`object`||!e?null:(e=A&&e[A]||e[`@@iterator`],typeof e==`function`?e:null)}var ne=Symbol.for(`react.client.reference`);function re(e){if(e==null)return null;if(typeof e==`function`)return e.$$typeof===ne?null:e.displayName||e.name||null;if(typeof e==`string`)return e;switch(e){case y:return`Fragment`;case x:return`Profiler`;case b:return`StrictMode`;case w:return`Suspense`;case T:return`SuspenseList`;case O:return`Activity`}if(typeof e==`object`)switch(e.$$typeof){case v:return`Portal`;case S:return e.displayName||`Context`;case ee:return(e._context.displayName||`Context`)+`.Consumer`;case C:var t=e.render;return e=e.displayName,e||=(e=t.displayName||t.name||``,e===``?`ForwardRef`:`ForwardRef(`+e+`)`),e;case E:return t=e.displayName||null,t===null?re(e.type)||`Memo`:t;case D:t=e._payload,e=e._init;try{return re(e(t))}catch{}}return null}var j=Array.isArray,M=n.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,N=r.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,ie={pending:!1,data:null,method:null,action:null},ae=[],oe=-1;function se(e){return{current:e}}function ce(e){0>oe||(e.current=ae[oe],ae[oe]=null,oe--)}function P(e,t){oe++,ae[oe]=e.current,e.current=t}var F=se(null),le=se(null),I=se(null),ue=se(null);function de(e,t){switch(P(I,t),P(le,e),P(F,null),t.nodeType){case 9:case 11:e=(e=t.documentElement)&&(e=e.namespaceURI)?Vd(e):0;break;default:if(e=t.tagName,t=t.namespaceURI)t=Vd(t),e=Hd(t,e);else switch(e){case`svg`:e=1;break;case`math`:e=2;break;default:e=0}}ce(F),P(F,e)}function fe(){ce(F),ce(le),ce(I)}function pe(e){e.memoizedState!==null&&P(ue,e);var t=F.current,n=Hd(t,e.type);t!==n&&(P(le,e),P(F,n))}function me(e){le.current===e&&(ce(F),ce(le)),ue.current===e&&(ce(ue),Qf._currentValue=ie)}var he,ge;function L(e){if(he===void 0)try{throw Error()}catch(e){var t=e.stack.trim().match(/\n( *(at )?)/);he=t&&t[1]||``,ge=-1<e.stack.indexOf(`
    at`)?` (<anonymous>)`:-1<e.stack.indexOf(`@`)?`@unknown:0:0`:``}return`
`+he+e+ge}var _e=!1;function ve(e,t){if(!e||_e)return``;_e=!0;var n=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{var r={DetermineComponentFrameRoot:function(){try{if(t){var n=function(){throw Error()};if(Object.defineProperty(n.prototype,"props",{set:function(){throw Error()}}),typeof Reflect==`object`&&Reflect.construct){try{Reflect.construct(n,[])}catch(e){var r=e}Reflect.construct(e,[],n)}else{try{n.call()}catch(e){r=e}e.call(n.prototype)}}else{try{throw Error()}catch(e){r=e}(n=e())&&typeof n.catch==`function`&&n.catch(function(){})}}catch(e){if(e&&r&&typeof e.stack==`string`)return[e.stack,r.stack]}return[null,null]}};r.DetermineComponentFrameRoot.displayName=`DetermineComponentFrameRoot`;var i=Object.getOwnPropertyDescriptor(r.DetermineComponentFrameRoot,`name`);i&&i.configurable&&Object.defineProperty(r.DetermineComponentFrameRoot,"name",{value:`DetermineComponentFrameRoot`});var a=r.DetermineComponentFrameRoot(),o=a[0],s=a[1];if(o&&s){var c=o.split(`
`),l=s.split(`
`);for(i=r=0;r<c.length&&!c[r].includes(`DetermineComponentFrameRoot`);)r++;for(;i<l.length&&!l[i].includes(`DetermineComponentFrameRoot`);)i++;if(r===c.length||i===l.length)for(r=c.length-1,i=l.length-1;1<=r&&0<=i&&c[r]!==l[i];)i--;for(;1<=r&&0<=i;r--,i--)if(c[r]!==l[i]){if(r!==1||i!==1)do if(r--,i--,0>i||c[r]!==l[i]){var u=`
`+c[r].replace(` at new `,` at `);return e.displayName&&u.includes(`<anonymous>`)&&(u=u.replace(`<anonymous>`,e.displayName)),u}while(1<=r&&0<=i);break}}}finally{_e=!1,Error.prepareStackTrace=n}return(n=e?e.displayName||e.name:``)?L(n):``}function ye(e,t){switch(e.tag){case 26:case 27:case 5:return L(e.type);case 16:return L(`Lazy`);case 13:return e.child!==t&&t!==null?L(`Suspense Fallback`):L(`Suspense`);case 19:return L(`SuspenseList`);case 0:case 15:return ve(e.type,!1);case 11:return ve(e.type.render,!1);case 1:return ve(e.type,!0);case 31:return L(`Activity`);default:return``}}function be(e){try{var t=``,n=null;do t+=ye(e,n),n=e,e=e.return;while(e);return t}catch(e){return`
Error generating stack: `+e.message+`
`+e.stack}}var xe=Object.prototype.hasOwnProperty,Se=t.unstable_scheduleCallback,Ce=t.unstable_cancelCallback,we=t.unstable_shouldYield,Te=t.unstable_requestPaint,Ee=t.unstable_now,De=t.unstable_getCurrentPriorityLevel,Oe=t.unstable_ImmediatePriority,ke=t.unstable_UserBlockingPriority,Ae=t.unstable_NormalPriority,je=t.unstable_LowPriority,Me=t.unstable_IdlePriority,Ne=t.log,Pe=t.unstable_setDisableYieldValue,Fe=null,Ie=null;function Le(e){if(typeof Ne==`function`&&Pe(e),Ie&&typeof Ie.setStrictMode==`function`)try{Ie.setStrictMode(Fe,e)}catch{}}var Re=Math.clz32?Math.clz32:Ve,ze=Math.log,Be=Math.LN2;function Ve(e){return e>>>=0,e===0?32:31-(ze(e)/Be|0)|0}var He=256,Ue=262144,R=4194304;function We(e){var t=e&42;if(t!==0)return t;switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:return 64;case 128:return 128;case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:return e&261888;case 262144:case 524288:case 1048576:case 2097152:return e&3932160;case 4194304:case 8388608:case 16777216:case 33554432:return e&62914560;case 67108864:return 67108864;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 0;default:return e}}function Ge(e,t,n){var r=e.pendingLanes;if(r===0)return 0;var i=0,a=e.suspendedLanes,o=e.pingedLanes;e=e.warmLanes;var s=r&134217727;return s===0?(s=r&~a,s===0?o===0?n||(n=r&~e,n!==0&&(i=We(n))):i=We(o):i=We(s)):(r=s&~a,r===0?(o&=s,o===0?n||(n=s&~e,n!==0&&(i=We(n))):i=We(o)):i=We(r)),i===0?0:t!==0&&t!==i&&(t&a)===0&&(a=i&-i,n=t&-t,a>=n||a===32&&n&4194048)?t:i}function Ke(e,t){return(e.pendingLanes&~(e.suspendedLanes&~e.pingedLanes)&t)===0}function qe(e,t){switch(e){case 1:case 2:case 4:case 8:case 64:return t+250;case 16:case 32:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t+5e3;case 4194304:case 8388608:case 16777216:case 33554432:return-1;case 67108864:case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function Je(){var e=R;return R<<=1,!(R&62914560)&&(R=4194304),e}function Ye(e){for(var t=[],n=0;31>n;n++)t.push(e);return t}function Xe(e,t){e.pendingLanes|=t,t!==268435456&&(e.suspendedLanes=0,e.pingedLanes=0,e.warmLanes=0)}function Ze(e,t,n,r,i,a){var o=e.pendingLanes;e.pendingLanes=n,e.suspendedLanes=0,e.pingedLanes=0,e.warmLanes=0,e.expiredLanes&=n,e.entangledLanes&=n,e.errorRecoveryDisabledLanes&=n,e.shellSuspendCounter=0;var s=e.entanglements,c=e.expirationTimes,l=e.hiddenUpdates;for(n=o&~n;0<n;){var u=31-Re(n),d=1<<u;s[u]=0,c[u]=-1;var f=l[u];if(f!==null)for(l[u]=null,u=0;u<f.length;u++){var p=f[u];p!==null&&(p.lane&=-536870913)}n&=~d}r!==0&&Qe(e,r,0),a!==0&&i===0&&e.tag!==0&&(e.suspendedLanes|=a&~(o&~t))}function Qe(e,t,n){e.pendingLanes|=t,e.suspendedLanes&=~t;var r=31-Re(t);e.entangledLanes|=t,e.entanglements[r]=e.entanglements[r]|1073741824|n&261930}function $e(e,t){var n=e.entangledLanes|=t;for(e=e.entanglements;n;){var r=31-Re(n),i=1<<r;i&t|e[r]&t&&(e[r]|=t),n&=~i}}function et(e,t){var n=t&-t;return n=n&42?1:tt(n),(n&(e.suspendedLanes|t))===0?n:0}function tt(e){switch(e){case 2:e=1;break;case 8:e=4;break;case 32:e=16;break;case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:e=128;break;case 268435456:e=134217728;break;default:e=0}return e}function nt(e){return e&=-e,2<e?8<e?e&134217727?32:268435456:8:2}function rt(){var e=N.p;return e===0?(e=window.event,e===void 0?32:mp(e.type)):e}function it(e,t){var n=N.p;try{return N.p=e,t()}finally{N.p=n}}var at=Math.random().toString(36).slice(2),ot=`__reactFiber$`+at,st=`__reactProps$`+at,ct=`__reactContainer$`+at,lt=`__reactEvents$`+at,ut=`__reactListeners$`+at,dt=`__reactHandles$`+at,ft=`__reactResources$`+at,pt=`__reactMarker$`+at;function mt(e){delete e[ot],delete e[st],delete e[lt],delete e[ut],delete e[dt]}function ht(e){var t=e[ot];if(t)return t;for(var n=e.parentNode;n;){if(t=n[ct]||n[ot]){if(n=t.alternate,t.child!==null||n!==null&&n.child!==null)for(e=df(e);e!==null;){if(n=e[ot])return n;e=df(e)}return t}e=n,n=e.parentNode}return null}function gt(e){if(e=e[ot]||e[ct]){var t=e.tag;if(t===5||t===6||t===13||t===31||t===26||t===27||t===3)return e}return null}function _t(e){var t=e.tag;if(t===5||t===26||t===27||t===6)return e.stateNode;throw Error(i(33))}function vt(e){var t=e[ft];return t||=e[ft]={hoistableStyles:new Map,hoistableScripts:new Map},t}function z(e){e[pt]=!0}var yt=new Set,bt={};function xt(e,t){St(e,t),St(e+`Capture`,t)}function St(e,t){for(bt[e]=t,e=0;e<t.length;e++)yt.add(t[e])}var Ct=RegExp(`^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$`),wt={},Tt={};function Et(e){return xe.call(Tt,e)?!0:xe.call(wt,e)?!1:Ct.test(e)?Tt[e]=!0:(wt[e]=!0,!1)}function Dt(e,t,n){if(Et(t))if(n===null)e.removeAttribute(t);else{switch(typeof n){case`undefined`:case`function`:case`symbol`:e.removeAttribute(t);return;case`boolean`:var r=t.toLowerCase().slice(0,5);if(r!==`data-`&&r!==`aria-`){e.removeAttribute(t);return}}e.setAttribute(t,``+n)}}function B(e,t,n){if(n===null)e.removeAttribute(t);else{switch(typeof n){case`undefined`:case`function`:case`symbol`:case`boolean`:e.removeAttribute(t);return}e.setAttribute(t,``+n)}}function Ot(e,t,n,r){if(r===null)e.removeAttribute(n);else{switch(typeof r){case`undefined`:case`function`:case`symbol`:case`boolean`:e.removeAttribute(n);return}e.setAttributeNS(t,n,``+r)}}function V(e){switch(typeof e){case`bigint`:case`boolean`:case`number`:case`string`:case`undefined`:return e;case`object`:return e;default:return``}}function kt(e){var t=e.type;return(e=e.nodeName)&&e.toLowerCase()===`input`&&(t===`checkbox`||t===`radio`)}function At(e,t,n){var r=Object.getOwnPropertyDescriptor(e.constructor.prototype,t);if(!e.hasOwnProperty(t)&&r!==void 0&&typeof r.get==`function`&&typeof r.set==`function`){var i=r.get,a=r.set;return Object.defineProperty(e,t,{configurable:!0,get:function(){return i.call(this)},set:function(e){n=``+e,a.call(this,e)}}),Object.defineProperty(e,t,{enumerable:r.enumerable}),{getValue:function(){return n},setValue:function(e){n=``+e},stopTracking:function(){e._valueTracker=null,delete e[t]}}}}function jt(e){if(!e._valueTracker){var t=kt(e)?`checked`:`value`;e._valueTracker=At(e,t,``+e[t])}}function Mt(e){if(!e)return!1;var t=e._valueTracker;if(!t)return!0;var n=t.getValue(),r=``;return e&&(r=kt(e)?e.checked?`true`:`false`:e.value),e=r,e===n?!1:(t.setValue(e),!0)}function Nt(e){if(e||=typeof document<`u`?document:void 0,e===void 0)return null;try{return e.activeElement||e.body}catch{return e.body}}var Pt=/[\n"\\]/g;function Ft(e){return e.replace(Pt,function(e){return`\\`+e.charCodeAt(0).toString(16)+` `})}function It(e,t,n,r,i,a,o,s){e.name=``,o!=null&&typeof o!=`function`&&typeof o!=`symbol`&&typeof o!=`boolean`?e.type=o:e.removeAttribute(`type`),t==null?o!==`submit`&&o!==`reset`||e.removeAttribute(`value`):o===`number`?(t===0&&e.value===``||e.value!=t)&&(e.value=``+V(t)):e.value!==``+V(t)&&(e.value=``+V(t)),t==null?n==null?r!=null&&e.removeAttribute(`value`):Rt(e,o,V(n)):Rt(e,o,V(t)),i==null&&a!=null&&(e.defaultChecked=!!a),i!=null&&(e.checked=i&&typeof i!=`function`&&typeof i!=`symbol`),s!=null&&typeof s!=`function`&&typeof s!=`symbol`&&typeof s!=`boolean`?e.name=``+V(s):e.removeAttribute(`name`)}function Lt(e,t,n,r,i,a,o,s){if(a!=null&&typeof a!=`function`&&typeof a!=`symbol`&&typeof a!=`boolean`&&(e.type=a),t!=null||n!=null){if(!(a!==`submit`&&a!==`reset`||t!=null)){jt(e);return}n=n==null?``:``+V(n),t=t==null?n:``+V(t),s||t===e.value||(e.value=t),e.defaultValue=t}r??=i,r=typeof r!=`function`&&typeof r!=`symbol`&&!!r,e.checked=s?e.checked:!!r,e.defaultChecked=!!r,o!=null&&typeof o!=`function`&&typeof o!=`symbol`&&typeof o!=`boolean`&&(e.name=o),jt(e)}function Rt(e,t,n){t===`number`&&Nt(e.ownerDocument)===e||e.defaultValue===``+n||(e.defaultValue=``+n)}function zt(e,t,n,r){if(e=e.options,t){t={};for(var i=0;i<n.length;i++)t[`$`+n[i]]=!0;for(n=0;n<e.length;n++)i=t.hasOwnProperty(`$`+e[n].value),e[n].selected!==i&&(e[n].selected=i),i&&r&&(e[n].defaultSelected=!0)}else{for(n=``+V(n),t=null,i=0;i<e.length;i++){if(e[i].value===n){e[i].selected=!0,r&&(e[i].defaultSelected=!0);return}t!==null||e[i].disabled||(t=e[i])}t!==null&&(t.selected=!0)}}function Bt(e,t,n){if(t!=null&&(t=``+V(t),t!==e.value&&(e.value=t),n==null)){e.defaultValue!==t&&(e.defaultValue=t);return}e.defaultValue=n==null?``:``+V(n)}function Vt(e,t,n,r){if(t==null){if(r!=null){if(n!=null)throw Error(i(92));if(j(r)){if(1<r.length)throw Error(i(93));r=r[0]}n=r}n??=``,t=n}n=V(t),e.defaultValue=n,r=e.textContent,r===n&&r!==``&&r!==null&&(e.value=r),jt(e)}function Ht(e,t){if(t){var n=e.firstChild;if(n&&n===e.lastChild&&n.nodeType===3){n.nodeValue=t;return}}e.textContent=t}var Ut=new Set(`animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp`.split(` `));function Wt(e,t,n){var r=t.indexOf(`--`)===0;n==null||typeof n==`boolean`||n===``?r?e.setProperty(t,``):t===`float`?e.cssFloat=``:e[t]=``:r?e.setProperty(t,n):typeof n!=`number`||n===0||Ut.has(t)?t===`float`?e.cssFloat=n:e[t]=(``+n).trim():e[t]=n+`px`}function Gt(e,t,n){if(t!=null&&typeof t!=`object`)throw Error(i(62));if(e=e.style,n!=null){for(var r in n)!n.hasOwnProperty(r)||t!=null&&t.hasOwnProperty(r)||(r.indexOf(`--`)===0?e.setProperty(r,``):r===`float`?e.cssFloat=``:e[r]=``);for(var a in t)r=t[a],t.hasOwnProperty(a)&&n[a]!==r&&Wt(e,a,r)}else for(var o in t)t.hasOwnProperty(o)&&Wt(e,o,t[o])}function Kt(e){if(e.indexOf(`-`)===-1)return!1;switch(e){case`annotation-xml`:case`color-profile`:case`font-face`:case`font-face-src`:case`font-face-uri`:case`font-face-format`:case`font-face-name`:case`missing-glyph`:return!1;default:return!0}}var qt=new Map([[`acceptCharset`,`accept-charset`],[`htmlFor`,`for`],[`httpEquiv`,`http-equiv`],[`crossOrigin`,`crossorigin`],[`accentHeight`,`accent-height`],[`alignmentBaseline`,`alignment-baseline`],[`arabicForm`,`arabic-form`],[`baselineShift`,`baseline-shift`],[`capHeight`,`cap-height`],[`clipPath`,`clip-path`],[`clipRule`,`clip-rule`],[`colorInterpolation`,`color-interpolation`],[`colorInterpolationFilters`,`color-interpolation-filters`],[`colorProfile`,`color-profile`],[`colorRendering`,`color-rendering`],[`dominantBaseline`,`dominant-baseline`],[`enableBackground`,`enable-background`],[`fillOpacity`,`fill-opacity`],[`fillRule`,`fill-rule`],[`floodColor`,`flood-color`],[`floodOpacity`,`flood-opacity`],[`fontFamily`,`font-family`],[`fontSize`,`font-size`],[`fontSizeAdjust`,`font-size-adjust`],[`fontStretch`,`font-stretch`],[`fontStyle`,`font-style`],[`fontVariant`,`font-variant`],[`fontWeight`,`font-weight`],[`glyphName`,`glyph-name`],[`glyphOrientationHorizontal`,`glyph-orientation-horizontal`],[`glyphOrientationVertical`,`glyph-orientation-vertical`],[`horizAdvX`,`horiz-adv-x`],[`horizOriginX`,`horiz-origin-x`],[`imageRendering`,`image-rendering`],[`letterSpacing`,`letter-spacing`],[`lightingColor`,`lighting-color`],[`markerEnd`,`marker-end`],[`markerMid`,`marker-mid`],[`markerStart`,`marker-start`],[`overlinePosition`,`overline-position`],[`overlineThickness`,`overline-thickness`],[`paintOrder`,`paint-order`],[`panose-1`,`panose-1`],[`pointerEvents`,`pointer-events`],[`renderingIntent`,`rendering-intent`],[`shapeRendering`,`shape-rendering`],[`stopColor`,`stop-color`],[`stopOpacity`,`stop-opacity`],[`strikethroughPosition`,`strikethrough-position`],[`strikethroughThickness`,`strikethrough-thickness`],[`strokeDasharray`,`stroke-dasharray`],[`strokeDashoffset`,`stroke-dashoffset`],[`strokeLinecap`,`stroke-linecap`],[`strokeLinejoin`,`stroke-linejoin`],[`strokeMiterlimit`,`stroke-miterlimit`],[`strokeOpacity`,`stroke-opacity`],[`strokeWidth`,`stroke-width`],[`textAnchor`,`text-anchor`],[`textDecoration`,`text-decoration`],[`textRendering`,`text-rendering`],[`transformOrigin`,`transform-origin`],[`underlinePosition`,`underline-position`],[`underlineThickness`,`underline-thickness`],[`unicodeBidi`,`unicode-bidi`],[`unicodeRange`,`unicode-range`],[`unitsPerEm`,`units-per-em`],[`vAlphabetic`,`v-alphabetic`],[`vHanging`,`v-hanging`],[`vIdeographic`,`v-ideographic`],[`vMathematical`,`v-mathematical`],[`vectorEffect`,`vector-effect`],[`vertAdvY`,`vert-adv-y`],[`vertOriginX`,`vert-origin-x`],[`vertOriginY`,`vert-origin-y`],[`wordSpacing`,`word-spacing`],[`writingMode`,`writing-mode`],[`xmlnsXlink`,`xmlns:xlink`],[`xHeight`,`x-height`]]),Jt=/^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;function Yt(e){return Jt.test(``+e)?`javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')`:e}function Xt(){}var Zt=null;function Qt(e){return e=e.target||e.srcElement||window,e.correspondingUseElement&&(e=e.correspondingUseElement),e.nodeType===3?e.parentNode:e}var $t=null,en=null;function tn(e){var t=gt(e);if(t&&(e=t.stateNode)){var n=e[st]||null;a:switch(e=t.stateNode,t.type){case`input`:if(It(e,n.value,n.defaultValue,n.defaultValue,n.checked,n.defaultChecked,n.type,n.name),t=n.name,n.type===`radio`&&t!=null){for(n=e;n.parentNode;)n=n.parentNode;for(n=n.querySelectorAll(`input[name="`+Ft(``+t)+`"][type="radio"]`),t=0;t<n.length;t++){var r=n[t];if(r!==e&&r.form===e.form){var a=r[st]||null;if(!a)throw Error(i(90));It(r,a.value,a.defaultValue,a.defaultValue,a.checked,a.defaultChecked,a.type,a.name)}}for(t=0;t<n.length;t++)r=n[t],r.form===e.form&&Mt(r)}break a;case`textarea`:Bt(e,n.value,n.defaultValue);break a;case`select`:t=n.value,t!=null&&zt(e,!!n.multiple,t,!1)}}}var nn=!1;function rn(e,t,n){if(nn)return e(t,n);nn=!0;try{return e(t)}finally{if(nn=!1,($t!==null||en!==null)&&(yu(),$t&&(t=$t,e=en,en=$t=null,tn(t),e)))for(t=0;t<e.length;t++)tn(e[t])}}function an(e,t){var n=e.stateNode;if(n===null)return null;var r=n[st]||null;if(r===null)return null;n=r[t];a:switch(t){case`onClick`:case`onClickCapture`:case`onDoubleClick`:case`onDoubleClickCapture`:case`onMouseDown`:case`onMouseDownCapture`:case`onMouseMove`:case`onMouseMoveCapture`:case`onMouseUp`:case`onMouseUpCapture`:case`onMouseEnter`:(r=!r.disabled)||(e=e.type,r=!(e===`button`||e===`input`||e===`select`||e===`textarea`)),e=!r;break a;default:e=!1}if(e)return null;if(n&&typeof n!=`function`)throw Error(i(231,t,typeof n));return n}var on=!(typeof window>`u`||window.document===void 0||window.document.createElement===void 0),sn=!1;if(on)try{var cn={};Object.defineProperty(cn,"passive",{get:function(){sn=!0}}),window.addEventListener(`test`,cn,cn),window.removeEventListener(`test`,cn,cn)}catch{sn=!1}var ln=null,un=null,dn=null;function fn(){if(dn)return dn;var e,t=un,n=t.length,r,i=`value`in ln?ln.value:ln.textContent,a=i.length;for(e=0;e<n&&t[e]===i[e];e++);var o=n-e;for(r=1;r<=o&&t[n-r]===i[a-r];r++);return dn=i.slice(e,1<r?1-r:void 0)}function H(e){var t=e.keyCode;return`charCode`in e?(e=e.charCode,e===0&&t===13&&(e=13)):e=t,e===10&&(e=13),32<=e||e===13?e:0}function pn(){return!0}function mn(){return!1}function hn(e){function t(t,n,r,i,a){for(var o in this._reactName=t,this._targetInst=r,this.type=n,this.nativeEvent=i,this.target=a,this.currentTarget=null,e)e.hasOwnProperty(o)&&(t=e[o],this[o]=t?t(i):i[o]);return this.isDefaultPrevented=(i.defaultPrevented==null?!1===i.returnValue:i.defaultPrevented)?pn:mn,this.isPropagationStopped=mn,this}return h(t.prototype,{preventDefault:function(){this.defaultPrevented=!0;var e=this.nativeEvent;e&&(e.preventDefault?e.preventDefault():typeof e.returnValue!=`unknown`&&(e.returnValue=!1),this.isDefaultPrevented=pn)},stopPropagation:function(){var e=this.nativeEvent;e&&(e.stopPropagation?e.stopPropagation():typeof e.cancelBubble!=`unknown`&&(e.cancelBubble=!0),this.isPropagationStopped=pn)},persist:function(){},isPersistent:pn}),t}var gn={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},_n=hn(gn),vn=h({},gn,{view:0,detail:0}),yn=hn(vn),bn,xn,Sn,Cn=h({},vn,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Pn,button:0,buttons:0,relatedTarget:function(e){return e.relatedTarget===void 0?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){return`movementX`in e?e.movementX:(e!==Sn&&(Sn&&e.type===`mousemove`?(bn=e.screenX-Sn.screenX,xn=e.screenY-Sn.screenY):xn=bn=0,Sn=e),bn)},movementY:function(e){return`movementY`in e?e.movementY:xn}}),wn=hn(Cn),Tn=hn(h({},Cn,{dataTransfer:0})),En=hn(h({},vn,{relatedTarget:0})),Dn=hn(h({},gn,{animationName:0,elapsedTime:0,pseudoElement:0})),On=hn(h({},gn,{clipboardData:function(e){return`clipboardData`in e?e.clipboardData:window.clipboardData}})),kn=hn(h({},gn,{data:0})),An={Esc:`Escape`,Spacebar:` `,Left:`ArrowLeft`,Up:`ArrowUp`,Right:`ArrowRight`,Down:`ArrowDown`,Del:`Delete`,Win:`OS`,Menu:`ContextMenu`,Apps:`ContextMenu`,Scroll:`ScrollLock`,MozPrintableKey:`Unidentified`},jn={8:`Backspace`,9:`Tab`,12:`Clear`,13:`Enter`,16:`Shift`,17:`Control`,18:`Alt`,19:`Pause`,20:`CapsLock`,27:`Escape`,32:` `,33:`PageUp`,34:`PageDown`,35:`End`,36:`Home`,37:`ArrowLeft`,38:`ArrowUp`,39:`ArrowRight`,40:`ArrowDown`,45:`Insert`,46:`Delete`,112:`F1`,113:`F2`,114:`F3`,115:`F4`,116:`F5`,117:`F6`,118:`F7`,119:`F8`,120:`F9`,121:`F10`,122:`F11`,123:`F12`,144:`NumLock`,145:`ScrollLock`,224:`Meta`},Mn={Alt:`altKey`,Control:`ctrlKey`,Meta:`metaKey`,Shift:`shiftKey`};function Nn(e){var t=this.nativeEvent;return t.getModifierState?t.getModifierState(e):(e=Mn[e])?!!t[e]:!1}function Pn(){return Nn}var Fn=hn(h({},vn,{key:function(e){if(e.key){var t=An[e.key]||e.key;if(t!==`Unidentified`)return t}return e.type===`keypress`?(e=H(e),e===13?`Enter`:String.fromCharCode(e)):e.type===`keydown`||e.type===`keyup`?jn[e.keyCode]||`Unidentified`:``},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Pn,charCode:function(e){return e.type===`keypress`?H(e):0},keyCode:function(e){return e.type===`keydown`||e.type===`keyup`?e.keyCode:0},which:function(e){return e.type===`keypress`?H(e):e.type===`keydown`||e.type===`keyup`?e.keyCode:0}})),In=hn(h({},Cn,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0})),Ln=hn(h({},vn,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Pn})),U=hn(h({},gn,{propertyName:0,elapsedTime:0,pseudoElement:0})),Rn=hn(h({},Cn,{deltaX:function(e){return`deltaX`in e?e.deltaX:`wheelDeltaX`in e?-e.wheelDeltaX:0},deltaY:function(e){return`deltaY`in e?e.deltaY:`wheelDeltaY`in e?-e.wheelDeltaY:`wheelDelta`in e?-e.wheelDelta:0},deltaZ:0,deltaMode:0})),zn=hn(h({},gn,{newState:0,oldState:0})),Bn=[9,13,27,32],Vn=on&&`CompositionEvent`in window,W=null;on&&`documentMode`in document&&(W=document.documentMode);var Hn=on&&`TextEvent`in window&&!W,Un=on&&(!Vn||W&&8<W&&11>=W),Wn=` `,Gn=!1;function G(e,t){switch(e){case`keyup`:return Bn.indexOf(t.keyCode)!==-1;case`keydown`:return t.keyCode!==229;case`keypress`:case`mousedown`:case`focusout`:return!0;default:return!1}}function Kn(e){return e=e.detail,typeof e==`object`&&`data`in e?e.data:null}var qn=!1;function Jn(e,t){switch(e){case`compositionend`:return Kn(t);case`keypress`:return t.which===32?(Gn=!0,Wn):null;case`textInput`:return e=t.data,e===Wn&&Gn?null:e;default:return null}}function Yn(e,t){if(qn)return e===`compositionend`||!Vn&&G(e,t)?(e=fn(),dn=un=ln=null,qn=!1,e):null;switch(e){case`paste`:return null;case`keypress`:if(!(t.ctrlKey||t.altKey||t.metaKey)||t.ctrlKey&&t.altKey){if(t.char&&1<t.char.length)return t.char;if(t.which)return String.fromCharCode(t.which)}return null;case`compositionend`:return Un&&t.locale!==`ko`?null:t.data;default:return null}}var Xn={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function Zn(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t===`input`?!!Xn[e.type]:t===`textarea`}function Qn(e,t,n,r){$t?en?en.push(r):en=[r]:$t=r,t=Td(t,`onChange`),0<t.length&&(n=new _n(`onChange`,`change`,null,n,r),e.push({event:n,listeners:t}))}var $n=null,er=null;function tr(e){vd(e,0)}function nr(e){if(Mt(_t(e)))return e}function rr(e,t){if(e===`change`)return t}var ir=!1;if(on){var ar;if(on){var or=`oninput`in document;if(!or){var sr=document.createElement(`div`);sr.setAttribute(`oninput`,`return;`),or=typeof sr.oninput==`function`}ar=or}else ar=!1;ir=ar&&(!document.documentMode||9<document.documentMode)}function cr(){$n&&($n.detachEvent(`onpropertychange`,lr),er=$n=null)}function lr(e){if(e.propertyName===`value`&&nr(er)){var t=[];Qn(t,er,e,Qt(e)),rn(tr,t)}}function ur(e,t,n){e===`focusin`?(cr(),$n=t,er=n,$n.attachEvent(`onpropertychange`,lr)):e===`focusout`&&cr()}function dr(e){if(e===`selectionchange`||e===`keyup`||e===`keydown`)return nr(er)}function fr(e,t){if(e===`click`)return nr(t)}function pr(e,t){if(e===`input`||e===`change`)return nr(t)}function mr(e,t){return e===t&&(e!==0||1/e==1/t)||e!==e&&t!==t}var hr=typeof Object.is==`function`?Object.is:mr;function gr(e,t){if(hr(e,t))return!0;if(typeof e!=`object`||!e||typeof t!=`object`||!t)return!1;var n=Object.keys(e),r=Object.keys(t);if(n.length!==r.length)return!1;for(r=0;r<n.length;r++){var i=n[r];if(!xe.call(t,i)||!hr(e[i],t[i]))return!1}return!0}function _r(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function vr(e,t){var n=_r(e);e=0;for(var r;n;){if(n.nodeType===3){if(r=e+n.textContent.length,e<=t&&r>=t)return{node:n,offset:t-e};e=r}a:{for(;n;){if(n.nextSibling){n=n.nextSibling;break a}n=n.parentNode}n=void 0}n=_r(n)}}function yr(e,t){return e&&t?e===t?!0:e&&e.nodeType===3?!1:t&&t.nodeType===3?yr(e,t.parentNode):`contains`in e?e.contains(t):e.compareDocumentPosition?!!(e.compareDocumentPosition(t)&16):!1:!1}function br(e){e=e!=null&&e.ownerDocument!=null&&e.ownerDocument.defaultView!=null?e.ownerDocument.defaultView:window;for(var t=Nt(e.document);t instanceof e.HTMLIFrameElement;){try{var n=typeof t.contentWindow.location.href==`string`}catch{n=!1}if(n)e=t.contentWindow;else break;t=Nt(e.document)}return t}function xr(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t&&(t===`input`&&(e.type===`text`||e.type===`search`||e.type===`tel`||e.type===`url`||e.type===`password`)||t===`textarea`||e.contentEditable===`true`)}var Sr=on&&`documentMode`in document&&11>=document.documentMode,Cr=null,wr=null,Tr=null,Er=!1;function Dr(e,t,n){var r=n.window===n?n.document:n.nodeType===9?n:n.ownerDocument;Er||Cr==null||Cr!==Nt(r)||(r=Cr,`selectionStart`in r&&xr(r)?r={start:r.selectionStart,end:r.selectionEnd}:(r=(r.ownerDocument&&r.ownerDocument.defaultView||window).getSelection(),r={anchorNode:r.anchorNode,anchorOffset:r.anchorOffset,focusNode:r.focusNode,focusOffset:r.focusOffset}),Tr&&gr(Tr,r)||(Tr=r,r=Td(wr,`onSelect`),0<r.length&&(t=new _n(`onSelect`,`select`,null,t,n),e.push({event:t,listeners:r}),t.target=Cr)))}function Or(e,t){var n={};return n[e.toLowerCase()]=t.toLowerCase(),n[`Webkit`+e]=`webkit`+t,n[`Moz`+e]=`moz`+t,n}var kr={animationend:Or(`Animation`,`AnimationEnd`),animationiteration:Or(`Animation`,`AnimationIteration`),animationstart:Or(`Animation`,`AnimationStart`),transitionrun:Or(`Transition`,`TransitionRun`),transitionstart:Or(`Transition`,`TransitionStart`),transitioncancel:Or(`Transition`,`TransitionCancel`),transitionend:Or(`Transition`,`TransitionEnd`)},Ar={},jr={};on&&(jr=document.createElement(`div`).style,`AnimationEvent`in window||(delete kr.animationend.animation,delete kr.animationiteration.animation,delete kr.animationstart.animation),`TransitionEvent`in window||delete kr.transitionend.transition);function Mr(e){if(Ar[e])return Ar[e];if(!kr[e])return e;var t=kr[e],n;for(n in t)if(t.hasOwnProperty(n)&&n in jr)return Ar[e]=t[n];return e}var Nr=Mr(`animationend`),Pr=Mr(`animationiteration`),Fr=Mr(`animationstart`),Ir=Mr(`transitionrun`),Lr=Mr(`transitionstart`),Rr=Mr(`transitioncancel`),zr=Mr(`transitionend`),Br=new Map,Vr=`abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel`.split(` `);Vr.push(`scrollEnd`);function Hr(e,t){Br.set(e,t),xt(t,[e])}var Ur=typeof reportError==`function`?reportError:function(e){if(typeof window==`object`&&typeof window.ErrorEvent==`function`){var t=new window.ErrorEvent(`error`,{bubbles:!0,cancelable:!0,message:typeof e==`object`&&e&&typeof e.message==`string`?String(e.message):String(e),error:e});if(!window.dispatchEvent(t))return}else if(typeof process==`object`&&typeof process.emit==`function`){process.emit(`uncaughtException`,e);return}console.error(e)},Wr=[],Gr=0,Kr=0;function qr(){for(var e=Gr,t=Kr=Gr=0;t<e;){var n=Wr[t];Wr[t++]=null;var r=Wr[t];Wr[t++]=null;var i=Wr[t];Wr[t++]=null;var a=Wr[t];if(Wr[t++]=null,r!==null&&i!==null){var o=r.pending;o===null?i.next=i:(i.next=o.next,o.next=i),r.pending=i}a!==0&&Zr(n,i,a)}}function Jr(e,t,n,r){Wr[Gr++]=e,Wr[Gr++]=t,Wr[Gr++]=n,Wr[Gr++]=r,Kr|=r,e.lanes|=r,e=e.alternate,e!==null&&(e.lanes|=r)}function Yr(e,t,n,r){return Jr(e,t,n,r),Qr(e)}function Xr(e,t){return Jr(e,null,null,t),Qr(e)}function Zr(e,t,n){e.lanes|=n;var r=e.alternate;r!==null&&(r.lanes|=n);for(var i=!1,a=e.return;a!==null;)a.childLanes|=n,r=a.alternate,r!==null&&(r.childLanes|=n),a.tag===22&&(e=a.stateNode,e===null||e._visibility&1||(i=!0)),e=a,a=a.return;return e.tag===3?(a=e.stateNode,i&&t!==null&&(i=31-Re(n),e=a.hiddenUpdates,r=e[i],r===null?e[i]=[t]:r.push(t),t.lane=n|536870912),a):null}function Qr(e){if(50<uu)throw uu=0,du=null,Error(i(185));for(var t=e.return;t!==null;)e=t,t=e.return;return e.tag===3?e.stateNode:null}var $r={};function ei(e,t,n,r){this.tag=e,this.key=n,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.refCleanup=this.ref=null,this.pendingProps=t,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=r,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function ti(e,t,n,r){return new ei(e,t,n,r)}function ni(e){return e=e.prototype,!(!e||!e.isReactComponent)}function ri(e,t){var n=e.alternate;return n===null?(n=ti(e.tag,t,e.key,e.mode),n.elementType=e.elementType,n.type=e.type,n.stateNode=e.stateNode,n.alternate=e,e.alternate=n):(n.pendingProps=t,n.type=e.type,n.flags=0,n.subtreeFlags=0,n.deletions=null),n.flags=e.flags&65011712,n.childLanes=e.childLanes,n.lanes=e.lanes,n.child=e.child,n.memoizedProps=e.memoizedProps,n.memoizedState=e.memoizedState,n.updateQueue=e.updateQueue,t=e.dependencies,n.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext},n.sibling=e.sibling,n.index=e.index,n.ref=e.ref,n.refCleanup=e.refCleanup,n}function ii(e,t){e.flags&=65011714;var n=e.alternate;return n===null?(e.childLanes=0,e.lanes=t,e.child=null,e.subtreeFlags=0,e.memoizedProps=null,e.memoizedState=null,e.updateQueue=null,e.dependencies=null,e.stateNode=null):(e.childLanes=n.childLanes,e.lanes=n.lanes,e.child=n.child,e.subtreeFlags=0,e.deletions=null,e.memoizedProps=n.memoizedProps,e.memoizedState=n.memoizedState,e.updateQueue=n.updateQueue,e.type=n.type,t=n.dependencies,e.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext}),e}function ai(e,t,n,r,a,o){var s=0;if(r=e,typeof e==`function`)ni(e)&&(s=1);else if(typeof e==`string`)s=Uf(e,n,F.current)?26:e===`html`||e===`head`||e===`body`?27:5;else a:switch(e){case O:return e=ti(31,n,t,a),e.elementType=O,e.lanes=o,e;case y:return oi(n.children,a,o,t);case b:s=8,a|=24;break;case x:return e=ti(12,n,t,a|2),e.elementType=x,e.lanes=o,e;case w:return e=ti(13,n,t,a),e.elementType=w,e.lanes=o,e;case T:return e=ti(19,n,t,a),e.elementType=T,e.lanes=o,e;default:if(typeof e==`object`&&e)switch(e.$$typeof){case S:s=10;break a;case ee:s=9;break a;case C:s=11;break a;case E:s=14;break a;case D:s=16,r=null;break a}s=29,n=Error(i(130,e===null?`null`:typeof e,``)),r=null}return t=ti(s,n,t,a),t.elementType=e,t.type=r,t.lanes=o,t}function oi(e,t,n,r){return e=ti(7,e,r,t),e.lanes=n,e}function si(e,t,n){return e=ti(6,e,null,t),e.lanes=n,e}function ci(e){var t=ti(18,null,null,0);return t.stateNode=e,t}function li(e,t,n){return t=ti(4,e.children===null?[]:e.children,e.key,t),t.lanes=n,t.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation},t}var ui=new WeakMap;function di(e,t){if(typeof e==`object`&&e){var n=ui.get(e);return n===void 0?(t={value:e,source:t,stack:be(t)},ui.set(e,t),t):n}return{value:e,source:t,stack:be(t)}}var fi=[],pi=0,mi=null,hi=0,gi=[],_i=0,vi=null,yi=1,bi=``;function xi(e,t){fi[pi++]=hi,fi[pi++]=mi,mi=e,hi=t}function Si(e,t,n){gi[_i++]=yi,gi[_i++]=bi,gi[_i++]=vi,vi=e;var r=yi;e=bi;var i=32-Re(r)-1;r&=~(1<<i),n+=1;var a=32-Re(t)+i;if(30<a){var o=i-i%5;a=(r&(1<<o)-1).toString(32),r>>=o,i-=o,yi=1<<32-Re(t)+i|n<<i|r,bi=a+e}else yi=1<<a|n<<i|r,bi=e}function Ci(e){e.return!==null&&(xi(e,1),Si(e,1,0))}function wi(e){for(;e===mi;)mi=fi[--pi],fi[pi]=null,hi=fi[--pi],fi[pi]=null;for(;e===vi;)vi=gi[--_i],gi[_i]=null,bi=gi[--_i],gi[_i]=null,yi=gi[--_i],gi[_i]=null}function Ti(e,t){gi[_i++]=yi,gi[_i++]=bi,gi[_i++]=vi,yi=t.id,bi=t.overflow,vi=e}var Ei=null,Di=null,K=!1,Oi=null,ki=!1,Ai=Error(i(519));function ji(e){throw Li(di(Error(i(418,1<arguments.length&&arguments[1]!==void 0&&arguments[1]?`text`:`HTML`,``)),e)),Ai}function Mi(e){var t=e.stateNode,n=e.type,r=e.memoizedProps;switch(t[ot]=e,t[st]=r,n){case`dialog`:$(`cancel`,t),$(`close`,t);break;case`iframe`:case`object`:case`embed`:$(`load`,t);break;case`video`:case`audio`:for(n=0;n<gd.length;n++)$(gd[n],t);break;case`source`:$(`error`,t);break;case`img`:case`image`:case`link`:$(`error`,t),$(`load`,t);break;case`details`:$(`toggle`,t);break;case`input`:$(`invalid`,t),Lt(t,r.value,r.defaultValue,r.checked,r.defaultChecked,r.type,r.name,!0);break;case`select`:$(`invalid`,t);break;case`textarea`:$(`invalid`,t),Vt(t,r.value,r.defaultValue,r.children)}n=r.children,typeof n!=`string`&&typeof n!=`number`&&typeof n!=`bigint`||t.textContent===``+n||!0===r.suppressHydrationWarning||jd(t.textContent,n)?(r.popover!=null&&($(`beforetoggle`,t),$(`toggle`,t)),r.onScroll!=null&&$(`scroll`,t),r.onScrollEnd!=null&&$(`scrollend`,t),r.onClick!=null&&(t.onclick=Xt),t=!0):t=!1,t||ji(e,!0)}function Ni(e){for(Ei=e.return;Ei;)switch(Ei.tag){case 5:case 31:case 13:ki=!1;return;case 27:case 3:ki=!0;return;default:Ei=Ei.return}}function Pi(e){if(e!==Ei)return!1;if(!K)return Ni(e),K=!0,!1;var t=e.tag,n;if((n=t!==3&&t!==27)&&((n=t===5)&&(n=e.type,n=!(n!==`form`&&n!==`button`)||Ud(e.type,e.memoizedProps)),n=!n),n&&Di&&ji(e),Ni(e),t===13){if(e=e.memoizedState,e=e===null?null:e.dehydrated,!e)throw Error(i(317));Di=uf(e)}else if(t===31){if(e=e.memoizedState,e=e===null?null:e.dehydrated,!e)throw Error(i(317));Di=uf(e)}else t===27?(t=Di,Zd(e.type)?(e=lf,lf=null,Di=e):Di=t):Di=Ei?cf(e.stateNode.nextSibling):null;return!0}function Fi(){Di=Ei=null,K=!1}function Ii(){var e=Oi;return e!==null&&(Xl===null?Xl=e:Xl.push.apply(Xl,e),Oi=null),e}function Li(e){Oi===null?Oi=[e]:Oi.push(e)}var Ri=se(null),zi=null,Bi=null;function Vi(e,t,n){P(Ri,t._currentValue),t._currentValue=n}function Hi(e){e._currentValue=Ri.current,ce(Ri)}function Ui(e,t,n){for(;e!==null;){var r=e.alternate;if((e.childLanes&t)===t?r!==null&&(r.childLanes&t)!==t&&(r.childLanes|=t):(e.childLanes|=t,r!==null&&(r.childLanes|=t)),e===n)break;e=e.return}}function Wi(e,t,n,r){var a=e.child;for(a!==null&&(a.return=e);a!==null;){var o=a.dependencies;if(o!==null){var s=a.child;o=o.firstContext;a:for(;o!==null;){var c=o;o=a;for(var l=0;l<t.length;l++)if(c.context===t[l]){o.lanes|=n,c=o.alternate,c!==null&&(c.lanes|=n),Ui(o.return,n,e),r||(s=null);break a}o=c.next}}else if(a.tag===18){if(s=a.return,s===null)throw Error(i(341));s.lanes|=n,o=s.alternate,o!==null&&(o.lanes|=n),Ui(s,n,e),s=null}else s=a.child;if(s!==null)s.return=a;else for(s=a;s!==null;){if(s===e){s=null;break}if(a=s.sibling,a!==null){a.return=s.return,s=a;break}s=s.return}a=s}}function Gi(e,t,n,r){e=null;for(var a=t,o=!1;a!==null;){if(!o){if(a.flags&524288)o=!0;else if(a.flags&262144)break}if(a.tag===10){var s=a.alternate;if(s===null)throw Error(i(387));if(s=s.memoizedProps,s!==null){var c=a.type;hr(a.pendingProps.value,s.value)||(e===null?e=[c]:e.push(c))}}else if(a===ue.current){if(s=a.alternate,s===null)throw Error(i(387));s.memoizedState.memoizedState!==a.memoizedState.memoizedState&&(e===null?e=[Qf]:e.push(Qf))}a=a.return}e!==null&&Wi(t,e,n,r),t.flags|=262144}function Ki(e){for(e=e.firstContext;e!==null;){if(!hr(e.context._currentValue,e.memoizedValue))return!0;e=e.next}return!1}function qi(e){zi=e,Bi=null,e=e.dependencies,e!==null&&(e.firstContext=null)}function Ji(e){return Xi(zi,e)}function Yi(e,t){return zi===null&&qi(e),Xi(e,t)}function Xi(e,t){var n=t._currentValue;if(t={context:t,memoizedValue:n,next:null},Bi===null){if(e===null)throw Error(i(308));Bi=t,e.dependencies={lanes:0,firstContext:t},e.flags|=524288}else Bi=Bi.next=t;return n}var Zi=typeof AbortController<`u`?AbortController:function(){var e=[],t=this.signal={aborted:!1,addEventListener:function(t,n){e.push(n)}};this.abort=function(){t.aborted=!0,e.forEach(function(e){return e()})}},Qi=t.unstable_scheduleCallback,$i=t.unstable_NormalPriority,ea={$$typeof:S,Consumer:null,Provider:null,_currentValue:null,_currentValue2:null,_threadCount:0};function ta(){return{controller:new Zi,data:new Map,refCount:0}}function na(e){e.refCount--,e.refCount===0&&Qi($i,function(){e.controller.abort()})}var ra=null,ia=0,aa=0,oa=null;function sa(e,t){if(ra===null){var n=ra=[];ia=0,aa=ud(),oa={status:`pending`,value:void 0,then:function(e){n.push(e)}}}return ia++,t.then(ca,ca),t}function ca(){if(--ia===0&&ra!==null){oa!==null&&(oa.status=`fulfilled`);var e=ra;ra=null,aa=0,oa=null;for(var t=0;t<e.length;t++)(0,e[t])()}}function la(e,t){var n=[],r={status:`pending`,value:null,reason:null,then:function(e){n.push(e)}};return e.then(function(){r.status=`fulfilled`,r.value=t;for(var e=0;e<n.length;e++)(0,n[e])(t)},function(e){for(r.status=`rejected`,r.reason=e,e=0;e<n.length;e++)(0,n[e])(void 0)}),r}var ua=M.S;M.S=function(e,t){$l=Ee(),typeof t==`object`&&t&&typeof t.then==`function`&&sa(e,t),ua!==null&&ua(e,t)};var da=se(null);function fa(){var e=da.current;return e===null?Ll.pooledCache:e}function pa(e,t){t===null?P(da,da.current):P(da,t.pool)}function ma(){var e=fa();return e===null?null:{parent:ea._currentValue,pool:e}}var ha=Error(i(460)),ga=Error(i(474)),_a=Error(i(542)),va={then:function(){}};function ya(e){return e=e.status,e===`fulfilled`||e===`rejected`}function ba(e,t,n){switch(n=e[n],n===void 0?e.push(t):n!==t&&(t.then(Xt,Xt),t=n),t.status){case`fulfilled`:return t.value;case`rejected`:throw e=t.reason,wa(e),e;default:if(typeof t.status==`string`)t.then(Xt,Xt);else{if(e=Ll,e!==null&&100<e.shellSuspendCounter)throw Error(i(482));e=t,e.status=`pending`,e.then(function(e){if(t.status===`pending`){var n=t;n.status=`fulfilled`,n.value=e}},function(e){if(t.status===`pending`){var n=t;n.status=`rejected`,n.reason=e}})}switch(t.status){case`fulfilled`:return t.value;case`rejected`:throw e=t.reason,wa(e),e}throw Sa=t,ha}}function xa(e){try{var t=e._init;return t(e._payload)}catch(e){throw typeof e==`object`&&e&&typeof e.then==`function`?(Sa=e,ha):e}}var Sa=null;function Ca(){if(Sa===null)throw Error(i(459));var e=Sa;return Sa=null,e}function wa(e){if(e===ha||e===_a)throw Error(i(483))}var Ta=null,Ea=0;function Da(e){var t=Ea;return Ea+=1,Ta===null&&(Ta=[]),ba(Ta,e,t)}function Oa(e,t){t=t.props.ref,e.ref=t===void 0?null:t}function ka(e,t){throw t.$$typeof===g?Error(i(525)):(e=Object.prototype.toString.call(t),Error(i(31,e===`[object Object]`?`object with keys {`+Object.keys(t).join(`, `)+`}`:e)))}function Aa(e){function t(t,n){if(e){var r=t.deletions;r===null?(t.deletions=[n],t.flags|=16):r.push(n)}}function n(n,r){if(!e)return null;for(;r!==null;)t(n,r),r=r.sibling;return null}function r(e){for(var t=new Map;e!==null;)e.key===null?t.set(e.index,e):t.set(e.key,e),e=e.sibling;return t}function a(e,t){return e=ri(e,t),e.index=0,e.sibling=null,e}function o(t,n,r){return t.index=r,e?(r=t.alternate,r===null?(t.flags|=67108866,n):(r=r.index,r<n?(t.flags|=67108866,n):r)):(t.flags|=1048576,n)}function s(t){return e&&t.alternate===null&&(t.flags|=67108866),t}function c(e,t,n,r){return t===null||t.tag!==6?(t=si(n,e.mode,r),t.return=e,t):(t=a(t,n),t.return=e,t)}function l(e,t,n,r){var i=n.type;return i===y?d(e,t,n.props.children,r,n.key):t!==null&&(t.elementType===i||typeof i==`object`&&i&&i.$$typeof===D&&xa(i)===t.type)?(t=a(t,n.props),Oa(t,n),t.return=e,t):(t=ai(n.type,n.key,n.props,null,e.mode,r),Oa(t,n),t.return=e,t)}function u(e,t,n,r){return t===null||t.tag!==4||t.stateNode.containerInfo!==n.containerInfo||t.stateNode.implementation!==n.implementation?(t=li(n,e.mode,r),t.return=e,t):(t=a(t,n.children||[]),t.return=e,t)}function d(e,t,n,r,i){return t===null||t.tag!==7?(t=oi(n,e.mode,r,i),t.return=e,t):(t=a(t,n),t.return=e,t)}function f(e,t,n){if(typeof t==`string`&&t!==``||typeof t==`number`||typeof t==`bigint`)return t=si(``+t,e.mode,n),t.return=e,t;if(typeof t==`object`&&t){switch(t.$$typeof){case _:return n=ai(t.type,t.key,t.props,null,e.mode,n),Oa(n,t),n.return=e,n;case v:return t=li(t,e.mode,n),t.return=e,t;case D:return t=xa(t),f(e,t,n)}if(j(t)||te(t))return t=oi(t,e.mode,n,null),t.return=e,t;if(typeof t.then==`function`)return f(e,Da(t),n);if(t.$$typeof===S)return f(e,Yi(e,t),n);ka(e,t)}return null}function p(e,t,n,r){var i=t===null?null:t.key;if(typeof n==`string`&&n!==``||typeof n==`number`||typeof n==`bigint`)return i===null?c(e,t,``+n,r):null;if(typeof n==`object`&&n){switch(n.$$typeof){case _:return n.key===i?l(e,t,n,r):null;case v:return n.key===i?u(e,t,n,r):null;case D:return n=xa(n),p(e,t,n,r)}if(j(n)||te(n))return i===null?d(e,t,n,r,null):null;if(typeof n.then==`function`)return p(e,t,Da(n),r);if(n.$$typeof===S)return p(e,t,Yi(e,n),r);ka(e,n)}return null}function m(e,t,n,r,i){if(typeof r==`string`&&r!==``||typeof r==`number`||typeof r==`bigint`)return e=e.get(n)||null,c(t,e,``+r,i);if(typeof r==`object`&&r){switch(r.$$typeof){case _:return e=e.get(r.key===null?n:r.key)||null,l(t,e,r,i);case v:return e=e.get(r.key===null?n:r.key)||null,u(t,e,r,i);case D:return r=xa(r),m(e,t,n,r,i)}if(j(r)||te(r))return e=e.get(n)||null,d(t,e,r,i,null);if(typeof r.then==`function`)return m(e,t,n,Da(r),i);if(r.$$typeof===S)return m(e,t,n,Yi(t,r),i);ka(t,r)}return null}function h(i,a,s,c){for(var l=null,u=null,d=a,h=a=0,g=null;d!==null&&h<s.length;h++){d.index>h?(g=d,d=null):g=d.sibling;var _=p(i,d,s[h],c);if(_===null){d===null&&(d=g);break}e&&d&&_.alternate===null&&t(i,d),a=o(_,a,h),u===null?l=_:u.sibling=_,u=_,d=g}if(h===s.length)return n(i,d),K&&xi(i,h),l;if(d===null){for(;h<s.length;h++)d=f(i,s[h],c),d!==null&&(a=o(d,a,h),u===null?l=d:u.sibling=d,u=d);return K&&xi(i,h),l}for(d=r(d);h<s.length;h++)g=m(d,i,h,s[h],c),g!==null&&(e&&g.alternate!==null&&d.delete(g.key===null?h:g.key),a=o(g,a,h),u===null?l=g:u.sibling=g,u=g);return e&&d.forEach(function(e){return t(i,e)}),K&&xi(i,h),l}function g(a,s,c,l){if(c==null)throw Error(i(151));for(var u=null,d=null,h=s,g=s=0,_=null,v=c.next();h!==null&&!v.done;g++,v=c.next()){h.index>g?(_=h,h=null):_=h.sibling;var y=p(a,h,v.value,l);if(y===null){h===null&&(h=_);break}e&&h&&y.alternate===null&&t(a,h),s=o(y,s,g),d===null?u=y:d.sibling=y,d=y,h=_}if(v.done)return n(a,h),K&&xi(a,g),u;if(h===null){for(;!v.done;g++,v=c.next())v=f(a,v.value,l),v!==null&&(s=o(v,s,g),d===null?u=v:d.sibling=v,d=v);return K&&xi(a,g),u}for(h=r(h);!v.done;g++,v=c.next())v=m(h,a,g,v.value,l),v!==null&&(e&&v.alternate!==null&&h.delete(v.key===null?g:v.key),s=o(v,s,g),d===null?u=v:d.sibling=v,d=v);return e&&h.forEach(function(e){return t(a,e)}),K&&xi(a,g),u}function b(e,r,o,c){if(typeof o==`object`&&o&&o.type===y&&o.key===null&&(o=o.props.children),typeof o==`object`&&o){switch(o.$$typeof){case _:a:{for(var l=o.key;r!==null;){if(r.key===l){if(l=o.type,l===y){if(r.tag===7){n(e,r.sibling),c=a(r,o.props.children),c.return=e,e=c;break a}}else if(r.elementType===l||typeof l==`object`&&l&&l.$$typeof===D&&xa(l)===r.type){n(e,r.sibling),c=a(r,o.props),Oa(c,o),c.return=e,e=c;break a}n(e,r);break}else t(e,r);r=r.sibling}o.type===y?(c=oi(o.props.children,e.mode,c,o.key),c.return=e,e=c):(c=ai(o.type,o.key,o.props,null,e.mode,c),Oa(c,o),c.return=e,e=c)}return s(e);case v:a:{for(l=o.key;r!==null;){if(r.key===l)if(r.tag===4&&r.stateNode.containerInfo===o.containerInfo&&r.stateNode.implementation===o.implementation){n(e,r.sibling),c=a(r,o.children||[]),c.return=e,e=c;break a}else{n(e,r);break}else t(e,r);r=r.sibling}c=li(o,e.mode,c),c.return=e,e=c}return s(e);case D:return o=xa(o),b(e,r,o,c)}if(j(o))return h(e,r,o,c);if(te(o)){if(l=te(o),typeof l!=`function`)throw Error(i(150));return o=l.call(o),g(e,r,o,c)}if(typeof o.then==`function`)return b(e,r,Da(o),c);if(o.$$typeof===S)return b(e,r,Yi(e,o),c);ka(e,o)}return typeof o==`string`&&o!==``||typeof o==`number`||typeof o==`bigint`?(o=``+o,r!==null&&r.tag===6?(n(e,r.sibling),c=a(r,o),c.return=e,e=c):(n(e,r),c=si(o,e.mode,c),c.return=e,e=c),s(e)):n(e,r)}return function(e,t,n,r){try{Ea=0;var i=b(e,t,n,r);return Ta=null,i}catch(t){if(t===ha||t===_a)throw t;var a=ti(29,t,null,e.mode);return a.lanes=r,a.return=e,a}}}var ja=Aa(!0),Ma=Aa(!1),Na=!1;function Pa(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,lanes:0,hiddenCallbacks:null},callbacks:null}}function Fa(e,t){e=e.updateQueue,t.updateQueue===e&&(t.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,callbacks:null})}function Ia(e){return{lane:e,tag:0,payload:null,callback:null,next:null}}function La(e,t,n){var r=e.updateQueue;if(r===null)return null;if(r=r.shared,J&2){var i=r.pending;return i===null?t.next=t:(t.next=i.next,i.next=t),r.pending=t,t=Qr(e),Zr(e,null,n),t}return Jr(e,r,t,n),Qr(e)}function Ra(e,t,n){if(t=t.updateQueue,t!==null&&(t=t.shared,n&4194048)){var r=t.lanes;r&=e.pendingLanes,n|=r,t.lanes=n,$e(e,n)}}function za(e,t){var n=e.updateQueue,r=e.alternate;if(r!==null&&(r=r.updateQueue,n===r)){var i=null,a=null;if(n=n.firstBaseUpdate,n!==null){do{var o={lane:n.lane,tag:n.tag,payload:n.payload,callback:null,next:null};a===null?i=a=o:a=a.next=o,n=n.next}while(n!==null);a===null?i=a=t:a=a.next=t}else i=a=t;n={baseState:r.baseState,firstBaseUpdate:i,lastBaseUpdate:a,shared:r.shared,callbacks:r.callbacks},e.updateQueue=n;return}e=n.lastBaseUpdate,e===null?n.firstBaseUpdate=t:e.next=t,n.lastBaseUpdate=t}var Ba=!1;function Va(){if(Ba){var e=oa;if(e!==null)throw e}}function Ha(e,t,n,r){Ba=!1;var i=e.updateQueue;Na=!1;var a=i.firstBaseUpdate,o=i.lastBaseUpdate,s=i.shared.pending;if(s!==null){i.shared.pending=null;var c=s,l=c.next;c.next=null,o===null?a=l:o.next=l,o=c;var u=e.alternate;u!==null&&(u=u.updateQueue,s=u.lastBaseUpdate,s!==o&&(s===null?u.firstBaseUpdate=l:s.next=l,u.lastBaseUpdate=c))}if(a!==null){var d=i.baseState;o=0,u=l=c=null,s=a;do{var f=s.lane&-536870913,p=f!==s.lane;if(p?(X&f)===f:(r&f)===f){f!==0&&f===aa&&(Ba=!0),u!==null&&(u=u.next={lane:0,tag:s.tag,payload:s.payload,callback:null,next:null});a:{var m=e,g=s;f=t;var _=n;switch(g.tag){case 1:if(m=g.payload,typeof m==`function`){d=m.call(_,d,f);break a}d=m;break a;case 3:m.flags=m.flags&-65537|128;case 0:if(m=g.payload,f=typeof m==`function`?m.call(_,d,f):m,f==null)break a;d=h({},d,f);break a;case 2:Na=!0}}f=s.callback,f!==null&&(e.flags|=64,p&&(e.flags|=8192),p=i.callbacks,p===null?i.callbacks=[f]:p.push(f))}else p={lane:f,tag:s.tag,payload:s.payload,callback:s.callback,next:null},u===null?(l=u=p,c=d):u=u.next=p,o|=f;if(s=s.next,s===null){if(s=i.shared.pending,s===null)break;p=s,s=p.next,p.next=null,i.lastBaseUpdate=p,i.shared.pending=null}}while(1);u===null&&(c=d),i.baseState=c,i.firstBaseUpdate=l,i.lastBaseUpdate=u,a===null&&(i.shared.lanes=0),Wl|=o,e.lanes=o,e.memoizedState=d}}function Ua(e,t){if(typeof e!=`function`)throw Error(i(191,e));e.call(t)}function Wa(e,t){var n=e.callbacks;if(n!==null)for(e.callbacks=null,e=0;e<n.length;e++)Ua(n[e],t)}var Ga=se(null),Ka=se(0);function qa(e,t){e=Hl,P(Ka,e),P(Ga,t),Hl=e|t.baseLanes}function Ja(){P(Ka,Hl),P(Ga,Ga.current)}function Ya(){Hl=Ka.current,ce(Ga),ce(Ka)}var Xa=se(null),Za=null;function Qa(e){var t=e.alternate;P(ro,ro.current&1),P(Xa,e),Za===null&&(t===null||Ga.current!==null||t.memoizedState!==null)&&(Za=e)}function $a(e){P(ro,ro.current),P(Xa,e),Za===null&&(Za=e)}function eo(e){e.tag===22?(P(ro,ro.current),P(Xa,e),Za===null&&(Za=e)):to(e)}function to(){P(ro,ro.current),P(Xa,Xa.current)}function no(e){ce(Xa),Za===e&&(Za=null),ce(ro)}var ro=se(0);function io(e){for(var t=e;t!==null;){if(t.tag===13){var n=t.memoizedState;if(n!==null&&(n=n.dehydrated,n===null||af(n)||of(n)))return t}else if(t.tag===19&&(t.memoizedProps.revealOrder===`forwards`||t.memoizedProps.revealOrder===`backwards`||t.memoizedProps.revealOrder===`unstable_legacy-backwards`||t.memoizedProps.revealOrder===`together`)){if(t.flags&128)return t}else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return null;t=t.return}t.sibling.return=t.return,t=t.sibling}return null}var ao=0,q=null,oo=null,so=null,co=!1,lo=!1,uo=!1,fo=0,po=0,mo=null,ho=0;function go(){throw Error(i(321))}function _o(e,t){if(t===null)return!1;for(var n=0;n<t.length&&n<e.length;n++)if(!hr(e[n],t[n]))return!1;return!0}function vo(e,t,n,r,i,a){return ao=a,q=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,M.H=e===null||e.memoizedState===null?Fs:Is,uo=!1,a=n(r,i),uo=!1,lo&&(a=bo(t,n,r,i)),yo(e),a}function yo(e){M.H=Ps;var t=oo!==null&&oo.next!==null;if(ao=0,so=oo=q=null,co=!1,po=0,mo=null,t)throw Error(i(300));e===null||$s||(e=e.dependencies,e!==null&&Ki(e)&&($s=!0))}function bo(e,t,n,r){q=e;var a=0;do{if(lo&&(mo=null),po=0,lo=!1,25<=a)throw Error(i(301));if(a+=1,so=oo=null,e.updateQueue!=null){var o=e.updateQueue;o.lastEffect=null,o.events=null,o.stores=null,o.memoCache!=null&&(o.memoCache.index=0)}M.H=Ls,o=t(n,r)}while(lo);return o}function xo(){var e=M.H,t=e.useState()[0];return t=typeof t.then==`function`?Oo(t):t,e=e.useState()[0],(oo===null?null:oo.memoizedState)!==e&&(q.flags|=1024),t}function So(){var e=fo!==0;return fo=0,e}function Co(e,t,n){t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~n}function wo(e){if(co){for(e=e.memoizedState;e!==null;){var t=e.queue;t!==null&&(t.pending=null),e=e.next}co=!1}ao=0,so=oo=q=null,lo=!1,po=fo=0,mo=null}function To(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return so===null?q.memoizedState=so=e:so=so.next=e,so}function Eo(){if(oo===null){var e=q.alternate;e=e===null?null:e.memoizedState}else e=oo.next;var t=so===null?q.memoizedState:so.next;if(t!==null)so=t,oo=e;else{if(e===null)throw q.alternate===null?Error(i(467)):Error(i(310));oo=e,e={memoizedState:oo.memoizedState,baseState:oo.baseState,baseQueue:oo.baseQueue,queue:oo.queue,next:null},so===null?q.memoizedState=so=e:so=so.next=e}return so}function Do(){return{lastEffect:null,events:null,stores:null,memoCache:null}}function Oo(e){var t=po;return po+=1,mo===null&&(mo=[]),e=ba(mo,e,t),t=q,(so===null?t.memoizedState:so.next)===null&&(t=t.alternate,M.H=t===null||t.memoizedState===null?Fs:Is),e}function ko(e){if(typeof e==`object`&&e){if(typeof e.then==`function`)return Oo(e);if(e.$$typeof===S)return Ji(e)}throw Error(i(438,String(e)))}function Ao(e){var t=null,n=q.updateQueue;if(n!==null&&(t=n.memoCache),t==null){var r=q.alternate;r!==null&&(r=r.updateQueue,r!==null&&(r=r.memoCache,r!=null&&(t={data:r.data.map(function(e){return e.slice()}),index:0})))}if(t??={data:[],index:0},n===null&&(n=Do(),q.updateQueue=n),n.memoCache=t,n=t.data[t.index],n===void 0)for(n=t.data[t.index]=Array(e),r=0;r<e;r++)n[r]=k;return t.index++,n}function jo(e,t){return typeof t==`function`?t(e):t}function Mo(e){return No(Eo(),oo,e)}function No(e,t,n){var r=e.queue;if(r===null)throw Error(i(311));r.lastRenderedReducer=n;var a=e.baseQueue,o=r.pending;if(o!==null){if(a!==null){var s=a.next;a.next=o.next,o.next=s}t.baseQueue=a=o,r.pending=null}if(o=e.baseState,a===null)e.memoizedState=o;else{t=a.next;var c=s=null,l=null,u=t,d=!1;do{var f=u.lane&-536870913;if(f===u.lane?(ao&f)===f:(X&f)===f){var p=u.revertLane;if(p===0)l!==null&&(l=l.next={lane:0,revertLane:0,gesture:null,action:u.action,hasEagerState:u.hasEagerState,eagerState:u.eagerState,next:null}),f===aa&&(d=!0);else if((ao&p)===p){u=u.next,p===aa&&(d=!0);continue}else f={lane:0,revertLane:u.revertLane,gesture:null,action:u.action,hasEagerState:u.hasEagerState,eagerState:u.eagerState,next:null},l===null?(c=l=f,s=o):l=l.next=f,q.lanes|=p,Wl|=p;f=u.action,uo&&n(o,f),o=u.hasEagerState?u.eagerState:n(o,f)}else p={lane:f,revertLane:u.revertLane,gesture:u.gesture,action:u.action,hasEagerState:u.hasEagerState,eagerState:u.eagerState,next:null},l===null?(c=l=p,s=o):l=l.next=p,q.lanes|=f,Wl|=f;u=u.next}while(u!==null&&u!==t);if(l===null?s=o:l.next=c,!hr(o,e.memoizedState)&&($s=!0,d&&(n=oa,n!==null)))throw n;e.memoizedState=o,e.baseState=s,e.baseQueue=l,r.lastRenderedState=o}return a===null&&(r.lanes=0),[e.memoizedState,r.dispatch]}function Po(e){var t=Eo(),n=t.queue;if(n===null)throw Error(i(311));n.lastRenderedReducer=e;var r=n.dispatch,a=n.pending,o=t.memoizedState;if(a!==null){n.pending=null;var s=a=a.next;do o=e(o,s.action),s=s.next;while(s!==a);hr(o,t.memoizedState)||($s=!0),t.memoizedState=o,t.baseQueue===null&&(t.baseState=o),n.lastRenderedState=o}return[o,r]}function Fo(e,t,n){var r=q,a=Eo(),o=K;if(o){if(n===void 0)throw Error(i(407));n=n()}else n=t();var s=!hr((oo||a).memoizedState,n);if(s&&(a.memoizedState=n,$s=!0),a=a.queue,os(Ro.bind(null,r,a,e),[e]),a.getSnapshot!==t||s||so!==null&&so.memoizedState.tag&1){if(r.flags|=2048,ts(9,{destroy:void 0},Lo.bind(null,r,a,n,t),null),Ll===null)throw Error(i(349));o||ao&127||Io(r,t,n)}return n}function Io(e,t,n){e.flags|=16384,e={getSnapshot:t,value:n},t=q.updateQueue,t===null?(t=Do(),q.updateQueue=t,t.stores=[e]):(n=t.stores,n===null?t.stores=[e]:n.push(e))}function Lo(e,t,n,r){t.value=n,t.getSnapshot=r,zo(t)&&Bo(e)}function Ro(e,t,n){return n(function(){zo(t)&&Bo(e)})}function zo(e){var t=e.getSnapshot;e=e.value;try{var n=t();return!hr(e,n)}catch{return!0}}function Bo(e){var t=Xr(e,2);t!==null&&mu(t,e,2)}function Vo(e){var t=To();if(typeof e==`function`){var n=e;if(e=n(),uo){Le(!0);try{n()}finally{Le(!1)}}}return t.memoizedState=t.baseState=e,t.queue={pending:null,lanes:0,dispatch:null,lastRenderedReducer:jo,lastRenderedState:e},t}function Ho(e,t,n,r){return e.baseState=n,No(e,oo,typeof r==`function`?r:jo)}function Uo(e,t,n,r,a){if(js(e))throw Error(i(485));if(e=t.action,e!==null){var o={payload:a,action:e,next:null,isTransition:!0,status:`pending`,value:null,reason:null,listeners:[],then:function(e){o.listeners.push(e)}};M.T===null?o.isTransition=!1:n(!0),r(o),n=t.pending,n===null?(o.next=t.pending=o,Wo(t,o)):(o.next=n.next,t.pending=n.next=o)}}function Wo(e,t){var n=t.action,r=t.payload,i=e.state;if(t.isTransition){var a=M.T,o={};M.T=o;try{var s=n(i,r),c=M.S;c!==null&&c(o,s),Go(e,t,s)}catch(n){qo(e,t,n)}finally{a!==null&&o.types!==null&&(a.types=o.types),M.T=a}}else try{a=n(i,r),Go(e,t,a)}catch(n){qo(e,t,n)}}function Go(e,t,n){typeof n==`object`&&n&&typeof n.then==`function`?n.then(function(n){Ko(e,t,n)},function(n){return qo(e,t,n)}):Ko(e,t,n)}function Ko(e,t,n){t.status=`fulfilled`,t.value=n,Jo(t),e.state=n,t=e.pending,t!==null&&(n=t.next,n===t?e.pending=null:(n=n.next,t.next=n,Wo(e,n)))}function qo(e,t,n){var r=e.pending;if(e.pending=null,r!==null){r=r.next;do t.status=`rejected`,t.reason=n,Jo(t),t=t.next;while(t!==r)}e.action=null}function Jo(e){e=e.listeners;for(var t=0;t<e.length;t++)(0,e[t])()}function Yo(e,t){return t}function Xo(e,t){if(K){var n=Ll.formState;if(n!==null){a:{var r=q;if(K){if(Di){b:{for(var i=Di,a=ki;i.nodeType!==8;){if(!a){i=null;break b}if(i=cf(i.nextSibling),i===null){i=null;break b}}a=i.data,i=a===`F!`||a===`F`?i:null}if(i){Di=cf(i.nextSibling),r=i.data===`F!`;break a}}ji(r)}r=!1}r&&(t=n[0])}}return n=To(),n.memoizedState=n.baseState=t,r={pending:null,lanes:0,dispatch:null,lastRenderedReducer:Yo,lastRenderedState:t},n.queue=r,n=Os.bind(null,q,r),r.dispatch=n,r=Vo(!1),a=As.bind(null,q,!1,r.queue),r=To(),i={state:t,dispatch:null,action:e,pending:null},r.queue=i,n=Uo.bind(null,q,i,a,n),i.dispatch=n,r.memoizedState=e,[t,n,!1]}function Zo(e){return Qo(Eo(),oo,e)}function Qo(e,t,n){if(t=No(e,t,Yo)[0],e=Mo(jo)[0],typeof t==`object`&&t&&typeof t.then==`function`)try{var r=Oo(t)}catch(e){throw e===ha?_a:e}else r=t;t=Eo();var i=t.queue,a=i.dispatch;return n!==t.memoizedState&&(q.flags|=2048,ts(9,{destroy:void 0},$o.bind(null,i,n),null)),[r,a,e]}function $o(e,t){e.action=t}function es(e){var t=Eo(),n=oo;if(n!==null)return Qo(t,n,e);Eo(),t=t.memoizedState,n=Eo();var r=n.queue.dispatch;return n.memoizedState=e,[t,r,!1]}function ts(e,t,n,r){return e={tag:e,create:n,deps:r,inst:t,next:null},t=q.updateQueue,t===null&&(t=Do(),q.updateQueue=t),n=t.lastEffect,n===null?t.lastEffect=e.next=e:(r=n.next,n.next=e,e.next=r,t.lastEffect=e),e}function ns(){return Eo().memoizedState}function rs(e,t,n,r){var i=To();q.flags|=e,i.memoizedState=ts(1|t,{destroy:void 0},n,r===void 0?null:r)}function is(e,t,n,r){var i=Eo();r=r===void 0?null:r;var a=i.memoizedState.inst;oo!==null&&r!==null&&_o(r,oo.memoizedState.deps)?i.memoizedState=ts(t,a,n,r):(q.flags|=e,i.memoizedState=ts(1|t,a,n,r))}function as(e,t){rs(8390656,8,e,t)}function os(e,t){is(2048,8,e,t)}function ss(e){q.flags|=4;var t=q.updateQueue;if(t===null)t=Do(),q.updateQueue=t,t.events=[e];else{var n=t.events;n===null?t.events=[e]:n.push(e)}}function cs(e){var t=Eo().memoizedState;return ss({ref:t,nextImpl:e}),function(){if(J&2)throw Error(i(440));return t.impl.apply(void 0,arguments)}}function ls(e,t){return is(4,2,e,t)}function us(e,t){return is(4,4,e,t)}function ds(e,t){if(typeof t==`function`){e=e();var n=t(e);return function(){typeof n==`function`?n():t(null)}}if(t!=null)return e=e(),t.current=e,function(){t.current=null}}function fs(e,t,n){n=n==null?null:n.concat([e]),is(4,4,ds.bind(null,t,e),n)}function ps(){}function ms(e,t){var n=Eo();t=t===void 0?null:t;var r=n.memoizedState;return t!==null&&_o(t,r[1])?r[0]:(n.memoizedState=[e,t],e)}function hs(e,t){var n=Eo();t=t===void 0?null:t;var r=n.memoizedState;if(t!==null&&_o(t,r[1]))return r[0];if(r=e(),uo){Le(!0);try{e()}finally{Le(!1)}}return n.memoizedState=[r,t],r}function gs(e,t,n){return n===void 0||ao&1073741824&&!(X&261930)?e.memoizedState=t:(e.memoizedState=n,e=pu(),q.lanes|=e,Wl|=e,n)}function _s(e,t,n,r){return hr(n,t)?n:Ga.current===null?!(ao&42)||ao&1073741824&&!(X&261930)?($s=!0,e.memoizedState=n):(e=pu(),q.lanes|=e,Wl|=e,t):(e=gs(e,n,r),hr(e,t)||($s=!0),e)}function vs(e,t,n,r,i){var a=N.p;N.p=a!==0&&8>a?a:8;var o=M.T,s={};M.T=s,As(e,!1,t,n);try{var c=i(),l=M.S;l!==null&&l(s,c),typeof c==`object`&&c&&typeof c.then==`function`?ks(e,t,la(c,r),fu(e)):ks(e,t,r,fu(e))}catch(n){ks(e,t,{then:function(){},status:`rejected`,reason:n},fu())}finally{N.p=a,o!==null&&s.types!==null&&(o.types=s.types),M.T=o}}function ys(){}function bs(e,t,n,r){if(e.tag!==5)throw Error(i(476));var a=xs(e).queue;vs(e,a,t,ie,n===null?ys:function(){return Ss(e),n(r)})}function xs(e){var t=e.memoizedState;if(t!==null)return t;t={memoizedState:ie,baseState:ie,baseQueue:null,queue:{pending:null,lanes:0,dispatch:null,lastRenderedReducer:jo,lastRenderedState:ie},next:null};var n={};return t.next={memoizedState:n,baseState:n,baseQueue:null,queue:{pending:null,lanes:0,dispatch:null,lastRenderedReducer:jo,lastRenderedState:n},next:null},e.memoizedState=t,e=e.alternate,e!==null&&(e.memoizedState=t),t}function Ss(e){var t=xs(e);t.next===null&&(t=e.alternate.memoizedState),ks(e,t.next.queue,{},fu())}function Cs(){return Ji(Qf)}function ws(){return Eo().memoizedState}function Ts(){return Eo().memoizedState}function Es(e){for(var t=e.return;t!==null;){switch(t.tag){case 24:case 3:var n=fu();e=Ia(n);var r=La(t,e,n);r!==null&&(mu(r,t,n),Ra(r,t,n)),t={cache:ta()},e.payload=t;return}t=t.return}}function Ds(e,t,n){var r=fu();n={lane:r,revertLane:0,gesture:null,action:n,hasEagerState:!1,eagerState:null,next:null},js(e)?Ms(t,n):(n=Yr(e,t,n,r),n!==null&&(mu(n,e,r),Ns(n,t,r)))}function Os(e,t,n){ks(e,t,n,fu())}function ks(e,t,n,r){var i={lane:r,revertLane:0,gesture:null,action:n,hasEagerState:!1,eagerState:null,next:null};if(js(e))Ms(t,i);else{var a=e.alternate;if(e.lanes===0&&(a===null||a.lanes===0)&&(a=t.lastRenderedReducer,a!==null))try{var o=t.lastRenderedState,s=a(o,n);if(i.hasEagerState=!0,i.eagerState=s,hr(s,o))return Jr(e,t,i,0),Ll===null&&qr(),!1}catch{}if(n=Yr(e,t,i,r),n!==null)return mu(n,e,r),Ns(n,t,r),!0}return!1}function As(e,t,n,r){if(r={lane:2,revertLane:ud(),gesture:null,action:r,hasEagerState:!1,eagerState:null,next:null},js(e)){if(t)throw Error(i(479))}else t=Yr(e,n,r,2),t!==null&&mu(t,e,2)}function js(e){var t=e.alternate;return e===q||t!==null&&t===q}function Ms(e,t){lo=co=!0;var n=e.pending;n===null?t.next=t:(t.next=n.next,n.next=t),e.pending=t}function Ns(e,t,n){if(n&4194048){var r=t.lanes;r&=e.pendingLanes,n|=r,t.lanes=n,$e(e,n)}}var Ps={readContext:Ji,use:ko,useCallback:go,useContext:go,useEffect:go,useImperativeHandle:go,useLayoutEffect:go,useInsertionEffect:go,useMemo:go,useReducer:go,useRef:go,useState:go,useDebugValue:go,useDeferredValue:go,useTransition:go,useSyncExternalStore:go,useId:go,useHostTransitionStatus:go,useFormState:go,useActionState:go,useOptimistic:go,useMemoCache:go,useCacheRefresh:go};Ps.useEffectEvent=go;var Fs={readContext:Ji,use:ko,useCallback:function(e,t){return To().memoizedState=[e,t===void 0?null:t],e},useContext:Ji,useEffect:as,useImperativeHandle:function(e,t,n){n=n==null?null:n.concat([e]),rs(4194308,4,ds.bind(null,t,e),n)},useLayoutEffect:function(e,t){return rs(4194308,4,e,t)},useInsertionEffect:function(e,t){rs(4,2,e,t)},useMemo:function(e,t){var n=To();t=t===void 0?null:t;var r=e();if(uo){Le(!0);try{e()}finally{Le(!1)}}return n.memoizedState=[r,t],r},useReducer:function(e,t,n){var r=To();if(n!==void 0){var i=n(t);if(uo){Le(!0);try{n(t)}finally{Le(!1)}}}else i=t;return r.memoizedState=r.baseState=i,e={pending:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:i},r.queue=e,e=e.dispatch=Ds.bind(null,q,e),[r.memoizedState,e]},useRef:function(e){var t=To();return e={current:e},t.memoizedState=e},useState:function(e){e=Vo(e);var t=e.queue,n=Os.bind(null,q,t);return t.dispatch=n,[e.memoizedState,n]},useDebugValue:ps,useDeferredValue:function(e,t){return gs(To(),e,t)},useTransition:function(){var e=Vo(!1);return e=vs.bind(null,q,e.queue,!0,!1),To().memoizedState=e,[!1,e]},useSyncExternalStore:function(e,t,n){var r=q,a=To();if(K){if(n===void 0)throw Error(i(407));n=n()}else{if(n=t(),Ll===null)throw Error(i(349));X&127||Io(r,t,n)}a.memoizedState=n;var o={value:n,getSnapshot:t};return a.queue=o,as(Ro.bind(null,r,o,e),[e]),r.flags|=2048,ts(9,{destroy:void 0},Lo.bind(null,r,o,n,t),null),n},useId:function(){var e=To(),t=Ll.identifierPrefix;if(K){var n=bi,r=yi;n=(r&~(1<<32-Re(r)-1)).toString(32)+n,t=`_`+t+`R_`+n,n=fo++,0<n&&(t+=`H`+n.toString(32)),t+=`_`}else n=ho++,t=`_`+t+`r_`+n.toString(32)+`_`;return e.memoizedState=t},useHostTransitionStatus:Cs,useFormState:Xo,useActionState:Xo,useOptimistic:function(e){var t=To();t.memoizedState=t.baseState=e;var n={pending:null,lanes:0,dispatch:null,lastRenderedReducer:null,lastRenderedState:null};return t.queue=n,t=As.bind(null,q,!0,n),n.dispatch=t,[e,t]},useMemoCache:Ao,useCacheRefresh:function(){return To().memoizedState=Es.bind(null,q)},useEffectEvent:function(e){var t=To(),n={impl:e};return t.memoizedState=n,function(){if(J&2)throw Error(i(440));return n.impl.apply(void 0,arguments)}}},Is={readContext:Ji,use:ko,useCallback:ms,useContext:Ji,useEffect:os,useImperativeHandle:fs,useInsertionEffect:ls,useLayoutEffect:us,useMemo:hs,useReducer:Mo,useRef:ns,useState:function(){return Mo(jo)},useDebugValue:ps,useDeferredValue:function(e,t){return _s(Eo(),oo.memoizedState,e,t)},useTransition:function(){var e=Mo(jo)[0],t=Eo().memoizedState;return[typeof e==`boolean`?e:Oo(e),t]},useSyncExternalStore:Fo,useId:ws,useHostTransitionStatus:Cs,useFormState:Zo,useActionState:Zo,useOptimistic:function(e,t){return Ho(Eo(),oo,e,t)},useMemoCache:Ao,useCacheRefresh:Ts};Is.useEffectEvent=cs;var Ls={readContext:Ji,use:ko,useCallback:ms,useContext:Ji,useEffect:os,useImperativeHandle:fs,useInsertionEffect:ls,useLayoutEffect:us,useMemo:hs,useReducer:Po,useRef:ns,useState:function(){return Po(jo)},useDebugValue:ps,useDeferredValue:function(e,t){var n=Eo();return oo===null?gs(n,e,t):_s(n,oo.memoizedState,e,t)},useTransition:function(){var e=Po(jo)[0],t=Eo().memoizedState;return[typeof e==`boolean`?e:Oo(e),t]},useSyncExternalStore:Fo,useId:ws,useHostTransitionStatus:Cs,useFormState:es,useActionState:es,useOptimistic:function(e,t){var n=Eo();return oo===null?(n.baseState=e,[e,n.queue.dispatch]):Ho(n,oo,e,t)},useMemoCache:Ao,useCacheRefresh:Ts};Ls.useEffectEvent=cs;function Rs(e,t,n,r){t=e.memoizedState,n=n(r,t),n=n==null?t:h({},t,n),e.memoizedState=n,e.lanes===0&&(e.updateQueue.baseState=n)}var zs={enqueueSetState:function(e,t,n){e=e._reactInternals;var r=fu(),i=Ia(r);i.payload=t,n!=null&&(i.callback=n),t=La(e,i,r),t!==null&&(mu(t,e,r),Ra(t,e,r))},enqueueReplaceState:function(e,t,n){e=e._reactInternals;var r=fu(),i=Ia(r);i.tag=1,i.payload=t,n!=null&&(i.callback=n),t=La(e,i,r),t!==null&&(mu(t,e,r),Ra(t,e,r))},enqueueForceUpdate:function(e,t){e=e._reactInternals;var n=fu(),r=Ia(n);r.tag=2,t!=null&&(r.callback=t),t=La(e,r,n),t!==null&&(mu(t,e,n),Ra(t,e,n))}};function Bs(e,t,n,r,i,a,o){return e=e.stateNode,typeof e.shouldComponentUpdate==`function`?e.shouldComponentUpdate(r,a,o):t.prototype&&t.prototype.isPureReactComponent?!gr(n,r)||!gr(i,a):!0}function Vs(e,t,n,r){e=t.state,typeof t.componentWillReceiveProps==`function`&&t.componentWillReceiveProps(n,r),typeof t.UNSAFE_componentWillReceiveProps==`function`&&t.UNSAFE_componentWillReceiveProps(n,r),t.state!==e&&zs.enqueueReplaceState(t,t.state,null)}function Hs(e,t){var n=t;if(`ref`in t)for(var r in n={},t)r!==`ref`&&(n[r]=t[r]);if(e=e.defaultProps)for(var i in n===t&&(n=h({},n)),e)n[i]===void 0&&(n[i]=e[i]);return n}function Us(e){Ur(e)}function Ws(e){console.error(e)}function Gs(e){Ur(e)}function Ks(e,t){try{var n=e.onUncaughtError;n(t.value,{componentStack:t.stack})}catch(e){setTimeout(function(){throw e})}}function qs(e,t,n){try{var r=e.onCaughtError;r(n.value,{componentStack:n.stack,errorBoundary:t.tag===1?t.stateNode:null})}catch(e){setTimeout(function(){throw e})}}function Js(e,t,n){return n=Ia(n),n.tag=3,n.payload={element:null},n.callback=function(){Ks(e,t)},n}function Ys(e){return e=Ia(e),e.tag=3,e}function Xs(e,t,n,r){var i=n.type.getDerivedStateFromError;if(typeof i==`function`){var a=r.value;e.payload=function(){return i(a)},e.callback=function(){qs(t,n,r)}}var o=n.stateNode;o!==null&&typeof o.componentDidCatch==`function`&&(e.callback=function(){qs(t,n,r),typeof i!=`function`&&(nu===null?nu=new Set([this]):nu.add(this));var e=r.stack;this.componentDidCatch(r.value,{componentStack:e===null?``:e})})}function Zs(e,t,n,r,a){if(n.flags|=32768,typeof r==`object`&&r&&typeof r.then==`function`){if(t=n.alternate,t!==null&&Gi(t,n,a,!0),n=Xa.current,n!==null){switch(n.tag){case 31:case 13:return Za===null?Eu():n.alternate===null&&Ul===0&&(Ul=3),n.flags&=-257,n.flags|=65536,n.lanes=a,r===va?n.flags|=16384:(t=n.updateQueue,t===null?n.updateQueue=new Set([r]):t.add(r),Wu(e,r,a)),!1;case 22:return n.flags|=65536,r===va?n.flags|=16384:(t=n.updateQueue,t===null?(t={transitions:null,markerInstances:null,retryQueue:new Set([r])},n.updateQueue=t):(n=t.retryQueue,n===null?t.retryQueue=new Set([r]):n.add(r)),Wu(e,r,a)),!1}throw Error(i(435,n.tag))}return Wu(e,r,a),Eu(),!1}if(K)return t=Xa.current,t===null?(r!==Ai&&(t=Error(i(423),{cause:r}),Li(di(t,n))),e=e.current.alternate,e.flags|=65536,a&=-a,e.lanes|=a,r=di(r,n),a=Js(e.stateNode,r,a),za(e,a),Ul!==4&&(Ul=2)):(!(t.flags&65536)&&(t.flags|=256),t.flags|=65536,t.lanes=a,r!==Ai&&(e=Error(i(422),{cause:r}),Li(di(e,n)))),!1;var o=Error(i(520),{cause:r});if(o=di(o,n),Yl===null?Yl=[o]:Yl.push(o),Ul!==4&&(Ul=2),t===null)return!0;r=di(r,n),n=t;do{switch(n.tag){case 3:return n.flags|=65536,e=a&-a,n.lanes|=e,e=Js(n.stateNode,r,e),za(n,e),!1;case 1:if(t=n.type,o=n.stateNode,!(n.flags&128)&&(typeof t.getDerivedStateFromError==`function`||o!==null&&typeof o.componentDidCatch==`function`&&(nu===null||!nu.has(o))))return n.flags|=65536,a&=-a,n.lanes|=a,a=Ys(a),Xs(a,e,n,r),za(n,a),!1}n=n.return}while(n!==null);return!1}var Qs=Error(i(461)),$s=!1;function ec(e,t,n,r){t.child=e===null?Ma(t,null,n,r):ja(t,e.child,n,r)}function tc(e,t,n,r,i){n=n.render;var a=t.ref;if(`ref`in r){var o={};for(var s in r)s!==`ref`&&(o[s]=r[s])}else o=r;return qi(t),r=vo(e,t,n,o,a,i),s=So(),e!==null&&!$s?(Co(e,t,i),Tc(e,t,i)):(K&&s&&Ci(t),t.flags|=1,ec(e,t,r,i),t.child)}function nc(e,t,n,r,i){if(e===null){var a=n.type;return typeof a==`function`&&!ni(a)&&a.defaultProps===void 0&&n.compare===null?(t.tag=15,t.type=a,rc(e,t,a,r,i)):(e=ai(n.type,null,r,t,t.mode,i),e.ref=t.ref,e.return=t,t.child=e)}if(a=e.child,!Ec(e,i)){var o=a.memoizedProps;if(n=n.compare,n=n===null?gr:n,n(o,r)&&e.ref===t.ref)return Tc(e,t,i)}return t.flags|=1,e=ri(a,r),e.ref=t.ref,e.return=t,t.child=e}function rc(e,t,n,r,i){if(e!==null){var a=e.memoizedProps;if(gr(a,r)&&e.ref===t.ref)if($s=!1,t.pendingProps=r=a,Ec(e,i))e.flags&131072&&($s=!0);else return t.lanes=e.lanes,Tc(e,t,i)}return dc(e,t,n,r,i)}function ic(e,t,n,r){var i=r.children,a=e===null?null:e.memoizedState;if(e===null&&t.stateNode===null&&(t.stateNode={_visibility:1,_pendingMarkers:null,_retryCache:null,_transitions:null}),r.mode===`hidden`){if(t.flags&128){if(a=a===null?n:a.baseLanes|n,e!==null){for(r=t.child=e.child,i=0;r!==null;)i=i|r.lanes|r.childLanes,r=r.sibling;r=i&~a}else r=0,t.child=null;return oc(e,t,a,n,r)}if(n&536870912)t.memoizedState={baseLanes:0,cachePool:null},e!==null&&pa(t,a===null?null:a.cachePool),a===null?Ja():qa(t,a),eo(t);else return r=t.lanes=536870912,oc(e,t,a===null?n:a.baseLanes|n,n,r)}else a===null?(e!==null&&pa(t,null),Ja(),to(t)):(pa(t,a.cachePool),qa(t,a),to(t),t.memoizedState=null);return ec(e,t,i,n),t.child}function ac(e,t){return e!==null&&e.tag===22||t.stateNode!==null||(t.stateNode={_visibility:1,_pendingMarkers:null,_retryCache:null,_transitions:null}),t.sibling}function oc(e,t,n,r,i){var a=fa();return a=a===null?null:{parent:ea._currentValue,pool:a},t.memoizedState={baseLanes:n,cachePool:a},e!==null&&pa(t,null),Ja(),eo(t),e!==null&&Gi(e,t,r,!0),t.childLanes=i,null}function sc(e,t){return t=bc({mode:t.mode,children:t.children},e.mode),t.ref=e.ref,e.child=t,t.return=e,t}function cc(e,t,n){return ja(t,e.child,null,n),e=sc(t,t.pendingProps),e.flags|=2,no(t),t.memoizedState=null,e}function lc(e,t,n){var r=t.pendingProps,a=(t.flags&128)!=0;if(t.flags&=-129,e===null){if(K){if(r.mode===`hidden`)return e=sc(t,r),t.lanes=536870912,ac(null,e);if($a(t),(e=Di)?(e=rf(e,ki),e=e!==null&&e.data===`&`?e:null,e!==null&&(t.memoizedState={dehydrated:e,treeContext:vi===null?null:{id:yi,overflow:bi},retryLane:536870912,hydrationErrors:null},n=ci(e),n.return=t,t.child=n,Ei=t,Di=null)):e=null,e===null)throw ji(t);return t.lanes=536870912,null}return sc(t,r)}var o=e.memoizedState;if(o!==null){var s=o.dehydrated;if($a(t),a)if(t.flags&256)t.flags&=-257,t=cc(e,t,n);else if(t.memoizedState!==null)t.child=e.child,t.flags|=128,t=null;else throw Error(i(558));else if($s||Gi(e,t,n,!1),a=(n&e.childLanes)!==0,$s||a){if(r=Ll,r!==null&&(s=et(r,n),s!==0&&s!==o.retryLane))throw o.retryLane=s,Xr(e,s),mu(r,e,s),Qs;Eu(),t=cc(e,t,n)}else e=o.treeContext,Di=cf(s.nextSibling),Ei=t,K=!0,Oi=null,ki=!1,e!==null&&Ti(t,e),t=sc(t,r),t.flags|=4096;return t}return e=ri(e.child,{mode:r.mode,children:r.children}),e.ref=t.ref,t.child=e,e.return=t,e}function uc(e,t){var n=t.ref;if(n===null)e!==null&&e.ref!==null&&(t.flags|=4194816);else{if(typeof n!=`function`&&typeof n!=`object`)throw Error(i(284));(e===null||e.ref!==n)&&(t.flags|=4194816)}}function dc(e,t,n,r,i){return qi(t),n=vo(e,t,n,r,void 0,i),r=So(),e!==null&&!$s?(Co(e,t,i),Tc(e,t,i)):(K&&r&&Ci(t),t.flags|=1,ec(e,t,n,i),t.child)}function fc(e,t,n,r,i,a){return qi(t),t.updateQueue=null,n=bo(t,r,n,i),yo(e),r=So(),e!==null&&!$s?(Co(e,t,a),Tc(e,t,a)):(K&&r&&Ci(t),t.flags|=1,ec(e,t,n,a),t.child)}function pc(e,t,n,r,i){if(qi(t),t.stateNode===null){var a=$r,o=n.contextType;typeof o==`object`&&o&&(a=Ji(o)),a=new n(r,a),t.memoizedState=a.state!==null&&a.state!==void 0?a.state:null,a.updater=zs,t.stateNode=a,a._reactInternals=t,a=t.stateNode,a.props=r,a.state=t.memoizedState,a.refs={},Pa(t),o=n.contextType,a.context=typeof o==`object`&&o?Ji(o):$r,a.state=t.memoizedState,o=n.getDerivedStateFromProps,typeof o==`function`&&(Rs(t,n,o,r),a.state=t.memoizedState),typeof n.getDerivedStateFromProps==`function`||typeof a.getSnapshotBeforeUpdate==`function`||typeof a.UNSAFE_componentWillMount!=`function`&&typeof a.componentWillMount!=`function`||(o=a.state,typeof a.componentWillMount==`function`&&a.componentWillMount(),typeof a.UNSAFE_componentWillMount==`function`&&a.UNSAFE_componentWillMount(),o!==a.state&&zs.enqueueReplaceState(a,a.state,null),Ha(t,r,a,i),Va(),a.state=t.memoizedState),typeof a.componentDidMount==`function`&&(t.flags|=4194308),r=!0}else if(e===null){a=t.stateNode;var s=t.memoizedProps,c=Hs(n,s);a.props=c;var l=a.context,u=n.contextType;o=$r,typeof u==`object`&&u&&(o=Ji(u));var d=n.getDerivedStateFromProps;u=typeof d==`function`||typeof a.getSnapshotBeforeUpdate==`function`,s=t.pendingProps!==s,u||typeof a.UNSAFE_componentWillReceiveProps!=`function`&&typeof a.componentWillReceiveProps!=`function`||(s||l!==o)&&Vs(t,a,r,o),Na=!1;var f=t.memoizedState;a.state=f,Ha(t,r,a,i),Va(),l=t.memoizedState,s||f!==l||Na?(typeof d==`function`&&(Rs(t,n,d,r),l=t.memoizedState),(c=Na||Bs(t,n,c,r,f,l,o))?(u||typeof a.UNSAFE_componentWillMount!=`function`&&typeof a.componentWillMount!=`function`||(typeof a.componentWillMount==`function`&&a.componentWillMount(),typeof a.UNSAFE_componentWillMount==`function`&&a.UNSAFE_componentWillMount()),typeof a.componentDidMount==`function`&&(t.flags|=4194308)):(typeof a.componentDidMount==`function`&&(t.flags|=4194308),t.memoizedProps=r,t.memoizedState=l),a.props=r,a.state=l,a.context=o,r=c):(typeof a.componentDidMount==`function`&&(t.flags|=4194308),r=!1)}else{a=t.stateNode,Fa(e,t),o=t.memoizedProps,u=Hs(n,o),a.props=u,d=t.pendingProps,f=a.context,l=n.contextType,c=$r,typeof l==`object`&&l&&(c=Ji(l)),s=n.getDerivedStateFromProps,(l=typeof s==`function`||typeof a.getSnapshotBeforeUpdate==`function`)||typeof a.UNSAFE_componentWillReceiveProps!=`function`&&typeof a.componentWillReceiveProps!=`function`||(o!==d||f!==c)&&Vs(t,a,r,c),Na=!1,f=t.memoizedState,a.state=f,Ha(t,r,a,i),Va();var p=t.memoizedState;o!==d||f!==p||Na||e!==null&&e.dependencies!==null&&Ki(e.dependencies)?(typeof s==`function`&&(Rs(t,n,s,r),p=t.memoizedState),(u=Na||Bs(t,n,u,r,f,p,c)||e!==null&&e.dependencies!==null&&Ki(e.dependencies))?(l||typeof a.UNSAFE_componentWillUpdate!=`function`&&typeof a.componentWillUpdate!=`function`||(typeof a.componentWillUpdate==`function`&&a.componentWillUpdate(r,p,c),typeof a.UNSAFE_componentWillUpdate==`function`&&a.UNSAFE_componentWillUpdate(r,p,c)),typeof a.componentDidUpdate==`function`&&(t.flags|=4),typeof a.getSnapshotBeforeUpdate==`function`&&(t.flags|=1024)):(typeof a.componentDidUpdate!=`function`||o===e.memoizedProps&&f===e.memoizedState||(t.flags|=4),typeof a.getSnapshotBeforeUpdate!=`function`||o===e.memoizedProps&&f===e.memoizedState||(t.flags|=1024),t.memoizedProps=r,t.memoizedState=p),a.props=r,a.state=p,a.context=c,r=u):(typeof a.componentDidUpdate!=`function`||o===e.memoizedProps&&f===e.memoizedState||(t.flags|=4),typeof a.getSnapshotBeforeUpdate!=`function`||o===e.memoizedProps&&f===e.memoizedState||(t.flags|=1024),r=!1)}return a=r,uc(e,t),r=(t.flags&128)!=0,a||r?(a=t.stateNode,n=r&&typeof n.getDerivedStateFromError!=`function`?null:a.render(),t.flags|=1,e!==null&&r?(t.child=ja(t,e.child,null,i),t.child=ja(t,null,n,i)):ec(e,t,n,i),t.memoizedState=a.state,e=t.child):e=Tc(e,t,i),e}function mc(e,t,n,r){return Fi(),t.flags|=256,ec(e,t,n,r),t.child}var hc={dehydrated:null,treeContext:null,retryLane:0,hydrationErrors:null};function gc(e){return{baseLanes:e,cachePool:ma()}}function _c(e,t,n){return e=e===null?0:e.childLanes&~n,t&&(e|=ql),e}function vc(e,t,n){var r=t.pendingProps,a=!1,o=(t.flags&128)!=0,s;if((s=o)||(s=e!==null&&e.memoizedState===null?!1:(ro.current&2)!=0),s&&(a=!0,t.flags&=-129),s=(t.flags&32)!=0,t.flags&=-33,e===null){if(K){if(a?Qa(t):to(t),(e=Di)?(e=rf(e,ki),e=e!==null&&e.data!==`&`?e:null,e!==null&&(t.memoizedState={dehydrated:e,treeContext:vi===null?null:{id:yi,overflow:bi},retryLane:536870912,hydrationErrors:null},n=ci(e),n.return=t,t.child=n,Ei=t,Di=null)):e=null,e===null)throw ji(t);return of(e)?t.lanes=32:t.lanes=536870912,null}var c=r.children;return r=r.fallback,a?(to(t),a=t.mode,c=bc({mode:`hidden`,children:c},a),r=oi(r,a,n,null),c.return=t,r.return=t,c.sibling=r,t.child=c,r=t.child,r.memoizedState=gc(n),r.childLanes=_c(e,s,n),t.memoizedState=hc,ac(null,r)):(Qa(t),yc(t,c))}var l=e.memoizedState;if(l!==null&&(c=l.dehydrated,c!==null)){if(o)t.flags&256?(Qa(t),t.flags&=-257,t=xc(e,t,n)):t.memoizedState===null?(to(t),c=r.fallback,a=t.mode,r=bc({mode:`visible`,children:r.children},a),c=oi(c,a,n,null),c.flags|=2,r.return=t,c.return=t,r.sibling=c,t.child=r,ja(t,e.child,null,n),r=t.child,r.memoizedState=gc(n),r.childLanes=_c(e,s,n),t.memoizedState=hc,t=ac(null,r)):(to(t),t.child=e.child,t.flags|=128,t=null);else if(Qa(t),of(c)){if(s=c.nextSibling&&c.nextSibling.dataset,s)var u=s.dgst;s=u,r=Error(i(419)),r.stack=``,r.digest=s,Li({value:r,source:null,stack:null}),t=xc(e,t,n)}else if($s||Gi(e,t,n,!1),s=(n&e.childLanes)!==0,$s||s){if(s=Ll,s!==null&&(r=et(s,n),r!==0&&r!==l.retryLane))throw l.retryLane=r,Xr(e,r),mu(s,e,r),Qs;af(c)||Eu(),t=xc(e,t,n)}else af(c)?(t.flags|=192,t.child=e.child,t=null):(e=l.treeContext,Di=cf(c.nextSibling),Ei=t,K=!0,Oi=null,ki=!1,e!==null&&Ti(t,e),t=yc(t,r.children),t.flags|=4096);return t}return a?(to(t),c=r.fallback,a=t.mode,l=e.child,u=l.sibling,r=ri(l,{mode:`hidden`,children:r.children}),r.subtreeFlags=l.subtreeFlags&65011712,u===null?(c=oi(c,a,n,null),c.flags|=2):c=ri(u,c),c.return=t,r.return=t,r.sibling=c,t.child=r,ac(null,r),r=t.child,c=e.child.memoizedState,c===null?c=gc(n):(a=c.cachePool,a===null?a=ma():(l=ea._currentValue,a=a.parent===l?a:{parent:l,pool:l}),c={baseLanes:c.baseLanes|n,cachePool:a}),r.memoizedState=c,r.childLanes=_c(e,s,n),t.memoizedState=hc,ac(e.child,r)):(Qa(t),n=e.child,e=n.sibling,n=ri(n,{mode:`visible`,children:r.children}),n.return=t,n.sibling=null,e!==null&&(s=t.deletions,s===null?(t.deletions=[e],t.flags|=16):s.push(e)),t.child=n,t.memoizedState=null,n)}function yc(e,t){return t=bc({mode:`visible`,children:t},e.mode),t.return=e,e.child=t}function bc(e,t){return e=ti(22,e,null,t),e.lanes=0,e}function xc(e,t,n){return ja(t,e.child,null,n),e=yc(t,t.pendingProps.children),e.flags|=2,t.memoizedState=null,e}function Sc(e,t,n){e.lanes|=t;var r=e.alternate;r!==null&&(r.lanes|=t),Ui(e.return,t,n)}function Cc(e,t,n,r,i,a){var o=e.memoizedState;o===null?e.memoizedState={isBackwards:t,rendering:null,renderingStartTime:0,last:r,tail:n,tailMode:i,treeForkCount:a}:(o.isBackwards=t,o.rendering=null,o.renderingStartTime=0,o.last=r,o.tail=n,o.tailMode=i,o.treeForkCount=a)}function wc(e,t,n){var r=t.pendingProps,i=r.revealOrder,a=r.tail;r=r.children;var o=ro.current,s=(o&2)!=0;if(s?(o=o&1|2,t.flags|=128):o&=1,P(ro,o),ec(e,t,r,n),r=K?hi:0,!s&&e!==null&&e.flags&128)a:for(e=t.child;e!==null;){if(e.tag===13)e.memoizedState!==null&&Sc(e,n,t);else if(e.tag===19)Sc(e,n,t);else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break a;for(;e.sibling===null;){if(e.return===null||e.return===t)break a;e=e.return}e.sibling.return=e.return,e=e.sibling}switch(i){case`forwards`:for(n=t.child,i=null;n!==null;)e=n.alternate,e!==null&&io(e)===null&&(i=n),n=n.sibling;n=i,n===null?(i=t.child,t.child=null):(i=n.sibling,n.sibling=null),Cc(t,!1,i,n,a,r);break;case`backwards`:case`unstable_legacy-backwards`:for(n=null,i=t.child,t.child=null;i!==null;){if(e=i.alternate,e!==null&&io(e)===null){t.child=i;break}e=i.sibling,i.sibling=n,n=i,i=e}Cc(t,!0,n,null,a,r);break;case`together`:Cc(t,!1,null,null,void 0,r);break;default:t.memoizedState=null}return t.child}function Tc(e,t,n){if(e!==null&&(t.dependencies=e.dependencies),Wl|=t.lanes,(n&t.childLanes)===0)if(e!==null){if(Gi(e,t,n,!1),(n&t.childLanes)===0)return null}else return null;if(e!==null&&t.child!==e.child)throw Error(i(153));if(t.child!==null){for(e=t.child,n=ri(e,e.pendingProps),t.child=n,n.return=t;e.sibling!==null;)e=e.sibling,n=n.sibling=ri(e,e.pendingProps),n.return=t;n.sibling=null}return t.child}function Ec(e,t){return(e.lanes&t)===0?(e=e.dependencies,!!(e!==null&&Ki(e))):!0}function Dc(e,t,n){switch(t.tag){case 3:de(t,t.stateNode.containerInfo),Vi(t,ea,e.memoizedState.cache),Fi();break;case 27:case 5:pe(t);break;case 4:de(t,t.stateNode.containerInfo);break;case 10:Vi(t,t.type,t.memoizedProps.value);break;case 31:if(t.memoizedState!==null)return t.flags|=128,$a(t),null;break;case 13:var r=t.memoizedState;if(r!==null)return r.dehydrated===null?(n&t.child.childLanes)===0?(Qa(t),e=Tc(e,t,n),e===null?null:e.sibling):vc(e,t,n):(Qa(t),t.flags|=128,null);Qa(t);break;case 19:var i=(e.flags&128)!=0;if(r=(n&t.childLanes)!==0,r||=(Gi(e,t,n,!1),(n&t.childLanes)!==0),i){if(r)return wc(e,t,n);t.flags|=128}if(i=t.memoizedState,i!==null&&(i.rendering=null,i.tail=null,i.lastEffect=null),P(ro,ro.current),r)break;return null;case 22:return t.lanes=0,ic(e,t,n,t.pendingProps);case 24:Vi(t,ea,e.memoizedState.cache)}return Tc(e,t,n)}function Oc(e,t,n){if(e!==null)if(e.memoizedProps!==t.pendingProps)$s=!0;else{if(!Ec(e,n)&&!(t.flags&128))return $s=!1,Dc(e,t,n);$s=!!(e.flags&131072)}else $s=!1,K&&t.flags&1048576&&Si(t,hi,t.index);switch(t.lanes=0,t.tag){case 16:a:{var r=t.pendingProps;if(e=xa(t.elementType),t.type=e,typeof e==`function`)ni(e)?(r=Hs(e,r),t.tag=1,t=pc(null,t,e,r,n)):(t.tag=0,t=dc(null,t,e,r,n));else{if(e!=null){var a=e.$$typeof;if(a===C){t.tag=11,t=tc(null,t,e,r,n);break a}else if(a===E){t.tag=14,t=nc(null,t,e,r,n);break a}}throw t=re(e)||e,Error(i(306,t,``))}}return t;case 0:return dc(e,t,t.type,t.pendingProps,n);case 1:return r=t.type,a=Hs(r,t.pendingProps),pc(e,t,r,a,n);case 3:a:{if(de(t,t.stateNode.containerInfo),e===null)throw Error(i(387));r=t.pendingProps;var o=t.memoizedState;a=o.element,Fa(e,t),Ha(t,r,null,n);var s=t.memoizedState;if(r=s.cache,Vi(t,ea,r),r!==o.cache&&Wi(t,[ea],n,!0),Va(),r=s.element,o.isDehydrated)if(o={element:r,isDehydrated:!1,cache:s.cache},t.updateQueue.baseState=o,t.memoizedState=o,t.flags&256){t=mc(e,t,r,n);break a}else if(r!==a){a=di(Error(i(424)),t),Li(a),t=mc(e,t,r,n);break a}else{switch(e=t.stateNode.containerInfo,e.nodeType){case 9:e=e.body;break;default:e=e.nodeName===`HTML`?e.ownerDocument.body:e}for(Di=cf(e.firstChild),Ei=t,K=!0,Oi=null,ki=!0,n=Ma(t,null,r,n),t.child=n;n;)n.flags=n.flags&-3|4096,n=n.sibling}else{if(Fi(),r===a){t=Tc(e,t,n);break a}ec(e,t,r,n)}t=t.child}return t;case 26:return uc(e,t),e===null?(n=kf(t.type,null,t.pendingProps,null))?t.memoizedState=n:K||(n=t.type,e=t.pendingProps,r=Bd(I.current).createElement(n),r[ot]=t,r[st]=e,Pd(r,n,e),z(r),t.stateNode=r):t.memoizedState=kf(t.type,e.memoizedProps,t.pendingProps,e.memoizedState),null;case 27:return pe(t),e===null&&K&&(r=t.stateNode=ff(t.type,t.pendingProps,I.current),Ei=t,ki=!0,a=Di,Zd(t.type)?(lf=a,Di=cf(r.firstChild)):Di=a),ec(e,t,t.pendingProps.children,n),uc(e,t),e===null&&(t.flags|=4194304),t.child;case 5:return e===null&&K&&((a=r=Di)&&(r=tf(r,t.type,t.pendingProps,ki),r===null?a=!1:(t.stateNode=r,Ei=t,Di=cf(r.firstChild),ki=!1,a=!0)),a||ji(t)),pe(t),a=t.type,o=t.pendingProps,s=e===null?null:e.memoizedProps,r=o.children,Ud(a,o)?r=null:s!==null&&Ud(a,s)&&(t.flags|=32),t.memoizedState!==null&&(a=vo(e,t,xo,null,null,n),Qf._currentValue=a),uc(e,t),ec(e,t,r,n),t.child;case 6:return e===null&&K&&((e=n=Di)&&(n=nf(n,t.pendingProps,ki),n===null?e=!1:(t.stateNode=n,Ei=t,Di=null,e=!0)),e||ji(t)),null;case 13:return vc(e,t,n);case 4:return de(t,t.stateNode.containerInfo),r=t.pendingProps,e===null?t.child=ja(t,null,r,n):ec(e,t,r,n),t.child;case 11:return tc(e,t,t.type,t.pendingProps,n);case 7:return ec(e,t,t.pendingProps,n),t.child;case 8:return ec(e,t,t.pendingProps.children,n),t.child;case 12:return ec(e,t,t.pendingProps.children,n),t.child;case 10:return r=t.pendingProps,Vi(t,t.type,r.value),ec(e,t,r.children,n),t.child;case 9:return a=t.type._context,r=t.pendingProps.children,qi(t),a=Ji(a),r=r(a),t.flags|=1,ec(e,t,r,n),t.child;case 14:return nc(e,t,t.type,t.pendingProps,n);case 15:return rc(e,t,t.type,t.pendingProps,n);case 19:return wc(e,t,n);case 31:return lc(e,t,n);case 22:return ic(e,t,n,t.pendingProps);case 24:return qi(t),r=Ji(ea),e===null?(a=fa(),a===null&&(a=Ll,o=ta(),a.pooledCache=o,o.refCount++,o!==null&&(a.pooledCacheLanes|=n),a=o),t.memoizedState={parent:r,cache:a},Pa(t),Vi(t,ea,a)):((e.lanes&n)!==0&&(Fa(e,t),Ha(t,null,null,n),Va()),a=e.memoizedState,o=t.memoizedState,a.parent===r?(r=o.cache,Vi(t,ea,r),r!==a.cache&&Wi(t,[ea],n,!0)):(a={parent:r,cache:r},t.memoizedState=a,t.lanes===0&&(t.memoizedState=t.updateQueue.baseState=a),Vi(t,ea,r))),ec(e,t,t.pendingProps.children,n),t.child;case 29:throw t.pendingProps}throw Error(i(156,t.tag))}function kc(e){e.flags|=4}function Ac(e,t,n,r,i){if((t=(e.mode&32)!=0)&&(t=!1),t){if(e.flags|=16777216,(i&335544128)===i)if(e.stateNode.complete)e.flags|=8192;else if(Cu())e.flags|=8192;else throw Sa=va,ga}else e.flags&=-16777217}function jc(e,t){if(t.type!==`stylesheet`||t.state.loading&4)e.flags&=-16777217;else if(e.flags|=16777216,!Wf(t))if(Cu())e.flags|=8192;else throw Sa=va,ga}function Mc(e,t){t!==null&&(e.flags|=4),e.flags&16384&&(t=e.tag===22?536870912:Je(),e.lanes|=t,Jl|=t)}function Nc(e,t){if(!K)switch(e.tailMode){case`hidden`:t=e.tail;for(var n=null;t!==null;)t.alternate!==null&&(n=t),t=t.sibling;n===null?e.tail=null:n.sibling=null;break;case`collapsed`:n=e.tail;for(var r=null;n!==null;)n.alternate!==null&&(r=n),n=n.sibling;r===null?t||e.tail===null?e.tail=null:e.tail.sibling=null:r.sibling=null}}function Pc(e){var t=e.alternate!==null&&e.alternate.child===e.child,n=0,r=0;if(t)for(var i=e.child;i!==null;)n|=i.lanes|i.childLanes,r|=i.subtreeFlags&65011712,r|=i.flags&65011712,i.return=e,i=i.sibling;else for(i=e.child;i!==null;)n|=i.lanes|i.childLanes,r|=i.subtreeFlags,r|=i.flags,i.return=e,i=i.sibling;return e.subtreeFlags|=r,e.childLanes=n,t}function Fc(e,t,n){var r=t.pendingProps;switch(wi(t),t.tag){case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return Pc(t),null;case 1:return Pc(t),null;case 3:return n=t.stateNode,r=null,e!==null&&(r=e.memoizedState.cache),t.memoizedState.cache!==r&&(t.flags|=2048),Hi(ea),fe(),n.pendingContext&&(n.context=n.pendingContext,n.pendingContext=null),(e===null||e.child===null)&&(Pi(t)?kc(t):e===null||e.memoizedState.isDehydrated&&!(t.flags&256)||(t.flags|=1024,Ii())),Pc(t),null;case 26:var a=t.type,o=t.memoizedState;return e===null?(kc(t),o===null?(Pc(t),Ac(t,a,null,r,n)):(Pc(t),jc(t,o))):o?o===e.memoizedState?(Pc(t),t.flags&=-16777217):(kc(t),Pc(t),jc(t,o)):(e=e.memoizedProps,e!==r&&kc(t),Pc(t),Ac(t,a,e,r,n)),null;case 27:if(me(t),n=I.current,a=t.type,e!==null&&t.stateNode!=null)e.memoizedProps!==r&&kc(t);else{if(!r){if(t.stateNode===null)throw Error(i(166));return Pc(t),null}e=F.current,Pi(t)?Mi(t,e):(e=ff(a,r,n),t.stateNode=e,kc(t))}return Pc(t),null;case 5:if(me(t),a=t.type,e!==null&&t.stateNode!=null)e.memoizedProps!==r&&kc(t);else{if(!r){if(t.stateNode===null)throw Error(i(166));return Pc(t),null}if(o=F.current,Pi(t))Mi(t,o);else{var s=Bd(I.current);switch(o){case 1:o=s.createElementNS(`http://www.w3.org/2000/svg`,a);break;case 2:o=s.createElementNS(`http://www.w3.org/1998/Math/MathML`,a);break;default:switch(a){case`svg`:o=s.createElementNS(`http://www.w3.org/2000/svg`,a);break;case`math`:o=s.createElementNS(`http://www.w3.org/1998/Math/MathML`,a);break;case`script`:o=s.createElement(`div`),o.innerHTML=`<script><\/script>`,o=o.removeChild(o.firstChild);break;case`select`:o=typeof r.is==`string`?s.createElement(`select`,{is:r.is}):s.createElement(`select`),r.multiple?o.multiple=!0:r.size&&(o.size=r.size);break;default:o=typeof r.is==`string`?s.createElement(a,{is:r.is}):s.createElement(a)}}o[ot]=t,o[st]=r;a:for(s=t.child;s!==null;){if(s.tag===5||s.tag===6)o.appendChild(s.stateNode);else if(s.tag!==4&&s.tag!==27&&s.child!==null){s.child.return=s,s=s.child;continue}if(s===t)break a;for(;s.sibling===null;){if(s.return===null||s.return===t)break a;s=s.return}s.sibling.return=s.return,s=s.sibling}t.stateNode=o;a:switch(Pd(o,a,r),a){case`button`:case`input`:case`select`:case`textarea`:r=!!r.autoFocus;break a;case`img`:r=!0;break a;default:r=!1}r&&kc(t)}}return Pc(t),Ac(t,t.type,e===null?null:e.memoizedProps,t.pendingProps,n),null;case 6:if(e&&t.stateNode!=null)e.memoizedProps!==r&&kc(t);else{if(typeof r!=`string`&&t.stateNode===null)throw Error(i(166));if(e=I.current,Pi(t)){if(e=t.stateNode,n=t.memoizedProps,r=null,a=Ei,a!==null)switch(a.tag){case 27:case 5:r=a.memoizedProps}e[ot]=t,e=!!(e.nodeValue===n||r!==null&&!0===r.suppressHydrationWarning||jd(e.nodeValue,n)),e||ji(t,!0)}else e=Bd(e).createTextNode(r),e[ot]=t,t.stateNode=e}return Pc(t),null;case 31:if(n=t.memoizedState,e===null||e.memoizedState!==null){if(r=Pi(t),n!==null){if(e===null){if(!r)throw Error(i(318));if(e=t.memoizedState,e=e===null?null:e.dehydrated,!e)throw Error(i(557));e[ot]=t}else Fi(),!(t.flags&128)&&(t.memoizedState=null),t.flags|=4;Pc(t),e=!1}else n=Ii(),e!==null&&e.memoizedState!==null&&(e.memoizedState.hydrationErrors=n),e=!0;if(!e)return t.flags&256?(no(t),t):(no(t),null);if(t.flags&128)throw Error(i(558))}return Pc(t),null;case 13:if(r=t.memoizedState,e===null||e.memoizedState!==null&&e.memoizedState.dehydrated!==null){if(a=Pi(t),r!==null&&r.dehydrated!==null){if(e===null){if(!a)throw Error(i(318));if(a=t.memoizedState,a=a===null?null:a.dehydrated,!a)throw Error(i(317));a[ot]=t}else Fi(),!(t.flags&128)&&(t.memoizedState=null),t.flags|=4;Pc(t),a=!1}else a=Ii(),e!==null&&e.memoizedState!==null&&(e.memoizedState.hydrationErrors=a),a=!0;if(!a)return t.flags&256?(no(t),t):(no(t),null)}return no(t),t.flags&128?(t.lanes=n,t):(n=r!==null,e=e!==null&&e.memoizedState!==null,n&&(r=t.child,a=null,r.alternate!==null&&r.alternate.memoizedState!==null&&r.alternate.memoizedState.cachePool!==null&&(a=r.alternate.memoizedState.cachePool.pool),o=null,r.memoizedState!==null&&r.memoizedState.cachePool!==null&&(o=r.memoizedState.cachePool.pool),o!==a&&(r.flags|=2048)),n!==e&&n&&(t.child.flags|=8192),Mc(t,t.updateQueue),Pc(t),null);case 4:return fe(),e===null&&xd(t.stateNode.containerInfo),Pc(t),null;case 10:return Hi(t.type),Pc(t),null;case 19:if(ce(ro),r=t.memoizedState,r===null)return Pc(t),null;if(a=(t.flags&128)!=0,o=r.rendering,o===null)if(a)Nc(r,!1);else{if(Ul!==0||e!==null&&e.flags&128)for(e=t.child;e!==null;){if(o=io(e),o!==null){for(t.flags|=128,Nc(r,!1),e=o.updateQueue,t.updateQueue=e,Mc(t,e),t.subtreeFlags=0,e=n,n=t.child;n!==null;)ii(n,e),n=n.sibling;return P(ro,ro.current&1|2),K&&xi(t,r.treeForkCount),t.child}e=e.sibling}r.tail!==null&&Ee()>eu&&(t.flags|=128,a=!0,Nc(r,!1),t.lanes=4194304)}else{if(!a)if(e=io(o),e!==null){if(t.flags|=128,a=!0,e=e.updateQueue,t.updateQueue=e,Mc(t,e),Nc(r,!0),r.tail===null&&r.tailMode===`hidden`&&!o.alternate&&!K)return Pc(t),null}else 2*Ee()-r.renderingStartTime>eu&&n!==536870912&&(t.flags|=128,a=!0,Nc(r,!1),t.lanes=4194304);r.isBackwards?(o.sibling=t.child,t.child=o):(e=r.last,e===null?t.child=o:e.sibling=o,r.last=o)}return r.tail===null?(Pc(t),null):(e=r.tail,r.rendering=e,r.tail=e.sibling,r.renderingStartTime=Ee(),e.sibling=null,n=ro.current,P(ro,a?n&1|2:n&1),K&&xi(t,r.treeForkCount),e);case 22:case 23:return no(t),Ya(),r=t.memoizedState!==null,e===null?r&&(t.flags|=8192):e.memoizedState!==null!==r&&(t.flags|=8192),r?n&536870912&&!(t.flags&128)&&(Pc(t),t.subtreeFlags&6&&(t.flags|=8192)):Pc(t),n=t.updateQueue,n!==null&&Mc(t,n.retryQueue),n=null,e!==null&&e.memoizedState!==null&&e.memoizedState.cachePool!==null&&(n=e.memoizedState.cachePool.pool),r=null,t.memoizedState!==null&&t.memoizedState.cachePool!==null&&(r=t.memoizedState.cachePool.pool),r!==n&&(t.flags|=2048),e!==null&&ce(da),null;case 24:return n=null,e!==null&&(n=e.memoizedState.cache),t.memoizedState.cache!==n&&(t.flags|=2048),Hi(ea),Pc(t),null;case 25:return null;case 30:return null}throw Error(i(156,t.tag))}function Ic(e,t){switch(wi(t),t.tag){case 1:return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 3:return Hi(ea),fe(),e=t.flags,e&65536&&!(e&128)?(t.flags=e&-65537|128,t):null;case 26:case 27:case 5:return me(t),null;case 31:if(t.memoizedState!==null){if(no(t),t.alternate===null)throw Error(i(340));Fi()}return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 13:if(no(t),e=t.memoizedState,e!==null&&e.dehydrated!==null){if(t.alternate===null)throw Error(i(340));Fi()}return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 19:return ce(ro),null;case 4:return fe(),null;case 10:return Hi(t.type),null;case 22:case 23:return no(t),Ya(),e!==null&&ce(da),e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 24:return Hi(ea),null;case 25:return null;default:return null}}function Lc(e,t){switch(wi(t),t.tag){case 3:Hi(ea),fe();break;case 26:case 27:case 5:me(t);break;case 4:fe();break;case 31:t.memoizedState!==null&&no(t);break;case 13:no(t);break;case 19:ce(ro);break;case 10:Hi(t.type);break;case 22:case 23:no(t),Ya(),e!==null&&ce(da);break;case 24:Hi(ea)}}function Rc(e,t){try{var n=t.updateQueue,r=n===null?null:n.lastEffect;if(r!==null){var i=r.next;n=i;do{if((n.tag&e)===e){r=void 0;var a=n.create,o=n.inst;r=a(),o.destroy=r}n=n.next}while(n!==i)}}catch(e){Q(t,t.return,e)}}function zc(e,t,n){try{var r=t.updateQueue,i=r===null?null:r.lastEffect;if(i!==null){var a=i.next;r=a;do{if((r.tag&e)===e){var o=r.inst,s=o.destroy;if(s!==void 0){o.destroy=void 0,i=t;var c=n,l=s;try{l()}catch(e){Q(i,c,e)}}}r=r.next}while(r!==a)}}catch(e){Q(t,t.return,e)}}function Bc(e){var t=e.updateQueue;if(t!==null){var n=e.stateNode;try{Wa(t,n)}catch(t){Q(e,e.return,t)}}}function Vc(e,t,n){n.props=Hs(e.type,e.memoizedProps),n.state=e.memoizedState;try{n.componentWillUnmount()}catch(n){Q(e,t,n)}}function Hc(e,t){try{var n=e.ref;if(n!==null){switch(e.tag){case 26:case 27:case 5:var r=e.stateNode;break;case 30:r=e.stateNode;break;default:r=e.stateNode}typeof n==`function`?e.refCleanup=n(r):n.current=r}}catch(n){Q(e,t,n)}}function Uc(e,t){var n=e.ref,r=e.refCleanup;if(n!==null)if(typeof r==`function`)try{r()}catch(n){Q(e,t,n)}finally{e.refCleanup=null,e=e.alternate,e!=null&&(e.refCleanup=null)}else if(typeof n==`function`)try{n(null)}catch(n){Q(e,t,n)}else n.current=null}function Wc(e){var t=e.type,n=e.memoizedProps,r=e.stateNode;try{a:switch(t){case`button`:case`input`:case`select`:case`textarea`:n.autoFocus&&r.focus();break a;case`img`:n.src?r.src=n.src:n.srcSet&&(r.srcset=n.srcSet)}}catch(t){Q(e,e.return,t)}}function Gc(e,t,n){try{var r=e.stateNode;Fd(r,e.type,n,t),r[st]=t}catch(t){Q(e,e.return,t)}}function Kc(e){return e.tag===5||e.tag===3||e.tag===26||e.tag===27&&Zd(e.type)||e.tag===4}function qc(e){a:for(;;){for(;e.sibling===null;){if(e.return===null||Kc(e.return))return null;e=e.return}for(e.sibling.return=e.return,e=e.sibling;e.tag!==5&&e.tag!==6&&e.tag!==18;){if(e.tag===27&&Zd(e.type)||e.flags&2||e.child===null||e.tag===4)continue a;e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function Jc(e,t,n){var r=e.tag;if(r===5||r===6)e=e.stateNode,t?(n.nodeType===9?n.body:n.nodeName===`HTML`?n.ownerDocument.body:n).insertBefore(e,t):(t=n.nodeType===9?n.body:n.nodeName===`HTML`?n.ownerDocument.body:n,t.appendChild(e),n=n._reactRootContainer,n!=null||t.onclick!==null||(t.onclick=Xt));else if(r!==4&&(r===27&&Zd(e.type)&&(n=e.stateNode,t=null),e=e.child,e!==null))for(Jc(e,t,n),e=e.sibling;e!==null;)Jc(e,t,n),e=e.sibling}function Yc(e,t,n){var r=e.tag;if(r===5||r===6)e=e.stateNode,t?n.insertBefore(e,t):n.appendChild(e);else if(r!==4&&(r===27&&Zd(e.type)&&(n=e.stateNode),e=e.child,e!==null))for(Yc(e,t,n),e=e.sibling;e!==null;)Yc(e,t,n),e=e.sibling}function Xc(e){var t=e.stateNode,n=e.memoizedProps;try{for(var r=e.type,i=t.attributes;i.length;)t.removeAttributeNode(i[0]);Pd(t,r,n),t[ot]=e,t[st]=n}catch(t){Q(e,e.return,t)}}var Zc=!1,Qc=!1,$c=!1,el=typeof WeakSet==`function`?WeakSet:Set,tl=null;function nl(e,t){if(e=e.containerInfo,Rd=sp,e=br(e),xr(e)){if(`selectionStart`in e)var n={start:e.selectionStart,end:e.selectionEnd};else a:{n=(n=e.ownerDocument)&&n.defaultView||window;var r=n.getSelection&&n.getSelection();if(r&&r.rangeCount!==0){n=r.anchorNode;var a=r.anchorOffset,o=r.focusNode;r=r.focusOffset;try{n.nodeType,o.nodeType}catch{n=null;break a}var s=0,c=-1,l=-1,u=0,d=0,f=e,p=null;b:for(;;){for(var m;f!==n||a!==0&&f.nodeType!==3||(c=s+a),f!==o||r!==0&&f.nodeType!==3||(l=s+r),f.nodeType===3&&(s+=f.nodeValue.length),(m=f.firstChild)!==null;)p=f,f=m;for(;;){if(f===e)break b;if(p===n&&++u===a&&(c=s),p===o&&++d===r&&(l=s),(m=f.nextSibling)!==null)break;f=p,p=f.parentNode}f=m}n=c===-1||l===-1?null:{start:c,end:l}}else n=null}n||={start:0,end:0}}else n=null;for(zd={focusedElem:e,selectionRange:n},sp=!1,tl=t;tl!==null;)if(t=tl,e=t.child,t.subtreeFlags&1028&&e!==null)e.return=t,tl=e;else for(;tl!==null;){switch(t=tl,o=t.alternate,e=t.flags,t.tag){case 0:if(e&4&&(e=t.updateQueue,e=e===null?null:e.events,e!==null))for(n=0;n<e.length;n++)a=e[n],a.ref.impl=a.nextImpl;break;case 11:case 15:break;case 1:if(e&1024&&o!==null){e=void 0,n=t,a=o.memoizedProps,o=o.memoizedState,r=n.stateNode;try{var h=Hs(n.type,a);e=r.getSnapshotBeforeUpdate(h,o),r.__reactInternalSnapshotBeforeUpdate=e}catch(e){Q(n,n.return,e)}}break;case 3:if(e&1024){if(e=t.stateNode.containerInfo,n=e.nodeType,n===9)ef(e);else if(n===1)switch(e.nodeName){case`HEAD`:case`HTML`:case`BODY`:ef(e);break;default:e.textContent=``}}break;case 5:case 26:case 27:case 6:case 4:case 17:break;default:if(e&1024)throw Error(i(163))}if(e=t.sibling,e!==null){e.return=t.return,tl=e;break}tl=t.return}}function rl(e,t,n){var r=n.flags;switch(n.tag){case 0:case 11:case 15:vl(e,n),r&4&&Rc(5,n);break;case 1:if(vl(e,n),r&4)if(e=n.stateNode,t===null)try{e.componentDidMount()}catch(e){Q(n,n.return,e)}else{var i=Hs(n.type,t.memoizedProps);t=t.memoizedState;try{e.componentDidUpdate(i,t,e.__reactInternalSnapshotBeforeUpdate)}catch(e){Q(n,n.return,e)}}r&64&&Bc(n),r&512&&Hc(n,n.return);break;case 3:if(vl(e,n),r&64&&(e=n.updateQueue,e!==null)){if(t=null,n.child!==null)switch(n.child.tag){case 27:case 5:t=n.child.stateNode;break;case 1:t=n.child.stateNode}try{Wa(e,t)}catch(e){Q(n,n.return,e)}}break;case 27:t===null&&r&4&&Xc(n);case 26:case 5:vl(e,n),t===null&&r&4&&Wc(n),r&512&&Hc(n,n.return);break;case 12:vl(e,n);break;case 31:vl(e,n),r&4&&ll(e,n);break;case 13:vl(e,n),r&4&&ul(e,n),r&64&&(e=n.memoizedState,e!==null&&(e=e.dehydrated,e!==null&&(n=qu.bind(null,n),sf(e,n))));break;case 22:if(r=n.memoizedState!==null||Zc,!r){t=t!==null&&t.memoizedState!==null||Qc,i=Zc;var a=Qc;Zc=r,(Qc=t)&&!a?bl(e,n,(n.subtreeFlags&8772)!=0):vl(e,n),Zc=i,Qc=a}break;case 30:break;default:vl(e,n)}}function il(e){var t=e.alternate;t!==null&&(e.alternate=null,il(t)),e.child=null,e.deletions=null,e.sibling=null,e.tag===5&&(t=e.stateNode,t!==null&&mt(t)),e.stateNode=null,e.return=null,e.dependencies=null,e.memoizedProps=null,e.memoizedState=null,e.pendingProps=null,e.stateNode=null,e.updateQueue=null}var al=null,ol=!1;function sl(e,t,n){for(n=n.child;n!==null;)cl(e,t,n),n=n.sibling}function cl(e,t,n){if(Ie&&typeof Ie.onCommitFiberUnmount==`function`)try{Ie.onCommitFiberUnmount(Fe,n)}catch{}switch(n.tag){case 26:Qc||Uc(n,t),sl(e,t,n),n.memoizedState?n.memoizedState.count--:n.stateNode&&(n=n.stateNode,n.parentNode.removeChild(n));break;case 27:Qc||Uc(n,t);var r=al,i=ol;Zd(n.type)&&(al=n.stateNode,ol=!1),sl(e,t,n),pf(n.stateNode),al=r,ol=i;break;case 5:Qc||Uc(n,t);case 6:if(r=al,i=ol,al=null,sl(e,t,n),al=r,ol=i,al!==null)if(ol)try{(al.nodeType===9?al.body:al.nodeName===`HTML`?al.ownerDocument.body:al).removeChild(n.stateNode)}catch(e){Q(n,t,e)}else try{al.removeChild(n.stateNode)}catch(e){Q(n,t,e)}break;case 18:al!==null&&(ol?(e=al,Qd(e.nodeType===9?e.body:e.nodeName===`HTML`?e.ownerDocument.body:e,n.stateNode),Np(e)):Qd(al,n.stateNode));break;case 4:r=al,i=ol,al=n.stateNode.containerInfo,ol=!0,sl(e,t,n),al=r,ol=i;break;case 0:case 11:case 14:case 15:zc(2,n,t),Qc||zc(4,n,t),sl(e,t,n);break;case 1:Qc||(Uc(n,t),r=n.stateNode,typeof r.componentWillUnmount==`function`&&Vc(n,t,r)),sl(e,t,n);break;case 21:sl(e,t,n);break;case 22:Qc=(r=Qc)||n.memoizedState!==null,sl(e,t,n),Qc=r;break;default:sl(e,t,n)}}function ll(e,t){if(t.memoizedState===null&&(e=t.alternate,e!==null&&(e=e.memoizedState,e!==null))){e=e.dehydrated;try{Np(e)}catch(e){Q(t,t.return,e)}}}function ul(e,t){if(t.memoizedState===null&&(e=t.alternate,e!==null&&(e=e.memoizedState,e!==null&&(e=e.dehydrated,e!==null))))try{Np(e)}catch(e){Q(t,t.return,e)}}function dl(e){switch(e.tag){case 31:case 13:case 19:var t=e.stateNode;return t===null&&(t=e.stateNode=new el),t;case 22:return e=e.stateNode,t=e._retryCache,t===null&&(t=e._retryCache=new el),t;default:throw Error(i(435,e.tag))}}function fl(e,t){var n=dl(e);t.forEach(function(t){if(!n.has(t)){n.add(t);var r=Ju.bind(null,e,t);t.then(r,r)}})}function pl(e,t){var n=t.deletions;if(n!==null)for(var r=0;r<n.length;r++){var a=n[r],o=e,s=t,c=s;a:for(;c!==null;){switch(c.tag){case 27:if(Zd(c.type)){al=c.stateNode,ol=!1;break a}break;case 5:al=c.stateNode,ol=!1;break a;case 3:case 4:al=c.stateNode.containerInfo,ol=!0;break a}c=c.return}if(al===null)throw Error(i(160));cl(o,s,a),al=null,ol=!1,o=a.alternate,o!==null&&(o.return=null),a.return=null}if(t.subtreeFlags&13886)for(t=t.child;t!==null;)hl(t,e),t=t.sibling}var ml=null;function hl(e,t){var n=e.alternate,r=e.flags;switch(e.tag){case 0:case 11:case 14:case 15:pl(t,e),gl(e),r&4&&(zc(3,e,e.return),Rc(3,e),zc(5,e,e.return));break;case 1:pl(t,e),gl(e),r&512&&(Qc||n===null||Uc(n,n.return)),r&64&&Zc&&(e=e.updateQueue,e!==null&&(r=e.callbacks,r!==null&&(n=e.shared.hiddenCallbacks,e.shared.hiddenCallbacks=n===null?r:n.concat(r))));break;case 26:var a=ml;if(pl(t,e),gl(e),r&512&&(Qc||n===null||Uc(n,n.return)),r&4){var o=n===null?null:n.memoizedState;if(r=e.memoizedState,n===null)if(r===null)if(e.stateNode===null){a:{r=e.type,n=e.memoizedProps,a=a.ownerDocument||a;b:switch(r){case`title`:o=a.getElementsByTagName(`title`)[0],(!o||o[pt]||o[ot]||o.namespaceURI===`http://www.w3.org/2000/svg`||o.hasAttribute(`itemprop`))&&(o=a.createElement(r),a.head.insertBefore(o,a.querySelector(`head > title`))),Pd(o,r,n),o[ot]=e,z(o),r=o;break a;case`link`:var s=Vf(`link`,`href`,a).get(r+(n.href||``));if(s){for(var c=0;c<s.length;c++)if(o=s[c],o.getAttribute(`href`)===(n.href==null||n.href===``?null:n.href)&&o.getAttribute(`rel`)===(n.rel==null?null:n.rel)&&o.getAttribute(`title`)===(n.title==null?null:n.title)&&o.getAttribute(`crossorigin`)===(n.crossOrigin==null?null:n.crossOrigin)){s.splice(c,1);break b}}o=a.createElement(r),Pd(o,r,n),a.head.appendChild(o);break;case`meta`:if(s=Vf(`meta`,`content`,a).get(r+(n.content||``))){for(c=0;c<s.length;c++)if(o=s[c],o.getAttribute(`content`)===(n.content==null?null:``+n.content)&&o.getAttribute(`name`)===(n.name==null?null:n.name)&&o.getAttribute(`property`)===(n.property==null?null:n.property)&&o.getAttribute(`http-equiv`)===(n.httpEquiv==null?null:n.httpEquiv)&&o.getAttribute(`charset`)===(n.charSet==null?null:n.charSet)){s.splice(c,1);break b}}o=a.createElement(r),Pd(o,r,n),a.head.appendChild(o);break;default:throw Error(i(468,r))}o[ot]=e,z(o),r=o}e.stateNode=r}else Hf(a,e.type,e.stateNode);else e.stateNode=If(a,r,e.memoizedProps);else o===r?r===null&&e.stateNode!==null&&Gc(e,e.memoizedProps,n.memoizedProps):(o===null?n.stateNode!==null&&(n=n.stateNode,n.parentNode.removeChild(n)):o.count--,r===null?Hf(a,e.type,e.stateNode):If(a,r,e.memoizedProps))}break;case 27:pl(t,e),gl(e),r&512&&(Qc||n===null||Uc(n,n.return)),n!==null&&r&4&&Gc(e,e.memoizedProps,n.memoizedProps);break;case 5:if(pl(t,e),gl(e),r&512&&(Qc||n===null||Uc(n,n.return)),e.flags&32){a=e.stateNode;try{Ht(a,``)}catch(t){Q(e,e.return,t)}}r&4&&e.stateNode!=null&&(a=e.memoizedProps,Gc(e,a,n===null?a:n.memoizedProps)),r&1024&&($c=!0);break;case 6:if(pl(t,e),gl(e),r&4){if(e.stateNode===null)throw Error(i(162));r=e.memoizedProps,n=e.stateNode;try{n.nodeValue=r}catch(t){Q(e,e.return,t)}}break;case 3:if(Bf=null,a=ml,ml=gf(t.containerInfo),pl(t,e),ml=a,gl(e),r&4&&n!==null&&n.memoizedState.isDehydrated)try{Np(t.containerInfo)}catch(t){Q(e,e.return,t)}$c&&($c=!1,_l(e));break;case 4:r=ml,ml=gf(e.stateNode.containerInfo),pl(t,e),gl(e),ml=r;break;case 12:pl(t,e),gl(e);break;case 31:pl(t,e),gl(e),r&4&&(r=e.updateQueue,r!==null&&(e.updateQueue=null,fl(e,r)));break;case 13:pl(t,e),gl(e),e.child.flags&8192&&e.memoizedState!==null!=(n!==null&&n.memoizedState!==null)&&(Ql=Ee()),r&4&&(r=e.updateQueue,r!==null&&(e.updateQueue=null,fl(e,r)));break;case 22:a=e.memoizedState!==null;var l=n!==null&&n.memoizedState!==null,u=Zc,d=Qc;if(Zc=u||a,Qc=d||l,pl(t,e),Qc=d,Zc=u,gl(e),r&8192)a:for(t=e.stateNode,t._visibility=a?t._visibility&-2:t._visibility|1,a&&(n===null||l||Zc||Qc||yl(e)),n=null,t=e;;){if(t.tag===5||t.tag===26){if(n===null){l=n=t;try{if(o=l.stateNode,a)s=o.style,typeof s.setProperty==`function`?s.setProperty(`display`,`none`,`important`):s.display=`none`;else{c=l.stateNode;var f=l.memoizedProps.style,p=f!=null&&f.hasOwnProperty(`display`)?f.display:null;c.style.display=p==null||typeof p==`boolean`?``:(``+p).trim()}}catch(e){Q(l,l.return,e)}}}else if(t.tag===6){if(n===null){l=t;try{l.stateNode.nodeValue=a?``:l.memoizedProps}catch(e){Q(l,l.return,e)}}}else if(t.tag===18){if(n===null){l=t;try{var m=l.stateNode;a?$d(m,!0):$d(l.stateNode,!1)}catch(e){Q(l,l.return,e)}}}else if((t.tag!==22&&t.tag!==23||t.memoizedState===null||t===e)&&t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break a;for(;t.sibling===null;){if(t.return===null||t.return===e)break a;n===t&&(n=null),t=t.return}n===t&&(n=null),t.sibling.return=t.return,t=t.sibling}r&4&&(r=e.updateQueue,r!==null&&(n=r.retryQueue,n!==null&&(r.retryQueue=null,fl(e,n))));break;case 19:pl(t,e),gl(e),r&4&&(r=e.updateQueue,r!==null&&(e.updateQueue=null,fl(e,r)));break;case 30:break;case 21:break;default:pl(t,e),gl(e)}}function gl(e){var t=e.flags;if(t&2){try{for(var n,r=e.return;r!==null;){if(Kc(r)){n=r;break}r=r.return}if(n==null)throw Error(i(160));switch(n.tag){case 27:var a=n.stateNode;Yc(e,qc(e),a);break;case 5:var o=n.stateNode;n.flags&32&&(Ht(o,``),n.flags&=-33),Yc(e,qc(e),o);break;case 3:case 4:var s=n.stateNode.containerInfo;Jc(e,qc(e),s);break;default:throw Error(i(161))}}catch(t){Q(e,e.return,t)}e.flags&=-3}t&4096&&(e.flags&=-4097)}function _l(e){if(e.subtreeFlags&1024)for(e=e.child;e!==null;){var t=e;_l(t),t.tag===5&&t.flags&1024&&t.stateNode.reset(),e=e.sibling}}function vl(e,t){if(t.subtreeFlags&8772)for(t=t.child;t!==null;)rl(e,t.alternate,t),t=t.sibling}function yl(e){for(e=e.child;e!==null;){var t=e;switch(t.tag){case 0:case 11:case 14:case 15:zc(4,t,t.return),yl(t);break;case 1:Uc(t,t.return);var n=t.stateNode;typeof n.componentWillUnmount==`function`&&Vc(t,t.return,n),yl(t);break;case 27:pf(t.stateNode);case 26:case 5:Uc(t,t.return),yl(t);break;case 22:t.memoizedState===null&&yl(t);break;case 30:yl(t);break;default:yl(t)}e=e.sibling}}function bl(e,t,n){for(n&&=(t.subtreeFlags&8772)!=0,t=t.child;t!==null;){var r=t.alternate,i=e,a=t,o=a.flags;switch(a.tag){case 0:case 11:case 15:bl(i,a,n),Rc(4,a);break;case 1:if(bl(i,a,n),r=a,i=r.stateNode,typeof i.componentDidMount==`function`)try{i.componentDidMount()}catch(e){Q(r,r.return,e)}if(r=a,i=r.updateQueue,i!==null){var s=r.stateNode;try{var c=i.shared.hiddenCallbacks;if(c!==null)for(i.shared.hiddenCallbacks=null,i=0;i<c.length;i++)Ua(c[i],s)}catch(e){Q(r,r.return,e)}}n&&o&64&&Bc(a),Hc(a,a.return);break;case 27:Xc(a);case 26:case 5:bl(i,a,n),n&&r===null&&o&4&&Wc(a),Hc(a,a.return);break;case 12:bl(i,a,n);break;case 31:bl(i,a,n),n&&o&4&&ll(i,a);break;case 13:bl(i,a,n),n&&o&4&&ul(i,a);break;case 22:a.memoizedState===null&&bl(i,a,n),Hc(a,a.return);break;case 30:break;default:bl(i,a,n)}t=t.sibling}}function xl(e,t){var n=null;e!==null&&e.memoizedState!==null&&e.memoizedState.cachePool!==null&&(n=e.memoizedState.cachePool.pool),e=null,t.memoizedState!==null&&t.memoizedState.cachePool!==null&&(e=t.memoizedState.cachePool.pool),e!==n&&(e!=null&&e.refCount++,n!=null&&na(n))}function Sl(e,t){e=null,t.alternate!==null&&(e=t.alternate.memoizedState.cache),t=t.memoizedState.cache,t!==e&&(t.refCount++,e!=null&&na(e))}function Cl(e,t,n,r){if(t.subtreeFlags&10256)for(t=t.child;t!==null;)wl(e,t,n,r),t=t.sibling}function wl(e,t,n,r){var i=t.flags;switch(t.tag){case 0:case 11:case 15:Cl(e,t,n,r),i&2048&&Rc(9,t);break;case 1:Cl(e,t,n,r);break;case 3:Cl(e,t,n,r),i&2048&&(e=null,t.alternate!==null&&(e=t.alternate.memoizedState.cache),t=t.memoizedState.cache,t!==e&&(t.refCount++,e!=null&&na(e)));break;case 12:if(i&2048){Cl(e,t,n,r),e=t.stateNode;try{var a=t.memoizedProps,o=a.id,s=a.onPostCommit;typeof s==`function`&&s(o,t.alternate===null?`mount`:`update`,e.passiveEffectDuration,-0)}catch(e){Q(t,t.return,e)}}else Cl(e,t,n,r);break;case 31:Cl(e,t,n,r);break;case 13:Cl(e,t,n,r);break;case 23:break;case 22:a=t.stateNode,o=t.alternate,t.memoizedState===null?a._visibility&2?Cl(e,t,n,r):(a._visibility|=2,Tl(e,t,n,r,(t.subtreeFlags&10256)!=0||!1)):a._visibility&2?Cl(e,t,n,r):El(e,t),i&2048&&xl(o,t);break;case 24:Cl(e,t,n,r),i&2048&&Sl(t.alternate,t);break;default:Cl(e,t,n,r)}}function Tl(e,t,n,r,i){for(i&&=(t.subtreeFlags&10256)!=0||!1,t=t.child;t!==null;){var a=e,o=t,s=n,c=r,l=o.flags;switch(o.tag){case 0:case 11:case 15:Tl(a,o,s,c,i),Rc(8,o);break;case 23:break;case 22:var u=o.stateNode;o.memoizedState===null?(u._visibility|=2,Tl(a,o,s,c,i)):u._visibility&2?Tl(a,o,s,c,i):El(a,o),i&&l&2048&&xl(o.alternate,o);break;case 24:Tl(a,o,s,c,i),i&&l&2048&&Sl(o.alternate,o);break;default:Tl(a,o,s,c,i)}t=t.sibling}}function El(e,t){if(t.subtreeFlags&10256)for(t=t.child;t!==null;){var n=e,r=t,i=r.flags;switch(r.tag){case 22:El(n,r),i&2048&&xl(r.alternate,r);break;case 24:El(n,r),i&2048&&Sl(r.alternate,r);break;default:El(n,r)}t=t.sibling}}var Dl=8192;function Ol(e,t,n){if(e.subtreeFlags&Dl)for(e=e.child;e!==null;)kl(e,t,n),e=e.sibling}function kl(e,t,n){switch(e.tag){case 26:Ol(e,t,n),e.flags&Dl&&e.memoizedState!==null&&Gf(n,ml,e.memoizedState,e.memoizedProps);break;case 5:Ol(e,t,n);break;case 3:case 4:var r=ml;ml=gf(e.stateNode.containerInfo),Ol(e,t,n),ml=r;break;case 22:e.memoizedState===null&&(r=e.alternate,r!==null&&r.memoizedState!==null?(r=Dl,Dl=16777216,Ol(e,t,n),Dl=r):Ol(e,t,n));break;default:Ol(e,t,n)}}function Al(e){var t=e.alternate;if(t!==null&&(e=t.child,e!==null)){t.child=null;do t=e.sibling,e.sibling=null,e=t;while(e!==null)}}function jl(e){var t=e.deletions;if(e.flags&16){if(t!==null)for(var n=0;n<t.length;n++){var r=t[n];tl=r,Pl(r,e)}Al(e)}if(e.subtreeFlags&10256)for(e=e.child;e!==null;)Ml(e),e=e.sibling}function Ml(e){switch(e.tag){case 0:case 11:case 15:jl(e),e.flags&2048&&zc(9,e,e.return);break;case 3:jl(e);break;case 12:jl(e);break;case 22:var t=e.stateNode;e.memoizedState!==null&&t._visibility&2&&(e.return===null||e.return.tag!==13)?(t._visibility&=-3,Nl(e)):jl(e);break;default:jl(e)}}function Nl(e){var t=e.deletions;if(e.flags&16){if(t!==null)for(var n=0;n<t.length;n++){var r=t[n];tl=r,Pl(r,e)}Al(e)}for(e=e.child;e!==null;){switch(t=e,t.tag){case 0:case 11:case 15:zc(8,t,t.return),Nl(t);break;case 22:n=t.stateNode,n._visibility&2&&(n._visibility&=-3,Nl(t));break;default:Nl(t)}e=e.sibling}}function Pl(e,t){for(;tl!==null;){var n=tl;switch(n.tag){case 0:case 11:case 15:zc(8,n,t);break;case 23:case 22:if(n.memoizedState!==null&&n.memoizedState.cachePool!==null){var r=n.memoizedState.cachePool.pool;r!=null&&r.refCount++}break;case 24:na(n.memoizedState.cache)}if(r=n.child,r!==null)r.return=n,tl=r;else a:for(n=e;tl!==null;){r=tl;var i=r.sibling,a=r.return;if(il(r),r===n){tl=null;break a}if(i!==null){i.return=a,tl=i;break a}tl=a}}}var Fl={getCacheForType:function(e){var t=Ji(ea),n=t.data.get(e);return n===void 0&&(n=e(),t.data.set(e,n)),n},cacheSignal:function(){return Ji(ea).controller.signal}},Il=typeof WeakMap==`function`?WeakMap:Map,J=0,Ll=null,Y=null,X=0,Z=0,Rl=null,zl=!1,Bl=!1,Vl=!1,Hl=0,Ul=0,Wl=0,Gl=0,Kl=0,ql=0,Jl=0,Yl=null,Xl=null,Zl=!1,Ql=0,$l=0,eu=1/0,tu=null,nu=null,ru=0,iu=null,au=null,ou=0,su=0,cu=null,lu=null,uu=0,du=null;function fu(){return J&2&&X!==0?X&-X:M.T===null?rt():ud()}function pu(){if(ql===0)if(!(X&536870912)||K){var e=Ue;Ue<<=1,!(Ue&3932160)&&(Ue=262144),ql=e}else ql=536870912;return e=Xa.current,e!==null&&(e.flags|=32),ql}function mu(e,t,n){(e===Ll&&(Z===2||Z===9)||e.cancelPendingCommit!==null)&&(xu(e,0),vu(e,X,ql,!1)),Xe(e,n),(!(J&2)||e!==Ll)&&(e===Ll&&(!(J&2)&&(Gl|=n),Ul===4&&vu(e,X,ql,!1)),nd(e))}function hu(e,t,n){if(J&6)throw Error(i(327));var r=!n&&(t&127)==0&&(t&e.expiredLanes)===0||Ke(e,t),a=r?ku(e,t):Du(e,t,!0),o=r;do{if(a===0){Bl&&!r&&vu(e,t,0,!1);break}else{if(n=e.current.alternate,o&&!_u(n)){a=Du(e,t,!1),o=!1;continue}if(a===2){if(o=t,e.errorRecoveryDisabledLanes&o)var s=0;else s=e.pendingLanes&-536870913,s=s===0?s&536870912?536870912:0:s;if(s!==0){t=s;a:{var c=e;a=Yl;var l=c.current.memoizedState.isDehydrated;if(l&&(xu(c,s).flags|=256),s=Du(c,s,!1),s!==2){if(Vl&&!l){c.errorRecoveryDisabledLanes|=o,Gl|=o,a=4;break a}o=Xl,Xl=a,o!==null&&(Xl===null?Xl=o:Xl.push.apply(Xl,o))}a=s}if(o=!1,a!==2)continue}}if(a===1){xu(e,0),vu(e,t,0,!0);break}a:{switch(r=e,o=a,o){case 0:case 1:throw Error(i(345));case 4:if((t&4194048)!==t)break;case 6:vu(r,t,ql,!zl);break a;case 2:Xl=null;break;case 3:case 5:break;default:throw Error(i(329))}if((t&62914560)===t&&(a=Ql+300-Ee(),10<a)){if(vu(r,t,ql,!zl),Ge(r,0,!0)!==0)break a;ou=t,r.timeoutHandle=Kd(gu.bind(null,r,n,Xl,tu,Zl,t,ql,Gl,Jl,zl,o,`Throttled`,-0,0),a);break a}gu(r,n,Xl,tu,Zl,t,ql,Gl,Jl,zl,o,null,-0,0)}}break}while(1);nd(e)}function gu(e,t,n,r,i,a,o,s,c,l,u,d,f,p){if(e.timeoutHandle=-1,d=t.subtreeFlags,d&8192||(d&16785408)==16785408){d={stylesheets:null,count:0,imgCount:0,imgBytes:0,suspenseyImages:[],waitingForImages:!0,waitingForViewTransition:!1,unsuspend:Xt},kl(t,a,d);var m=(a&62914560)===a?Ql-Ee():(a&4194048)===a?$l-Ee():0;if(m=qf(d,m),m!==null){ou=a,e.cancelPendingCommit=m(Iu.bind(null,e,t,a,n,r,i,o,s,c,u,d,null,f,p)),vu(e,a,o,!l);return}}Iu(e,t,a,n,r,i,o,s,c)}function _u(e){for(var t=e;;){var n=t.tag;if((n===0||n===11||n===15)&&t.flags&16384&&(n=t.updateQueue,n!==null&&(n=n.stores,n!==null)))for(var r=0;r<n.length;r++){var i=n[r],a=i.getSnapshot;i=i.value;try{if(!hr(a(),i))return!1}catch{return!1}}if(n=t.child,t.subtreeFlags&16384&&n!==null)n.return=t,t=n;else{if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return!0;t=t.return}t.sibling.return=t.return,t=t.sibling}}return!0}function vu(e,t,n,r){t&=~Kl,t&=~Gl,e.suspendedLanes|=t,e.pingedLanes&=~t,r&&(e.warmLanes|=t),r=e.expirationTimes;for(var i=t;0<i;){var a=31-Re(i),o=1<<a;r[a]=-1,i&=~o}n!==0&&Qe(e,n,t)}function yu(){return J&6?!0:(rd(0,!1),!1)}function bu(){if(Y!==null){if(Z===0)var e=Y.return;else e=Y,Bi=zi=null,wo(e),Ta=null,Ea=0,e=Y;for(;e!==null;)Lc(e.alternate,e),e=e.return;Y=null}}function xu(e,t){var n=e.timeoutHandle;n!==-1&&(e.timeoutHandle=-1,qd(n)),n=e.cancelPendingCommit,n!==null&&(e.cancelPendingCommit=null,n()),ou=0,bu(),Ll=e,Y=n=ri(e.current,null),X=t,Z=0,Rl=null,zl=!1,Bl=Ke(e,t),Vl=!1,Jl=ql=Kl=Gl=Wl=Ul=0,Xl=Yl=null,Zl=!1,t&8&&(t|=t&32);var r=e.entangledLanes;if(r!==0)for(e=e.entanglements,r&=t;0<r;){var i=31-Re(r),a=1<<i;t|=e[i],r&=~a}return Hl=t,qr(),n}function Su(e,t){q=null,M.H=Ps,t===ha||t===_a?(t=Ca(),Z=3):t===ga?(t=Ca(),Z=4):Z=t===Qs?8:typeof t==`object`&&t&&typeof t.then==`function`?6:1,Rl=t,Y===null&&(Ul=1,Ks(e,di(t,e.current)))}function Cu(){var e=Xa.current;return e===null?!0:(X&4194048)===X?Za===null:(X&62914560)===X||X&536870912?e===Za:!1}function wu(){var e=M.H;return M.H=Ps,e===null?Ps:e}function Tu(){var e=M.A;return M.A=Fl,e}function Eu(){Ul=4,zl||(X&4194048)!==X&&Xa.current!==null||(Bl=!0),!(Wl&134217727)&&!(Gl&134217727)||Ll===null||vu(Ll,X,ql,!1)}function Du(e,t,n){var r=J;J|=2;var i=wu(),a=Tu();(Ll!==e||X!==t)&&(tu=null,xu(e,t)),t=!1;var o=Ul;a:do try{if(Z!==0&&Y!==null){var s=Y,c=Rl;switch(Z){case 8:bu(),o=6;break a;case 3:case 2:case 9:case 6:Xa.current===null&&(t=!0);var l=Z;if(Z=0,Rl=null,Nu(e,s,c,l),n&&Bl){o=0;break a}break;default:l=Z,Z=0,Rl=null,Nu(e,s,c,l)}}Ou(),o=Ul;break}catch(t){Su(e,t)}while(1);return t&&e.shellSuspendCounter++,Bi=zi=null,J=r,M.H=i,M.A=a,Y===null&&(Ll=null,X=0,qr()),o}function Ou(){for(;Y!==null;)ju(Y)}function ku(e,t){var n=J;J|=2;var r=wu(),a=Tu();Ll!==e||X!==t?(tu=null,eu=Ee()+500,xu(e,t)):Bl=Ke(e,t);a:do try{if(Z!==0&&Y!==null){t=Y;var o=Rl;b:switch(Z){case 1:Z=0,Rl=null,Nu(e,t,o,1);break;case 2:case 9:if(ya(o)){Z=0,Rl=null,Mu(t);break}t=function(){Z!==2&&Z!==9||Ll!==e||(Z=7),nd(e)},o.then(t,t);break a;case 3:Z=7;break a;case 4:Z=5;break a;case 7:ya(o)?(Z=0,Rl=null,Mu(t)):(Z=0,Rl=null,Nu(e,t,o,7));break;case 5:var s=null;switch(Y.tag){case 26:s=Y.memoizedState;case 5:case 27:var c=Y;if(s?Wf(s):c.stateNode.complete){Z=0,Rl=null;var l=c.sibling;if(l!==null)Y=l;else{var u=c.return;u===null?Y=null:(Y=u,Pu(u))}break b}}Z=0,Rl=null,Nu(e,t,o,5);break;case 6:Z=0,Rl=null,Nu(e,t,o,6);break;case 8:bu(),Ul=6;break a;default:throw Error(i(462))}}Au();break}catch(t){Su(e,t)}while(1);return Bi=zi=null,M.H=r,M.A=a,J=n,Y===null?(Ll=null,X=0,qr(),Ul):0}function Au(){for(;Y!==null&&!we();)ju(Y)}function ju(e){var t=Oc(e.alternate,e,Hl);e.memoizedProps=e.pendingProps,t===null?Pu(e):Y=t}function Mu(e){var t=e,n=t.alternate;switch(t.tag){case 15:case 0:t=fc(n,t,t.pendingProps,t.type,void 0,X);break;case 11:t=fc(n,t,t.pendingProps,t.type.render,t.ref,X);break;case 5:wo(t);default:Lc(n,t),t=Y=ii(t,Hl),t=Oc(n,t,Hl)}e.memoizedProps=e.pendingProps,t===null?Pu(e):Y=t}function Nu(e,t,n,r){Bi=zi=null,wo(t),Ta=null,Ea=0;var i=t.return;try{if(Zs(e,i,t,n,X)){Ul=1,Ks(e,di(n,e.current)),Y=null;return}}catch(t){if(i!==null)throw Y=i,t;Ul=1,Ks(e,di(n,e.current)),Y=null;return}t.flags&32768?(K||r===1?e=!0:Bl||X&536870912?e=!1:(zl=e=!0,(r===2||r===9||r===3||r===6)&&(r=Xa.current,r!==null&&r.tag===13&&(r.flags|=16384))),Fu(t,e)):Pu(t)}function Pu(e){var t=e;do{if(t.flags&32768){Fu(t,zl);return}e=t.return;var n=Fc(t.alternate,t,Hl);if(n!==null){Y=n;return}if(t=t.sibling,t!==null){Y=t;return}Y=t=e}while(t!==null);Ul===0&&(Ul=5)}function Fu(e,t){do{var n=Ic(e.alternate,e);if(n!==null){n.flags&=32767,Y=n;return}if(n=e.return,n!==null&&(n.flags|=32768,n.subtreeFlags=0,n.deletions=null),!t&&(e=e.sibling,e!==null)){Y=e;return}Y=e=n}while(e!==null);Ul=6,Y=null}function Iu(e,t,n,r,a,o,s,c,l){e.cancelPendingCommit=null;do Vu();while(ru!==0);if(J&6)throw Error(i(327));if(t!==null){if(t===e.current)throw Error(i(177));if(o=t.lanes|t.childLanes,o|=Kr,Ze(e,n,o,s,c,l),e===Ll&&(Y=Ll=null,X=0),au=t,iu=e,ou=n,su=o,cu=a,lu=r,t.subtreeFlags&10256||t.flags&10256?(e.callbackNode=null,e.callbackPriority=0,Yu(Ae,function(){return Hu(),null})):(e.callbackNode=null,e.callbackPriority=0),r=(t.flags&13878)!=0,t.subtreeFlags&13878||r){r=M.T,M.T=null,a=N.p,N.p=2,s=J,J|=4;try{nl(e,t,n)}finally{J=s,N.p=a,M.T=r}}ru=1,Lu(),Ru(),zu()}}function Lu(){if(ru===1){ru=0;var e=iu,t=au,n=(t.flags&13878)!=0;if(t.subtreeFlags&13878||n){n=M.T,M.T=null;var r=N.p;N.p=2;var i=J;J|=4;try{hl(t,e);var a=zd,o=br(e.containerInfo),s=a.focusedElem,c=a.selectionRange;if(o!==s&&s&&s.ownerDocument&&yr(s.ownerDocument.documentElement,s)){if(c!==null&&xr(s)){var l=c.start,u=c.end;if(u===void 0&&(u=l),`selectionStart`in s)s.selectionStart=l,s.selectionEnd=Math.min(u,s.value.length);else{var d=s.ownerDocument||document,f=d&&d.defaultView||window;if(f.getSelection){var p=f.getSelection(),m=s.textContent.length,h=Math.min(c.start,m),g=c.end===void 0?h:Math.min(c.end,m);!p.extend&&h>g&&(o=g,g=h,h=o);var _=vr(s,h),v=vr(s,g);if(_&&v&&(p.rangeCount!==1||p.anchorNode!==_.node||p.anchorOffset!==_.offset||p.focusNode!==v.node||p.focusOffset!==v.offset)){var y=d.createRange();y.setStart(_.node,_.offset),p.removeAllRanges(),h>g?(p.addRange(y),p.extend(v.node,v.offset)):(y.setEnd(v.node,v.offset),p.addRange(y))}}}}for(d=[],p=s;p=p.parentNode;)p.nodeType===1&&d.push({element:p,left:p.scrollLeft,top:p.scrollTop});for(typeof s.focus==`function`&&s.focus(),s=0;s<d.length;s++){var b=d[s];b.element.scrollLeft=b.left,b.element.scrollTop=b.top}}sp=!!Rd,zd=Rd=null}finally{J=i,N.p=r,M.T=n}}e.current=t,ru=2}}function Ru(){if(ru===2){ru=0;var e=iu,t=au,n=(t.flags&8772)!=0;if(t.subtreeFlags&8772||n){n=M.T,M.T=null;var r=N.p;N.p=2;var i=J;J|=4;try{rl(e,t.alternate,t)}finally{J=i,N.p=r,M.T=n}}ru=3}}function zu(){if(ru===4||ru===3){ru=0,Te();var e=iu,t=au,n=ou,r=lu;t.subtreeFlags&10256||t.flags&10256?ru=5:(ru=0,au=iu=null,Bu(e,e.pendingLanes));var i=e.pendingLanes;if(i===0&&(nu=null),nt(n),t=t.stateNode,Ie&&typeof Ie.onCommitFiberRoot==`function`)try{Ie.onCommitFiberRoot(Fe,t,void 0,(t.current.flags&128)==128)}catch{}if(r!==null){t=M.T,i=N.p,N.p=2,M.T=null;try{for(var a=e.onRecoverableError,o=0;o<r.length;o++){var s=r[o];a(s.value,{componentStack:s.stack})}}finally{M.T=t,N.p=i}}ou&3&&Vu(),nd(e),i=e.pendingLanes,n&261930&&i&42?e===du?uu++:(uu=0,du=e):uu=0,rd(0,!1)}}function Bu(e,t){(e.pooledCacheLanes&=t)===0&&(t=e.pooledCache,t!=null&&(e.pooledCache=null,na(t)))}function Vu(){return Lu(),Ru(),zu(),Hu()}function Hu(){if(ru!==5)return!1;var e=iu,t=su;su=0;var n=nt(ou),r=M.T,a=N.p;try{N.p=32>n?32:n,M.T=null,n=cu,cu=null;var o=iu,s=ou;if(ru=0,au=iu=null,ou=0,J&6)throw Error(i(331));var c=J;if(J|=4,Ml(o.current),wl(o,o.current,s,n),J=c,rd(0,!1),Ie&&typeof Ie.onPostCommitFiberRoot==`function`)try{Ie.onPostCommitFiberRoot(Fe,o)}catch{}return!0}finally{N.p=a,M.T=r,Bu(e,t)}}function Uu(e,t,n){t=di(n,t),t=Js(e.stateNode,t,2),e=La(e,t,2),e!==null&&(Xe(e,2),nd(e))}function Q(e,t,n){if(e.tag===3)Uu(e,e,n);else for(;t!==null;){if(t.tag===3){Uu(t,e,n);break}else if(t.tag===1){var r=t.stateNode;if(typeof t.type.getDerivedStateFromError==`function`||typeof r.componentDidCatch==`function`&&(nu===null||!nu.has(r))){e=di(n,e),n=Ys(2),r=La(t,n,2),r!==null&&(Xs(n,r,t,e),Xe(r,2),nd(r));break}}t=t.return}}function Wu(e,t,n){var r=e.pingCache;if(r===null){r=e.pingCache=new Il;var i=new Set;r.set(t,i)}else i=r.get(t),i===void 0&&(i=new Set,r.set(t,i));i.has(n)||(Vl=!0,i.add(n),e=Gu.bind(null,e,t,n),t.then(e,e))}function Gu(e,t,n){var r=e.pingCache;r!==null&&r.delete(t),e.pingedLanes|=e.suspendedLanes&n,e.warmLanes&=~n,Ll===e&&(X&n)===n&&(Ul===4||Ul===3&&(X&62914560)===X&&300>Ee()-Ql?!(J&2)&&xu(e,0):Kl|=n,Jl===X&&(Jl=0)),nd(e)}function Ku(e,t){t===0&&(t=Je()),e=Xr(e,t),e!==null&&(Xe(e,t),nd(e))}function qu(e){var t=e.memoizedState,n=0;t!==null&&(n=t.retryLane),Ku(e,n)}function Ju(e,t){var n=0;switch(e.tag){case 31:case 13:var r=e.stateNode,a=e.memoizedState;a!==null&&(n=a.retryLane);break;case 19:r=e.stateNode;break;case 22:r=e.stateNode._retryCache;break;default:throw Error(i(314))}r!==null&&r.delete(t),Ku(e,n)}function Yu(e,t){return Se(e,t)}var Xu=null,Zu=null,Qu=!1,$u=!1,ed=!1,td=0;function nd(e){e!==Zu&&e.next===null&&(Zu===null?Xu=Zu=e:Zu=Zu.next=e),$u=!0,Qu||(Qu=!0,ld())}function rd(e,t){if(!ed&&$u){ed=!0;do for(var n=!1,r=Xu;r!==null;){if(!t)if(e!==0){var i=r.pendingLanes;if(i===0)var a=0;else{var o=r.suspendedLanes,s=r.pingedLanes;a=(1<<31-Re(42|e)+1)-1,a&=i&~(o&~s),a=a&201326741?a&201326741|1:a?a|2:0}a!==0&&(n=!0,cd(r,a))}else a=X,a=Ge(r,r===Ll?a:0,r.cancelPendingCommit!==null||r.timeoutHandle!==-1),!(a&3)||Ke(r,a)||(n=!0,cd(r,a));r=r.next}while(n);ed=!1}}function id(){ad()}function ad(){$u=Qu=!1;var e=0;td!==0&&Gd()&&(e=td);for(var t=Ee(),n=null,r=Xu;r!==null;){var i=r.next,a=od(r,t);a===0?(r.next=null,n===null?Xu=i:n.next=i,i===null&&(Zu=n)):(n=r,(e!==0||a&3)&&($u=!0)),r=i}ru!==0&&ru!==5||rd(e,!1),td!==0&&(td=0)}function od(e,t){for(var n=e.suspendedLanes,r=e.pingedLanes,i=e.expirationTimes,a=e.pendingLanes&-62914561;0<a;){var o=31-Re(a),s=1<<o,c=i[o];c===-1?((s&n)===0||(s&r)!==0)&&(i[o]=qe(s,t)):c<=t&&(e.expiredLanes|=s),a&=~s}if(t=Ll,n=X,n=Ge(e,e===t?n:0,e.cancelPendingCommit!==null||e.timeoutHandle!==-1),r=e.callbackNode,n===0||e===t&&(Z===2||Z===9)||e.cancelPendingCommit!==null)return r!==null&&r!==null&&Ce(r),e.callbackNode=null,e.callbackPriority=0;if(!(n&3)||Ke(e,n)){if(t=n&-n,t===e.callbackPriority)return t;switch(r!==null&&Ce(r),nt(n)){case 2:case 8:n=ke;break;case 32:n=Ae;break;case 268435456:n=Me;break;default:n=Ae}return r=sd.bind(null,e),n=Se(n,r),e.callbackPriority=t,e.callbackNode=n,t}return r!==null&&r!==null&&Ce(r),e.callbackPriority=2,e.callbackNode=null,2}function sd(e,t){if(ru!==0&&ru!==5)return e.callbackNode=null,e.callbackPriority=0,null;var n=e.callbackNode;if(Vu()&&e.callbackNode!==n)return null;var r=X;return r=Ge(e,e===Ll?r:0,e.cancelPendingCommit!==null||e.timeoutHandle!==-1),r===0?null:(hu(e,r,t),od(e,Ee()),e.callbackNode!=null&&e.callbackNode===n?sd.bind(null,e):null)}function cd(e,t){if(Vu())return null;hu(e,t,!0)}function ld(){Yd(function(){J&6?Se(Oe,id):ad()})}function ud(){if(td===0){var e=aa;e===0&&(e=He,He<<=1,!(He&261888)&&(He=256)),td=e}return td}function dd(e){return e==null||typeof e==`symbol`||typeof e==`boolean`?null:typeof e==`function`?e:Yt(``+e)}function fd(e,t){var n=t.ownerDocument.createElement(`input`);return n.name=t.name,n.value=t.value,e.id&&n.setAttribute(`form`,e.id),t.parentNode.insertBefore(n,t),e=new FormData(e),n.parentNode.removeChild(n),e}function pd(e,t,n,r,i){if(t===`submit`&&n&&n.stateNode===i){var a=dd((i[st]||null).action),o=r.submitter;o&&(t=(t=o[st]||null)?dd(t.formAction):o.getAttribute(`formAction`),t!==null&&(a=t,o=null));var s=new _n(`action`,`action`,null,r,i);e.push({event:s,listeners:[{instance:null,listener:function(){if(r.defaultPrevented){if(td!==0){var e=o?fd(i,o):new FormData(i);bs(n,{pending:!0,data:e,method:i.method,action:a},null,e)}}else typeof a==`function`&&(s.preventDefault(),e=o?fd(i,o):new FormData(i),bs(n,{pending:!0,data:e,method:i.method,action:a},a,e))},currentTarget:i}]})}}for(var md=0;md<Vr.length;md++){var hd=Vr[md];Hr(hd.toLowerCase(),`on`+(hd[0].toUpperCase()+hd.slice(1)))}Hr(Nr,`onAnimationEnd`),Hr(Pr,`onAnimationIteration`),Hr(Fr,`onAnimationStart`),Hr(`dblclick`,`onDoubleClick`),Hr(`focusin`,`onFocus`),Hr(`focusout`,`onBlur`),Hr(Ir,`onTransitionRun`),Hr(Lr,`onTransitionStart`),Hr(Rr,`onTransitionCancel`),Hr(zr,`onTransitionEnd`),St(`onMouseEnter`,[`mouseout`,`mouseover`]),St(`onMouseLeave`,[`mouseout`,`mouseover`]),St(`onPointerEnter`,[`pointerout`,`pointerover`]),St(`onPointerLeave`,[`pointerout`,`pointerover`]),xt(`onChange`,`change click focusin focusout input keydown keyup selectionchange`.split(` `)),xt(`onSelect`,`focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange`.split(` `)),xt(`onBeforeInput`,[`compositionend`,`keypress`,`textInput`,`paste`]),xt(`onCompositionEnd`,`compositionend focusout keydown keypress keyup mousedown`.split(` `)),xt(`onCompositionStart`,`compositionstart focusout keydown keypress keyup mousedown`.split(` `)),xt(`onCompositionUpdate`,`compositionupdate focusout keydown keypress keyup mousedown`.split(` `));var gd=`abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting`.split(` `),_d=new Set(`beforetoggle cancel close invalid load scroll scrollend toggle`.split(` `).concat(gd));function vd(e,t){t=(t&4)!=0;for(var n=0;n<e.length;n++){var r=e[n],i=r.event;r=r.listeners;a:{var a=void 0;if(t)for(var o=r.length-1;0<=o;o--){var s=r[o],c=s.instance,l=s.currentTarget;if(s=s.listener,c!==a&&i.isPropagationStopped())break a;a=s,i.currentTarget=l;try{a(i)}catch(e){Ur(e)}i.currentTarget=null,a=c}else for(o=0;o<r.length;o++){if(s=r[o],c=s.instance,l=s.currentTarget,s=s.listener,c!==a&&i.isPropagationStopped())break a;a=s,i.currentTarget=l;try{a(i)}catch(e){Ur(e)}i.currentTarget=null,a=c}}}}function $(e,t){var n=t[lt];n===void 0&&(n=t[lt]=new Set);var r=e+`__bubble`;n.has(r)||(Sd(t,e,2,!1),n.add(r))}function yd(e,t,n){var r=0;t&&(r|=4),Sd(n,e,r,t)}var bd=`_reactListening`+Math.random().toString(36).slice(2);function xd(e){if(!e[bd]){e[bd]=!0,yt.forEach(function(t){t!==`selectionchange`&&(_d.has(t)||yd(t,!1,e),yd(t,!0,e))});var t=e.nodeType===9?e:e.ownerDocument;t===null||t[bd]||(t[bd]=!0,yd(`selectionchange`,!1,t))}}function Sd(e,t,n,r){switch(mp(t)){case 2:var i=cp;break;case 8:i=lp;break;default:i=up}n=i.bind(null,t,n,e),i=void 0,!sn||t!==`touchstart`&&t!==`touchmove`&&t!==`wheel`||(i=!0),r?i===void 0?e.addEventListener(t,n,!0):e.addEventListener(t,n,{capture:!0,passive:i}):i===void 0?e.addEventListener(t,n,!1):e.addEventListener(t,n,{passive:i})}function Cd(e,t,n,r,i){var a=r;if(!(t&1)&&!(t&2)&&r!==null)a:for(;;){if(r===null)return;var s=r.tag;if(s===3||s===4){var c=r.stateNode.containerInfo;if(c===i)break;if(s===4)for(s=r.return;s!==null;){var l=s.tag;if((l===3||l===4)&&s.stateNode.containerInfo===i)return;s=s.return}for(;c!==null;){if(s=ht(c),s===null)return;if(l=s.tag,l===5||l===6||l===26||l===27){r=a=s;continue a}c=c.parentNode}}r=r.return}rn(function(){var r=a,i=Qt(n),s=[];a:{var c=Br.get(e);if(c!==void 0){var l=_n,u=e;switch(e){case`keypress`:if(H(n)===0)break a;case`keydown`:case`keyup`:l=Fn;break;case`focusin`:u=`focus`,l=En;break;case`focusout`:u=`blur`,l=En;break;case`beforeblur`:case`afterblur`:l=En;break;case`click`:if(n.button===2)break a;case`auxclick`:case`dblclick`:case`mousedown`:case`mousemove`:case`mouseup`:case`mouseout`:case`mouseover`:case`contextmenu`:l=wn;break;case`drag`:case`dragend`:case`dragenter`:case`dragexit`:case`dragleave`:case`dragover`:case`dragstart`:case`drop`:l=Tn;break;case`touchcancel`:case`touchend`:case`touchmove`:case`touchstart`:l=Ln;break;case Nr:case Pr:case Fr:l=Dn;break;case zr:l=U;break;case`scroll`:case`scrollend`:l=yn;break;case`wheel`:l=Rn;break;case`copy`:case`cut`:case`paste`:l=On;break;case`gotpointercapture`:case`lostpointercapture`:case`pointercancel`:case`pointerdown`:case`pointermove`:case`pointerout`:case`pointerover`:case`pointerup`:l=In;break;case`toggle`:case`beforetoggle`:l=zn}var d=(t&4)!=0,f=!d&&(e===`scroll`||e===`scrollend`),p=d?c===null?null:c+`Capture`:c;d=[];for(var m=r,h;m!==null;){var g=m;if(h=g.stateNode,g=g.tag,g!==5&&g!==26&&g!==27||h===null||p===null||(g=an(m,p),g!=null&&d.push(wd(m,g,h))),f)break;m=m.return}0<d.length&&(c=new l(c,u,null,n,i),s.push({event:c,listeners:d}))}}if(!(t&7)){a:{if(c=e===`mouseover`||e===`pointerover`,l=e===`mouseout`||e===`pointerout`,c&&n!==Zt&&(u=n.relatedTarget||n.fromElement)&&(ht(u)||u[ct]))break a;if((l||c)&&(c=i.window===i?i:(c=i.ownerDocument)?c.defaultView||c.parentWindow:window,l?(u=n.relatedTarget||n.toElement,l=r,u=u?ht(u):null,u!==null&&(f=o(u),d=u.tag,u!==f||d!==5&&d!==27&&d!==6)&&(u=null)):(l=null,u=r),l!==u)){if(d=wn,g=`onMouseLeave`,p=`onMouseEnter`,m=`mouse`,(e===`pointerout`||e===`pointerover`)&&(d=In,g=`onPointerLeave`,p=`onPointerEnter`,m=`pointer`),f=l==null?c:_t(l),h=u==null?c:_t(u),c=new d(g,m+`leave`,l,n,i),c.target=f,c.relatedTarget=h,g=null,ht(i)===r&&(d=new d(p,m+`enter`,u,n,i),d.target=h,d.relatedTarget=f,g=d),f=g,l&&u)b:{for(d=Ed,p=l,m=u,h=0,g=p;g;g=d(g))h++;g=0;for(var _=m;_;_=d(_))g++;for(;0<h-g;)p=d(p),h--;for(;0<g-h;)m=d(m),g--;for(;h--;){if(p===m||m!==null&&p===m.alternate){d=p;break b}p=d(p),m=d(m)}d=null}else d=null;l!==null&&Dd(s,c,l,d,!1),u!==null&&f!==null&&Dd(s,f,u,d,!0)}}a:{if(c=r?_t(r):window,l=c.nodeName&&c.nodeName.toLowerCase(),l===`select`||l===`input`&&c.type===`file`)var v=rr;else if(Zn(c))if(ir)v=pr;else{v=dr;var y=ur}else l=c.nodeName,!l||l.toLowerCase()!==`input`||c.type!==`checkbox`&&c.type!==`radio`?r&&Kt(r.elementType)&&(v=rr):v=fr;if(v&&=v(e,r)){Qn(s,v,n,i);break a}y&&y(e,c,r),e===`focusout`&&r&&c.type===`number`&&r.memoizedProps.value!=null&&Rt(c,`number`,c.value)}switch(y=r?_t(r):window,e){case`focusin`:(Zn(y)||y.contentEditable===`true`)&&(Cr=y,wr=r,Tr=null);break;case`focusout`:Tr=wr=Cr=null;break;case`mousedown`:Er=!0;break;case`contextmenu`:case`mouseup`:case`dragend`:Er=!1,Dr(s,n,i);break;case`selectionchange`:if(Sr)break;case`keydown`:case`keyup`:Dr(s,n,i)}var b;if(Vn)b:{switch(e){case`compositionstart`:var x=`onCompositionStart`;break b;case`compositionend`:x=`onCompositionEnd`;break b;case`compositionupdate`:x=`onCompositionUpdate`;break b}x=void 0}else qn?G(e,n)&&(x=`onCompositionEnd`):e===`keydown`&&n.keyCode===229&&(x=`onCompositionStart`);x&&(Un&&n.locale!==`ko`&&(qn||x!==`onCompositionStart`?x===`onCompositionEnd`&&qn&&(b=fn()):(ln=i,un=`value`in ln?ln.value:ln.textContent,qn=!0)),y=Td(r,x),0<y.length&&(x=new kn(x,e,null,n,i),s.push({event:x,listeners:y}),b?x.data=b:(b=Kn(n),b!==null&&(x.data=b)))),(b=Hn?Jn(e,n):Yn(e,n))&&(x=Td(r,`onBeforeInput`),0<x.length&&(y=new kn(`onBeforeInput`,`beforeinput`,null,n,i),s.push({event:y,listeners:x}),y.data=b)),pd(s,e,r,n,i)}vd(s,t)})}function wd(e,t,n){return{instance:e,listener:t,currentTarget:n}}function Td(e,t){for(var n=t+`Capture`,r=[];e!==null;){var i=e,a=i.stateNode;if(i=i.tag,i!==5&&i!==26&&i!==27||a===null||(i=an(e,n),i!=null&&r.unshift(wd(e,i,a)),i=an(e,t),i!=null&&r.push(wd(e,i,a))),e.tag===3)return r;e=e.return}return[]}function Ed(e){if(e===null)return null;do e=e.return;while(e&&e.tag!==5&&e.tag!==27);return e||null}function Dd(e,t,n,r,i){for(var a=t._reactName,o=[];n!==null&&n!==r;){var s=n,c=s.alternate,l=s.stateNode;if(s=s.tag,c!==null&&c===r)break;s!==5&&s!==26&&s!==27||l===null||(c=l,i?(l=an(n,a),l!=null&&o.unshift(wd(n,l,c))):i||(l=an(n,a),l!=null&&o.push(wd(n,l,c)))),n=n.return}o.length!==0&&e.push({event:t,listeners:o})}var Od=/\r\n?/g,kd=/\u0000|\uFFFD/g;function Ad(e){return(typeof e==`string`?e:``+e).replace(Od,`
`).replace(kd,``)}function jd(e,t){return t=Ad(t),Ad(e)===t}function Md(e,t,n,r,a,o){switch(n){case`children`:typeof r==`string`?t===`body`||t===`textarea`&&r===``||Ht(e,r):(typeof r==`number`||typeof r==`bigint`)&&t!==`body`&&Ht(e,``+r);break;case`className`:B(e,`class`,r);break;case`tabIndex`:B(e,`tabindex`,r);break;case`dir`:case`role`:case`viewBox`:case`width`:case`height`:B(e,n,r);break;case`style`:Gt(e,r,o);break;case`data`:if(t!==`object`){B(e,`data`,r);break}case`src`:case`href`:if(r===``&&(t!==`a`||n!==`href`)){e.removeAttribute(n);break}if(r==null||typeof r==`function`||typeof r==`symbol`||typeof r==`boolean`){e.removeAttribute(n);break}r=Yt(``+r),e.setAttribute(n,r);break;case`action`:case`formAction`:if(typeof r==`function`){e.setAttribute(n,`javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')`);break}else typeof o==`function`&&(n===`formAction`?(t!==`input`&&Md(e,t,`name`,a.name,a,null),Md(e,t,`formEncType`,a.formEncType,a,null),Md(e,t,`formMethod`,a.formMethod,a,null),Md(e,t,`formTarget`,a.formTarget,a,null)):(Md(e,t,`encType`,a.encType,a,null),Md(e,t,`method`,a.method,a,null),Md(e,t,`target`,a.target,a,null)));if(r==null||typeof r==`symbol`||typeof r==`boolean`){e.removeAttribute(n);break}r=Yt(``+r),e.setAttribute(n,r);break;case`onClick`:r!=null&&(e.onclick=Xt);break;case`onScroll`:r!=null&&$(`scroll`,e);break;case`onScrollEnd`:r!=null&&$(`scrollend`,e);break;case`dangerouslySetInnerHTML`:if(r!=null){if(typeof r!=`object`||!(`__html`in r))throw Error(i(61));if(n=r.__html,n!=null){if(a.children!=null)throw Error(i(60));e.innerHTML=n}}break;case`multiple`:e.multiple=r&&typeof r!=`function`&&typeof r!=`symbol`;break;case`muted`:e.muted=r&&typeof r!=`function`&&typeof r!=`symbol`;break;case`suppressContentEditableWarning`:case`suppressHydrationWarning`:case`defaultValue`:case`defaultChecked`:case`innerHTML`:case`ref`:break;case`autoFocus`:break;case`xlinkHref`:if(r==null||typeof r==`function`||typeof r==`boolean`||typeof r==`symbol`){e.removeAttribute(`xlink:href`);break}n=Yt(``+r),e.setAttributeNS(`http://www.w3.org/1999/xlink`,`xlink:href`,n);break;case`contentEditable`:case`spellCheck`:case`draggable`:case`value`:case`autoReverse`:case`externalResourcesRequired`:case`focusable`:case`preserveAlpha`:r!=null&&typeof r!=`function`&&typeof r!=`symbol`?e.setAttribute(n,``+r):e.removeAttribute(n);break;case`inert`:case`allowFullScreen`:case`async`:case`autoPlay`:case`controls`:case`default`:case`defer`:case`disabled`:case`disablePictureInPicture`:case`disableRemotePlayback`:case`formNoValidate`:case`hidden`:case`loop`:case`noModule`:case`noValidate`:case`open`:case`playsInline`:case`readOnly`:case`required`:case`reversed`:case`scoped`:case`seamless`:case`itemScope`:r&&typeof r!=`function`&&typeof r!=`symbol`?e.setAttribute(n,``):e.removeAttribute(n);break;case`capture`:case`download`:!0===r?e.setAttribute(n,``):!1!==r&&r!=null&&typeof r!=`function`&&typeof r!=`symbol`?e.setAttribute(n,r):e.removeAttribute(n);break;case`cols`:case`rows`:case`size`:case`span`:r!=null&&typeof r!=`function`&&typeof r!=`symbol`&&!isNaN(r)&&1<=r?e.setAttribute(n,r):e.removeAttribute(n);break;case`rowSpan`:case`start`:r==null||typeof r==`function`||typeof r==`symbol`||isNaN(r)?e.removeAttribute(n):e.setAttribute(n,r);break;case`popover`:$(`beforetoggle`,e),$(`toggle`,e),Dt(e,`popover`,r);break;case`xlinkActuate`:Ot(e,`http://www.w3.org/1999/xlink`,`xlink:actuate`,r);break;case`xlinkArcrole`:Ot(e,`http://www.w3.org/1999/xlink`,`xlink:arcrole`,r);break;case`xlinkRole`:Ot(e,`http://www.w3.org/1999/xlink`,`xlink:role`,r);break;case`xlinkShow`:Ot(e,`http://www.w3.org/1999/xlink`,`xlink:show`,r);break;case`xlinkTitle`:Ot(e,`http://www.w3.org/1999/xlink`,`xlink:title`,r);break;case`xlinkType`:Ot(e,`http://www.w3.org/1999/xlink`,`xlink:type`,r);break;case`xmlBase`:Ot(e,`http://www.w3.org/XML/1998/namespace`,`xml:base`,r);break;case`xmlLang`:Ot(e,`http://www.w3.org/XML/1998/namespace`,`xml:lang`,r);break;case`xmlSpace`:Ot(e,`http://www.w3.org/XML/1998/namespace`,`xml:space`,r);break;case`is`:Dt(e,`is`,r);break;case`innerText`:case`textContent`:break;default:(!(2<n.length)||n[0]!==`o`&&n[0]!==`O`||n[1]!==`n`&&n[1]!==`N`)&&(n=qt.get(n)||n,Dt(e,n,r))}}function Nd(e,t,n,r,a,o){switch(n){case`style`:Gt(e,r,o);break;case`dangerouslySetInnerHTML`:if(r!=null){if(typeof r!=`object`||!(`__html`in r))throw Error(i(61));if(n=r.__html,n!=null){if(a.children!=null)throw Error(i(60));e.innerHTML=n}}break;case`children`:typeof r==`string`?Ht(e,r):(typeof r==`number`||typeof r==`bigint`)&&Ht(e,``+r);break;case`onScroll`:r!=null&&$(`scroll`,e);break;case`onScrollEnd`:r!=null&&$(`scrollend`,e);break;case`onClick`:r!=null&&(e.onclick=Xt);break;case`suppressContentEditableWarning`:case`suppressHydrationWarning`:case`innerHTML`:case`ref`:break;case`innerText`:case`textContent`:break;default:if(!bt.hasOwnProperty(n))a:{if(n[0]===`o`&&n[1]===`n`&&(a=n.endsWith(`Capture`),t=n.slice(2,a?n.length-7:void 0),o=e[st]||null,o=o==null?null:o[n],typeof o==`function`&&e.removeEventListener(t,o,a),typeof r==`function`)){typeof o!=`function`&&o!==null&&(n in e?e[n]=null:e.hasAttribute(n)&&e.removeAttribute(n)),e.addEventListener(t,r,a);break a}n in e?e[n]=r:!0===r?e.setAttribute(n,``):Dt(e,n,r)}}}function Pd(e,t,n){switch(t){case`div`:case`span`:case`svg`:case`path`:case`a`:case`g`:case`p`:case`li`:break;case`img`:$(`error`,e),$(`load`,e);var r=!1,a=!1,o;for(o in n)if(n.hasOwnProperty(o)){var s=n[o];if(s!=null)switch(o){case`src`:r=!0;break;case`srcSet`:a=!0;break;case`children`:case`dangerouslySetInnerHTML`:throw Error(i(137,t));default:Md(e,t,o,s,n,null)}}a&&Md(e,t,`srcSet`,n.srcSet,n,null),r&&Md(e,t,`src`,n.src,n,null);return;case`input`:$(`invalid`,e);var c=o=s=a=null,l=null,u=null;for(r in n)if(n.hasOwnProperty(r)){var d=n[r];if(d!=null)switch(r){case`name`:a=d;break;case`type`:s=d;break;case`checked`:l=d;break;case`defaultChecked`:u=d;break;case`value`:o=d;break;case`defaultValue`:c=d;break;case`children`:case`dangerouslySetInnerHTML`:if(d!=null)throw Error(i(137,t));break;default:Md(e,t,r,d,n,null)}}Lt(e,o,c,l,u,s,a,!1);return;case`select`:for(a in $(`invalid`,e),r=s=o=null,n)if(n.hasOwnProperty(a)&&(c=n[a],c!=null))switch(a){case`value`:o=c;break;case`defaultValue`:s=c;break;case`multiple`:r=c;default:Md(e,t,a,c,n,null)}t=o,n=s,e.multiple=!!r,t==null?n!=null&&zt(e,!!r,n,!0):zt(e,!!r,t,!1);return;case`textarea`:for(s in $(`invalid`,e),o=a=r=null,n)if(n.hasOwnProperty(s)&&(c=n[s],c!=null))switch(s){case`value`:r=c;break;case`defaultValue`:a=c;break;case`children`:o=c;break;case`dangerouslySetInnerHTML`:if(c!=null)throw Error(i(91));break;default:Md(e,t,s,c,n,null)}Vt(e,r,a,o);return;case`option`:for(l in n)if(n.hasOwnProperty(l)&&(r=n[l],r!=null))switch(l){case`selected`:e.selected=r&&typeof r!=`function`&&typeof r!=`symbol`;break;default:Md(e,t,l,r,n,null)}return;case`dialog`:$(`beforetoggle`,e),$(`toggle`,e),$(`cancel`,e),$(`close`,e);break;case`iframe`:case`object`:$(`load`,e);break;case`video`:case`audio`:for(r=0;r<gd.length;r++)$(gd[r],e);break;case`image`:$(`error`,e),$(`load`,e);break;case`details`:$(`toggle`,e);break;case`embed`:case`source`:case`link`:$(`error`,e),$(`load`,e);case`area`:case`base`:case`br`:case`col`:case`hr`:case`keygen`:case`meta`:case`param`:case`track`:case`wbr`:case`menuitem`:for(u in n)if(n.hasOwnProperty(u)&&(r=n[u],r!=null))switch(u){case`children`:case`dangerouslySetInnerHTML`:throw Error(i(137,t));default:Md(e,t,u,r,n,null)}return;default:if(Kt(t)){for(d in n)n.hasOwnProperty(d)&&(r=n[d],r!==void 0&&Nd(e,t,d,r,n,void 0));return}}for(c in n)n.hasOwnProperty(c)&&(r=n[c],r!=null&&Md(e,t,c,r,n,null))}function Fd(e,t,n,r){switch(t){case`div`:case`span`:case`svg`:case`path`:case`a`:case`g`:case`p`:case`li`:break;case`input`:var a=null,o=null,s=null,c=null,l=null,u=null,d=null;for(m in n){var f=n[m];if(n.hasOwnProperty(m)&&f!=null)switch(m){case`checked`:break;case`value`:break;case`defaultValue`:l=f;default:r.hasOwnProperty(m)||Md(e,t,m,null,r,f)}}for(var p in r){var m=r[p];if(f=n[p],r.hasOwnProperty(p)&&(m!=null||f!=null))switch(p){case`type`:o=m;break;case`name`:a=m;break;case`checked`:u=m;break;case`defaultChecked`:d=m;break;case`value`:s=m;break;case`defaultValue`:c=m;break;case`children`:case`dangerouslySetInnerHTML`:if(m!=null)throw Error(i(137,t));break;default:m!==f&&Md(e,t,p,m,r,f)}}It(e,s,c,l,u,d,o,a);return;case`select`:for(o in m=s=c=p=null,n)if(l=n[o],n.hasOwnProperty(o)&&l!=null)switch(o){case`value`:break;case`multiple`:m=l;default:r.hasOwnProperty(o)||Md(e,t,o,null,r,l)}for(a in r)if(o=r[a],l=n[a],r.hasOwnProperty(a)&&(o!=null||l!=null))switch(a){case`value`:p=o;break;case`defaultValue`:c=o;break;case`multiple`:s=o;default:o!==l&&Md(e,t,a,o,r,l)}t=c,n=s,r=m,p==null?!!r!=!!n&&(t==null?zt(e,!!n,n?[]:``,!1):zt(e,!!n,t,!0)):zt(e,!!n,p,!1);return;case`textarea`:for(c in m=p=null,n)if(a=n[c],n.hasOwnProperty(c)&&a!=null&&!r.hasOwnProperty(c))switch(c){case`value`:break;case`children`:break;default:Md(e,t,c,null,r,a)}for(s in r)if(a=r[s],o=n[s],r.hasOwnProperty(s)&&(a!=null||o!=null))switch(s){case`value`:p=a;break;case`defaultValue`:m=a;break;case`children`:break;case`dangerouslySetInnerHTML`:if(a!=null)throw Error(i(91));break;default:a!==o&&Md(e,t,s,a,r,o)}Bt(e,p,m);return;case`option`:for(var h in n)if(p=n[h],n.hasOwnProperty(h)&&p!=null&&!r.hasOwnProperty(h))switch(h){case`selected`:e.selected=!1;break;default:Md(e,t,h,null,r,p)}for(l in r)if(p=r[l],m=n[l],r.hasOwnProperty(l)&&p!==m&&(p!=null||m!=null))switch(l){case`selected`:e.selected=p&&typeof p!=`function`&&typeof p!=`symbol`;break;default:Md(e,t,l,p,r,m)}return;case`img`:case`link`:case`area`:case`base`:case`br`:case`col`:case`embed`:case`hr`:case`keygen`:case`meta`:case`param`:case`source`:case`track`:case`wbr`:case`menuitem`:for(var g in n)p=n[g],n.hasOwnProperty(g)&&p!=null&&!r.hasOwnProperty(g)&&Md(e,t,g,null,r,p);for(u in r)if(p=r[u],m=n[u],r.hasOwnProperty(u)&&p!==m&&(p!=null||m!=null))switch(u){case`children`:case`dangerouslySetInnerHTML`:if(p!=null)throw Error(i(137,t));break;default:Md(e,t,u,p,r,m)}return;default:if(Kt(t)){for(var _ in n)p=n[_],n.hasOwnProperty(_)&&p!==void 0&&!r.hasOwnProperty(_)&&Nd(e,t,_,void 0,r,p);for(d in r)p=r[d],m=n[d],!r.hasOwnProperty(d)||p===m||p===void 0&&m===void 0||Nd(e,t,d,p,r,m);return}}for(var v in n)p=n[v],n.hasOwnProperty(v)&&p!=null&&!r.hasOwnProperty(v)&&Md(e,t,v,null,r,p);for(f in r)p=r[f],m=n[f],!r.hasOwnProperty(f)||p===m||p==null&&m==null||Md(e,t,f,p,r,m)}function Id(e){switch(e){case`css`:case`script`:case`font`:case`img`:case`image`:case`input`:case`link`:return!0;default:return!1}}function Ld(){if(typeof performance.getEntriesByType==`function`){for(var e=0,t=0,n=performance.getEntriesByType(`resource`),r=0;r<n.length;r++){var i=n[r],a=i.transferSize,o=i.initiatorType,s=i.duration;if(a&&s&&Id(o)){for(o=0,s=i.responseEnd,r+=1;r<n.length;r++){var c=n[r],l=c.startTime;if(l>s)break;var u=c.transferSize,d=c.initiatorType;u&&Id(d)&&(c=c.responseEnd,o+=u*(c<s?1:(s-l)/(c-l)))}if(--r,t+=8*(a+o)/(i.duration/1e3),e++,10<e)break}}if(0<e)return t/e/1e6}return navigator.connection&&(e=navigator.connection.downlink,typeof e==`number`)?e:5}var Rd=null,zd=null;function Bd(e){return e.nodeType===9?e:e.ownerDocument}function Vd(e){switch(e){case`http://www.w3.org/2000/svg`:return 1;case`http://www.w3.org/1998/Math/MathML`:return 2;default:return 0}}function Hd(e,t){if(e===0)switch(t){case`svg`:return 1;case`math`:return 2;default:return 0}return e===1&&t===`foreignObject`?0:e}function Ud(e,t){return e===`textarea`||e===`noscript`||typeof t.children==`string`||typeof t.children==`number`||typeof t.children==`bigint`||typeof t.dangerouslySetInnerHTML==`object`&&t.dangerouslySetInnerHTML!==null&&t.dangerouslySetInnerHTML.__html!=null}var Wd=null;function Gd(){var e=window.event;return e&&e.type===`popstate`?e===Wd?!1:(Wd=e,!0):(Wd=null,!1)}var Kd=typeof setTimeout==`function`?setTimeout:void 0,qd=typeof clearTimeout==`function`?clearTimeout:void 0,Jd=typeof Promise==`function`?Promise:void 0,Yd=typeof queueMicrotask==`function`?queueMicrotask:Jd===void 0?Kd:function(e){return Jd.resolve(null).then(e).catch(Xd)};function Xd(e){setTimeout(function(){throw e})}function Zd(e){return e===`head`}function Qd(e,t){var n=t,r=0;do{var i=n.nextSibling;if(e.removeChild(n),i&&i.nodeType===8)if(n=i.data,n===`/$`||n===`/&`){if(r===0){e.removeChild(i),Np(t);return}r--}else if(n===`$`||n===`$?`||n===`$~`||n===`$!`||n===`&`)r++;else if(n===`html`)pf(e.ownerDocument.documentElement);else if(n===`head`){n=e.ownerDocument.head,pf(n);for(var a=n.firstChild;a;){var o=a.nextSibling,s=a.nodeName;a[pt]||s===`SCRIPT`||s===`STYLE`||s===`LINK`&&a.rel.toLowerCase()===`stylesheet`||n.removeChild(a),a=o}}else n===`body`&&pf(e.ownerDocument.body);n=i}while(n);Np(t)}function $d(e,t){var n=e;e=0;do{var r=n.nextSibling;if(n.nodeType===1?t?(n._stashedDisplay=n.style.display,n.style.display=`none`):(n.style.display=n._stashedDisplay||``,n.getAttribute(`style`)===``&&n.removeAttribute(`style`)):n.nodeType===3&&(t?(n._stashedText=n.nodeValue,n.nodeValue=``):n.nodeValue=n._stashedText||``),r&&r.nodeType===8)if(n=r.data,n===`/$`){if(e===0)break;e--}else n!==`$`&&n!==`$?`&&n!==`$~`&&n!==`$!`||e++;n=r}while(n)}function ef(e){var t=e.firstChild;for(t&&t.nodeType===10&&(t=t.nextSibling);t;){var n=t;switch(t=t.nextSibling,n.nodeName){case`HTML`:case`HEAD`:case`BODY`:ef(n),mt(n);continue;case`SCRIPT`:case`STYLE`:continue;case`LINK`:if(n.rel.toLowerCase()===`stylesheet`)continue}e.removeChild(n)}}function tf(e,t,n,r){for(;e.nodeType===1;){var i=n;if(e.nodeName.toLowerCase()!==t.toLowerCase()){if(!r&&(e.nodeName!==`INPUT`||e.type!==`hidden`))break}else if(!r)if(t===`input`&&e.type===`hidden`){var a=i.name==null?null:``+i.name;if(i.type===`hidden`&&e.getAttribute(`name`)===a)return e}else return e;else if(!e[pt])switch(t){case`meta`:if(!e.hasAttribute(`itemprop`))break;return e;case`link`:if(a=e.getAttribute(`rel`),a===`stylesheet`&&e.hasAttribute(`data-precedence`)||a!==i.rel||e.getAttribute(`href`)!==(i.href==null||i.href===``?null:i.href)||e.getAttribute(`crossorigin`)!==(i.crossOrigin==null?null:i.crossOrigin)||e.getAttribute(`title`)!==(i.title==null?null:i.title))break;return e;case`style`:if(e.hasAttribute(`data-precedence`))break;return e;case`script`:if(a=e.getAttribute(`src`),(a!==(i.src==null?null:i.src)||e.getAttribute(`type`)!==(i.type==null?null:i.type)||e.getAttribute(`crossorigin`)!==(i.crossOrigin==null?null:i.crossOrigin))&&a&&e.hasAttribute(`async`)&&!e.hasAttribute(`itemprop`))break;return e;default:return e}if(e=cf(e.nextSibling),e===null)break}return null}function nf(e,t,n){if(t===``)return null;for(;e.nodeType!==3;)if((e.nodeType!==1||e.nodeName!==`INPUT`||e.type!==`hidden`)&&!n||(e=cf(e.nextSibling),e===null))return null;return e}function rf(e,t){for(;e.nodeType!==8;)if((e.nodeType!==1||e.nodeName!==`INPUT`||e.type!==`hidden`)&&!t||(e=cf(e.nextSibling),e===null))return null;return e}function af(e){return e.data===`$?`||e.data===`$~`}function of(e){return e.data===`$!`||e.data===`$?`&&e.ownerDocument.readyState!==`loading`}function sf(e,t){var n=e.ownerDocument;if(e.data===`$~`)e._reactRetry=t;else if(e.data!==`$?`||n.readyState!==`loading`)t();else{var r=function(){t(),n.removeEventListener(`DOMContentLoaded`,r)};n.addEventListener(`DOMContentLoaded`,r),e._reactRetry=r}}function cf(e){for(;e!=null;e=e.nextSibling){var t=e.nodeType;if(t===1||t===3)break;if(t===8){if(t=e.data,t===`$`||t===`$!`||t===`$?`||t===`$~`||t===`&`||t===`F!`||t===`F`)break;if(t===`/$`||t===`/&`)return null}}return e}var lf=null;function uf(e){e=e.nextSibling;for(var t=0;e;){if(e.nodeType===8){var n=e.data;if(n===`/$`||n===`/&`){if(t===0)return cf(e.nextSibling);t--}else n!==`$`&&n!==`$!`&&n!==`$?`&&n!==`$~`&&n!==`&`||t++}e=e.nextSibling}return null}function df(e){e=e.previousSibling;for(var t=0;e;){if(e.nodeType===8){var n=e.data;if(n===`$`||n===`$!`||n===`$?`||n===`$~`||n===`&`){if(t===0)return e;t--}else n!==`/$`&&n!==`/&`||t++}e=e.previousSibling}return null}function ff(e,t,n){switch(t=Bd(n),e){case`html`:if(e=t.documentElement,!e)throw Error(i(452));return e;case`head`:if(e=t.head,!e)throw Error(i(453));return e;case`body`:if(e=t.body,!e)throw Error(i(454));return e;default:throw Error(i(451))}}function pf(e){for(var t=e.attributes;t.length;)e.removeAttributeNode(t[0]);mt(e)}var mf=new Map,hf=new Set;function gf(e){return typeof e.getRootNode==`function`?e.getRootNode():e.nodeType===9?e:e.ownerDocument}var _f=N.d;N.d={f:vf,r:yf,D:Sf,C:Cf,L:wf,m:Tf,X:Df,S:Ef,M:Of};function vf(){var e=_f.f(),t=yu();return e||t}function yf(e){var t=gt(e);t!==null&&t.tag===5&&t.type===`form`?Ss(t):_f.r(e)}var bf=typeof document>`u`?null:document;function xf(e,t,n){var r=bf;if(r&&typeof t==`string`&&t){var i=Ft(t);i=`link[rel="`+e+`"][href="`+i+`"]`,typeof n==`string`&&(i+=`[crossorigin="`+n+`"]`),hf.has(i)||(hf.add(i),e={rel:e,crossOrigin:n,href:t},r.querySelector(i)===null&&(t=r.createElement(`link`),Pd(t,`link`,e),z(t),r.head.appendChild(t)))}}function Sf(e){_f.D(e),xf(`dns-prefetch`,e,null)}function Cf(e,t){_f.C(e,t),xf(`preconnect`,e,t)}function wf(e,t,n){_f.L(e,t,n);var r=bf;if(r&&e&&t){var i=`link[rel="preload"][as="`+Ft(t)+`"]`;t===`image`&&n&&n.imageSrcSet?(i+=`[imagesrcset="`+Ft(n.imageSrcSet)+`"]`,typeof n.imageSizes==`string`&&(i+=`[imagesizes="`+Ft(n.imageSizes)+`"]`)):i+=`[href="`+Ft(e)+`"]`;var a=i;switch(t){case`style`:a=Af(e);break;case`script`:a=Pf(e)}mf.has(a)||(e=h({rel:`preload`,href:t===`image`&&n&&n.imageSrcSet?void 0:e,as:t},n),mf.set(a,e),r.querySelector(i)!==null||t===`style`&&r.querySelector(jf(a))||t===`script`&&r.querySelector(Ff(a))||(t=r.createElement(`link`),Pd(t,`link`,e),z(t),r.head.appendChild(t)))}}function Tf(e,t){_f.m(e,t);var n=bf;if(n&&e){var r=t&&typeof t.as==`string`?t.as:`script`,i=`link[rel="modulepreload"][as="`+Ft(r)+`"][href="`+Ft(e)+`"]`,a=i;switch(r){case`audioworklet`:case`paintworklet`:case`serviceworker`:case`sharedworker`:case`worker`:case`script`:a=Pf(e)}if(!mf.has(a)&&(e=h({rel:`modulepreload`,href:e},t),mf.set(a,e),n.querySelector(i)===null)){switch(r){case`audioworklet`:case`paintworklet`:case`serviceworker`:case`sharedworker`:case`worker`:case`script`:if(n.querySelector(Ff(a)))return}r=n.createElement(`link`),Pd(r,`link`,e),z(r),n.head.appendChild(r)}}}function Ef(e,t,n){_f.S(e,t,n);var r=bf;if(r&&e){var i=vt(r).hoistableStyles,a=Af(e);t||=`default`;var o=i.get(a);if(!o){var s={loading:0,preload:null};if(o=r.querySelector(jf(a)))s.loading=5;else{e=h({rel:`stylesheet`,href:e,"data-precedence":t},n),(n=mf.get(a))&&Rf(e,n);var c=o=r.createElement(`link`);z(c),Pd(c,`link`,e),c._p=new Promise(function(e,t){c.onload=e,c.onerror=t}),c.addEventListener(`load`,function(){s.loading|=1}),c.addEventListener(`error`,function(){s.loading|=2}),s.loading|=4,Lf(o,t,r)}o={type:`stylesheet`,instance:o,count:1,state:s},i.set(a,o)}}}function Df(e,t){_f.X(e,t);var n=bf;if(n&&e){var r=vt(n).hoistableScripts,i=Pf(e),a=r.get(i);a||(a=n.querySelector(Ff(i)),a||(e=h({src:e,async:!0},t),(t=mf.get(i))&&zf(e,t),a=n.createElement(`script`),z(a),Pd(a,`link`,e),n.head.appendChild(a)),a={type:`script`,instance:a,count:1,state:null},r.set(i,a))}}function Of(e,t){_f.M(e,t);var n=bf;if(n&&e){var r=vt(n).hoistableScripts,i=Pf(e),a=r.get(i);a||(a=n.querySelector(Ff(i)),a||(e=h({src:e,async:!0,type:`module`},t),(t=mf.get(i))&&zf(e,t),a=n.createElement(`script`),z(a),Pd(a,`link`,e),n.head.appendChild(a)),a={type:`script`,instance:a,count:1,state:null},r.set(i,a))}}function kf(e,t,n,r){var a=(a=I.current)?gf(a):null;if(!a)throw Error(i(446));switch(e){case`meta`:case`title`:return null;case`style`:return typeof n.precedence==`string`&&typeof n.href==`string`?(t=Af(n.href),n=vt(a).hoistableStyles,r=n.get(t),r||(r={type:`style`,instance:null,count:0,state:null},n.set(t,r)),r):{type:`void`,instance:null,count:0,state:null};case`link`:if(n.rel===`stylesheet`&&typeof n.href==`string`&&typeof n.precedence==`string`){e=Af(n.href);var o=vt(a).hoistableStyles,s=o.get(e);if(s||(a=a.ownerDocument||a,s={type:`stylesheet`,instance:null,count:0,state:{loading:0,preload:null}},o.set(e,s),(o=a.querySelector(jf(e)))&&!o._p&&(s.instance=o,s.state.loading=5),mf.has(e)||(n={rel:`preload`,as:`style`,href:n.href,crossOrigin:n.crossOrigin,integrity:n.integrity,media:n.media,hrefLang:n.hrefLang,referrerPolicy:n.referrerPolicy},mf.set(e,n),o||Nf(a,e,n,s.state))),t&&r===null)throw Error(i(528,``));return s}if(t&&r!==null)throw Error(i(529,``));return null;case`script`:return t=n.async,n=n.src,typeof n==`string`&&t&&typeof t!=`function`&&typeof t!=`symbol`?(t=Pf(n),n=vt(a).hoistableScripts,r=n.get(t),r||(r={type:`script`,instance:null,count:0,state:null},n.set(t,r)),r):{type:`void`,instance:null,count:0,state:null};default:throw Error(i(444,e))}}function Af(e){return`href="`+Ft(e)+`"`}function jf(e){return`link[rel="stylesheet"][`+e+`]`}function Mf(e){return h({},e,{"data-precedence":e.precedence,precedence:null})}function Nf(e,t,n,r){e.querySelector(`link[rel="preload"][as="style"][`+t+`]`)?r.loading=1:(t=e.createElement(`link`),r.preload=t,t.addEventListener(`load`,function(){return r.loading|=1}),t.addEventListener(`error`,function(){return r.loading|=2}),Pd(t,`link`,n),z(t),e.head.appendChild(t))}function Pf(e){return`[src="`+Ft(e)+`"]`}function Ff(e){return`script[async]`+e}function If(e,t,n){if(t.count++,t.instance===null)switch(t.type){case`style`:var r=e.querySelector(`style[data-href~="`+Ft(n.href)+`"]`);if(r)return t.instance=r,z(r),r;var a=h({},n,{"data-href":n.href,"data-precedence":n.precedence,href:null,precedence:null});return r=(e.ownerDocument||e).createElement(`style`),z(r),Pd(r,`style`,a),Lf(r,n.precedence,e),t.instance=r;case`stylesheet`:a=Af(n.href);var o=e.querySelector(jf(a));if(o)return t.state.loading|=4,t.instance=o,z(o),o;r=Mf(n),(a=mf.get(a))&&Rf(r,a),o=(e.ownerDocument||e).createElement(`link`),z(o);var s=o;return s._p=new Promise(function(e,t){s.onload=e,s.onerror=t}),Pd(o,`link`,r),t.state.loading|=4,Lf(o,n.precedence,e),t.instance=o;case`script`:return o=Pf(n.src),(a=e.querySelector(Ff(o)))?(t.instance=a,z(a),a):(r=n,(a=mf.get(o))&&(r=h({},n),zf(r,a)),e=e.ownerDocument||e,a=e.createElement(`script`),z(a),Pd(a,`link`,r),e.head.appendChild(a),t.instance=a);case`void`:return null;default:throw Error(i(443,t.type))}else t.type===`stylesheet`&&!(t.state.loading&4)&&(r=t.instance,t.state.loading|=4,Lf(r,n.precedence,e));return t.instance}function Lf(e,t,n){for(var r=n.querySelectorAll(`link[rel="stylesheet"][data-precedence],style[data-precedence]`),i=r.length?r[r.length-1]:null,a=i,o=0;o<r.length;o++){var s=r[o];if(s.dataset.precedence===t)a=s;else if(a!==i)break}a?a.parentNode.insertBefore(e,a.nextSibling):(t=n.nodeType===9?n.head:n,t.insertBefore(e,t.firstChild))}function Rf(e,t){e.crossOrigin??=t.crossOrigin,e.referrerPolicy??=t.referrerPolicy,e.title??=t.title}function zf(e,t){e.crossOrigin??=t.crossOrigin,e.referrerPolicy??=t.referrerPolicy,e.integrity??=t.integrity}var Bf=null;function Vf(e,t,n){if(Bf===null){var r=new Map,i=Bf=new Map;i.set(n,r)}else i=Bf,r=i.get(n),r||(r=new Map,i.set(n,r));if(r.has(e))return r;for(r.set(e,null),n=n.getElementsByTagName(e),i=0;i<n.length;i++){var a=n[i];if(!(a[pt]||a[ot]||e===`link`&&a.getAttribute(`rel`)===`stylesheet`)&&a.namespaceURI!==`http://www.w3.org/2000/svg`){var o=a.getAttribute(t)||``;o=e+o;var s=r.get(o);s?s.push(a):r.set(o,[a])}}return r}function Hf(e,t,n){e=e.ownerDocument||e,e.head.insertBefore(n,t===`title`?e.querySelector(`head > title`):null)}function Uf(e,t,n){if(n===1||t.itemProp!=null)return!1;switch(e){case`meta`:case`title`:return!0;case`style`:if(typeof t.precedence!=`string`||typeof t.href!=`string`||t.href===``)break;return!0;case`link`:if(typeof t.rel!=`string`||typeof t.href!=`string`||t.href===``||t.onLoad||t.onError)break;switch(t.rel){case`stylesheet`:return e=t.disabled,typeof t.precedence==`string`&&e==null;default:return!0}case`script`:if(t.async&&typeof t.async!=`function`&&typeof t.async!=`symbol`&&!t.onLoad&&!t.onError&&t.src&&typeof t.src==`string`)return!0}return!1}function Wf(e){return!(e.type===`stylesheet`&&!(e.state.loading&3))}function Gf(e,t,n,r){if(n.type===`stylesheet`&&(typeof r.media!=`string`||!1!==matchMedia(r.media).matches)&&!(n.state.loading&4)){if(n.instance===null){var i=Af(r.href),a=t.querySelector(jf(i));if(a){t=a._p,typeof t==`object`&&t&&typeof t.then==`function`&&(e.count++,e=Jf.bind(e),t.then(e,e)),n.state.loading|=4,n.instance=a,z(a);return}a=t.ownerDocument||t,r=Mf(r),(i=mf.get(i))&&Rf(r,i),a=a.createElement(`link`),z(a);var o=a;o._p=new Promise(function(e,t){o.onload=e,o.onerror=t}),Pd(a,`link`,r),n.instance=a}e.stylesheets===null&&(e.stylesheets=new Map),e.stylesheets.set(n,t),(t=n.state.preload)&&!(n.state.loading&3)&&(e.count++,n=Jf.bind(e),t.addEventListener(`load`,n),t.addEventListener(`error`,n))}}var Kf=0;function qf(e,t){return e.stylesheets&&e.count===0&&Xf(e,e.stylesheets),0<e.count||0<e.imgCount?function(n){var r=setTimeout(function(){if(e.stylesheets&&Xf(e,e.stylesheets),e.unsuspend){var t=e.unsuspend;e.unsuspend=null,t()}},6e4+t);0<e.imgBytes&&Kf===0&&(Kf=62500*Ld());var i=setTimeout(function(){if(e.waitingForImages=!1,e.count===0&&(e.stylesheets&&Xf(e,e.stylesheets),e.unsuspend)){var t=e.unsuspend;e.unsuspend=null,t()}},(e.imgBytes>Kf?50:800)+t);return e.unsuspend=n,function(){e.unsuspend=null,clearTimeout(r),clearTimeout(i)}}:null}function Jf(){if(this.count--,this.count===0&&(this.imgCount===0||!this.waitingForImages)){if(this.stylesheets)Xf(this,this.stylesheets);else if(this.unsuspend){var e=this.unsuspend;this.unsuspend=null,e()}}}var Yf=null;function Xf(e,t){e.stylesheets=null,e.unsuspend!==null&&(e.count++,Yf=new Map,t.forEach(Zf,e),Yf=null,Jf.call(e))}function Zf(e,t){if(!(t.state.loading&4)){var n=Yf.get(e);if(n)var r=n.get(null);else{n=new Map,Yf.set(e,n);for(var i=e.querySelectorAll(`link[data-precedence],style[data-precedence]`),a=0;a<i.length;a++){var o=i[a];(o.nodeName===`LINK`||o.getAttribute(`media`)!==`not all`)&&(n.set(o.dataset.precedence,o),r=o)}r&&n.set(null,r)}i=t.instance,o=i.getAttribute(`data-precedence`),a=n.get(o)||r,a===r&&n.set(null,i),n.set(o,i),this.count++,r=Jf.bind(this),i.addEventListener(`load`,r),i.addEventListener(`error`,r),a?a.parentNode.insertBefore(i,a.nextSibling):(e=e.nodeType===9?e.head:e,e.insertBefore(i,e.firstChild)),t.state.loading|=4}}var Qf={$$typeof:S,Provider:null,Consumer:null,_currentValue:ie,_currentValue2:ie,_threadCount:0};function $f(e,t,n,r,i,a,o,s,c){this.tag=1,this.containerInfo=e,this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.next=this.pendingContext=this.context=this.cancelPendingCommit=null,this.callbackPriority=0,this.expirationTimes=Ye(-1),this.entangledLanes=this.shellSuspendCounter=this.errorRecoveryDisabledLanes=this.expiredLanes=this.warmLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Ye(0),this.hiddenUpdates=Ye(null),this.identifierPrefix=r,this.onUncaughtError=i,this.onCaughtError=a,this.onRecoverableError=o,this.pooledCache=null,this.pooledCacheLanes=0,this.formState=c,this.incompleteTransitions=new Map}function ep(e,t,n,r,i,a,o,s,c,l,u,d){return e=new $f(e,t,n,o,c,l,u,d,s),t=1,!0===a&&(t|=24),a=ti(3,null,null,t),e.current=a,a.stateNode=e,t=ta(),t.refCount++,e.pooledCache=t,t.refCount++,a.memoizedState={element:r,isDehydrated:n,cache:t},Pa(a),e}function tp(e){return e?(e=$r,e):$r}function np(e,t,n,r,i,a){i=tp(i),r.context===null?r.context=i:r.pendingContext=i,r=Ia(t),r.payload={element:n},a=a===void 0?null:a,a!==null&&(r.callback=a),n=La(e,r,t),n!==null&&(mu(n,e,t),Ra(n,e,t))}function rp(e,t){if(e=e.memoizedState,e!==null&&e.dehydrated!==null){var n=e.retryLane;e.retryLane=n!==0&&n<t?n:t}}function ip(e,t){rp(e,t),(e=e.alternate)&&rp(e,t)}function ap(e){if(e.tag===13||e.tag===31){var t=Xr(e,67108864);t!==null&&mu(t,e,67108864),ip(e,67108864)}}function op(e){if(e.tag===13||e.tag===31){var t=fu();t=tt(t);var n=Xr(e,t);n!==null&&mu(n,e,t),ip(e,t)}}var sp=!0;function cp(e,t,n,r){var i=M.T;M.T=null;var a=N.p;try{N.p=2,up(e,t,n,r)}finally{N.p=a,M.T=i}}function lp(e,t,n,r){var i=M.T;M.T=null;var a=N.p;try{N.p=8,up(e,t,n,r)}finally{N.p=a,M.T=i}}function up(e,t,n,r){if(sp){var i=dp(r);if(i===null)Cd(e,t,r,fp,n),Cp(e,r);else if(Tp(i,e,t,n,r))r.stopPropagation();else if(Cp(e,r),t&4&&-1<Sp.indexOf(e)){for(;i!==null;){var a=gt(i);if(a!==null)switch(a.tag){case 3:if(a=a.stateNode,a.current.memoizedState.isDehydrated){var o=We(a.pendingLanes);if(o!==0){var s=a;for(s.pendingLanes|=2,s.entangledLanes|=2;o;){var c=1<<31-Re(o);s.entanglements[1]|=c,o&=~c}nd(a),!(J&6)&&(eu=Ee()+500,rd(0,!1))}}break;case 31:case 13:s=Xr(a,2),s!==null&&mu(s,a,2),yu(),ip(a,2)}if(a=dp(r),a===null&&Cd(e,t,r,fp,n),a===i)break;i=a}i!==null&&r.stopPropagation()}else Cd(e,t,r,null,n)}}function dp(e){return e=Qt(e),pp(e)}var fp=null;function pp(e){if(fp=null,e=ht(e),e!==null){var t=o(e);if(t===null)e=null;else{var n=t.tag;if(n===13){if(e=s(t),e!==null)return e;e=null}else if(n===31){if(e=c(t),e!==null)return e;e=null}else if(n===3){if(t.stateNode.current.memoizedState.isDehydrated)return t.tag===3?t.stateNode.containerInfo:null;e=null}else t!==e&&(e=null)}}return fp=e,null}function mp(e){switch(e){case`beforetoggle`:case`cancel`:case`click`:case`close`:case`contextmenu`:case`copy`:case`cut`:case`auxclick`:case`dblclick`:case`dragend`:case`dragstart`:case`drop`:case`focusin`:case`focusout`:case`input`:case`invalid`:case`keydown`:case`keypress`:case`keyup`:case`mousedown`:case`mouseup`:case`paste`:case`pause`:case`play`:case`pointercancel`:case`pointerdown`:case`pointerup`:case`ratechange`:case`reset`:case`resize`:case`seeked`:case`submit`:case`toggle`:case`touchcancel`:case`touchend`:case`touchstart`:case`volumechange`:case`change`:case`selectionchange`:case`textInput`:case`compositionstart`:case`compositionend`:case`compositionupdate`:case`beforeblur`:case`afterblur`:case`beforeinput`:case`blur`:case`fullscreenchange`:case`focus`:case`hashchange`:case`popstate`:case`select`:case`selectstart`:return 2;case`drag`:case`dragenter`:case`dragexit`:case`dragleave`:case`dragover`:case`mousemove`:case`mouseout`:case`mouseover`:case`pointermove`:case`pointerout`:case`pointerover`:case`scroll`:case`touchmove`:case`wheel`:case`mouseenter`:case`mouseleave`:case`pointerenter`:case`pointerleave`:return 8;case`message`:switch(De()){case Oe:return 2;case ke:return 8;case Ae:case je:return 32;case Me:return 268435456;default:return 32}default:return 32}}var hp=!1,gp=null,_p=null,vp=null,yp=new Map,bp=new Map,xp=[],Sp=`mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset`.split(` `);function Cp(e,t){switch(e){case`focusin`:case`focusout`:gp=null;break;case`dragenter`:case`dragleave`:_p=null;break;case`mouseover`:case`mouseout`:vp=null;break;case`pointerover`:case`pointerout`:yp.delete(t.pointerId);break;case`gotpointercapture`:case`lostpointercapture`:bp.delete(t.pointerId)}}function wp(e,t,n,r,i,a){return e===null||e.nativeEvent!==a?(e={blockedOn:t,domEventName:n,eventSystemFlags:r,nativeEvent:a,targetContainers:[i]},t!==null&&(t=gt(t),t!==null&&ap(t)),e):(e.eventSystemFlags|=r,t=e.targetContainers,i!==null&&t.indexOf(i)===-1&&t.push(i),e)}function Tp(e,t,n,r,i){switch(t){case`focusin`:return gp=wp(gp,e,t,n,r,i),!0;case`dragenter`:return _p=wp(_p,e,t,n,r,i),!0;case`mouseover`:return vp=wp(vp,e,t,n,r,i),!0;case`pointerover`:var a=i.pointerId;return yp.set(a,wp(yp.get(a)||null,e,t,n,r,i)),!0;case`gotpointercapture`:return a=i.pointerId,bp.set(a,wp(bp.get(a)||null,e,t,n,r,i)),!0}return!1}function Ep(e){var t=ht(e.target);if(t!==null){var n=o(t);if(n!==null){if(t=n.tag,t===13){if(t=s(n),t!==null){e.blockedOn=t,it(e.priority,function(){op(n)});return}}else if(t===31){if(t=c(n),t!==null){e.blockedOn=t,it(e.priority,function(){op(n)});return}}else if(t===3&&n.stateNode.current.memoizedState.isDehydrated){e.blockedOn=n.tag===3?n.stateNode.containerInfo:null;return}}}e.blockedOn=null}function Dp(e){if(e.blockedOn!==null)return!1;for(var t=e.targetContainers;0<t.length;){var n=dp(e.nativeEvent);if(n===null){n=e.nativeEvent;var r=new n.constructor(n.type,n);Zt=r,n.target.dispatchEvent(r),Zt=null}else return t=gt(n),t!==null&&ap(t),e.blockedOn=n,!1;t.shift()}return!0}function Op(e,t,n){Dp(e)&&n.delete(t)}function kp(){hp=!1,gp!==null&&Dp(gp)&&(gp=null),_p!==null&&Dp(_p)&&(_p=null),vp!==null&&Dp(vp)&&(vp=null),yp.forEach(Op),bp.forEach(Op)}function Ap(e,n){e.blockedOn===n&&(e.blockedOn=null,hp||(hp=!0,t.unstable_scheduleCallback(t.unstable_NormalPriority,kp)))}var jp=null;function Mp(e){jp!==e&&(jp=e,t.unstable_scheduleCallback(t.unstable_NormalPriority,function(){jp===e&&(jp=null);for(var t=0;t<e.length;t+=3){var n=e[t],r=e[t+1],i=e[t+2];if(typeof r!=`function`){if(pp(r||n)===null)continue;break}var a=gt(n);a!==null&&(e.splice(t,3),t-=3,bs(a,{pending:!0,data:i,method:n.method,action:r},r,i))}}))}function Np(e){function t(t){return Ap(t,e)}gp!==null&&Ap(gp,e),_p!==null&&Ap(_p,e),vp!==null&&Ap(vp,e),yp.forEach(t),bp.forEach(t);for(var n=0;n<xp.length;n++){var r=xp[n];r.blockedOn===e&&(r.blockedOn=null)}for(;0<xp.length&&(n=xp[0],n.blockedOn===null);)Ep(n),n.blockedOn===null&&xp.shift();if(n=(e.ownerDocument||e).$$reactFormReplay,n!=null)for(r=0;r<n.length;r+=3){var i=n[r],a=n[r+1],o=i[st]||null;if(typeof a==`function`)o||Mp(n);else if(o){var s=null;if(a&&a.hasAttribute(`formAction`)){if(i=a,o=a[st]||null)s=o.formAction;else if(pp(i)!==null)continue}else s=o.action;typeof s==`function`?n[r+1]=s:(n.splice(r,3),r-=3),Mp(n)}}}function Pp(){function e(e){e.canIntercept&&e.info===`react-transition`&&e.intercept({handler:function(){return new Promise(function(e){return i=e})},focusReset:`manual`,scroll:`manual`})}function t(){i!==null&&(i(),i=null),r||setTimeout(n,20)}function n(){if(!r&&!navigation.transition){var e=navigation.currentEntry;e&&e.url!=null&&navigation.navigate(e.url,{state:e.getState(),info:`react-transition`,history:`replace`})}}if(typeof navigation==`object`){var r=!1,i=null;return navigation.addEventListener(`navigate`,e),navigation.addEventListener(`navigatesuccess`,t),navigation.addEventListener(`navigateerror`,t),setTimeout(n,100),function(){r=!0,navigation.removeEventListener(`navigate`,e),navigation.removeEventListener(`navigatesuccess`,t),navigation.removeEventListener(`navigateerror`,t),i!==null&&(i(),i=null)}}}function Fp(e){this._internalRoot=e}Ip.prototype.render=Fp.prototype.render=function(e){var t=this._internalRoot;if(t===null)throw Error(i(409));var n=t.current;np(n,fu(),e,t,null,null)},Ip.prototype.unmount=Fp.prototype.unmount=function(){var e=this._internalRoot;if(e!==null){this._internalRoot=null;var t=e.containerInfo;np(e.current,2,null,e,null,null),yu(),t[ct]=null}};function Ip(e){this._internalRoot=e}Ip.prototype.unstable_scheduleHydration=function(e){if(e){var t=rt();e={blockedOn:null,target:e,priority:t};for(var n=0;n<xp.length&&t!==0&&t<xp[n].priority;n++);xp.splice(n,0,e),n===0&&Ep(e)}};var Lp=n.version;if(Lp!==`19.2.6`)throw Error(i(527,Lp,`19.2.6`));N.findDOMNode=function(e){var t=e._reactInternals;if(t===void 0)throw typeof e.render==`function`?Error(i(188)):(e=Object.keys(e).join(`,`),Error(i(268,e)));return e=d(t),e=e===null?null:p(e),e=e===null?null:e.stateNode,e};var Rp={bundleType:0,version:`19.2.6`,rendererPackageName:`react-dom`,currentDispatcherRef:M,reconcilerVersion:`19.2.6`};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<`u`){var zp=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!zp.isDisabled&&zp.supportsFiber)try{Fe=zp.inject(Rp),Ie=zp}catch{}}e.createRoot=function(e,t){if(!a(e))throw Error(i(299));var n=!1,r=``,o=Us,s=Ws,c=Gs;return t!=null&&(!0===t.unstable_strictMode&&(n=!0),t.identifierPrefix!==void 0&&(r=t.identifierPrefix),t.onUncaughtError!==void 0&&(o=t.onUncaughtError),t.onCaughtError!==void 0&&(s=t.onCaughtError),t.onRecoverableError!==void 0&&(c=t.onRecoverableError)),t=ep(e,1,!1,null,null,n,r,null,o,s,c,Pp),e[ct]=t.current,xd(e),new Fp(t)}})),g=o(((e,t)=>{function n(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>`u`||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!=`function`))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n)}catch(e){console.error(e)}}n(),t.exports=h()})),_=`modulepreload`,v=function(e){return`/`+e},y={},b=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e=document.getElementsByTagName(`link`),i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}r=o(t.map(t=>{if(t=v(t,n),t in y)return;y[t]=!0;let r=t.endsWith(`.css`),i=r?`[rel="stylesheet"]`:``;if(n)for(let n=e.length-1;n>=0;n--){let i=e[n];if(i.href===t&&(!r||i.rel===`stylesheet`))return}else if(document.querySelector(`link[href="${t}"]${i}`))return;let o=document.createElement(`link`);if(o.rel=r?`stylesheet`:_,r||(o.as=`script`),o.crossOrigin=``,o.href=t,a&&o.setAttribute(`nonce`,a),document.head.appendChild(o),r)return new Promise((e,n)=>{o.addEventListener(`load`,e),o.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${t}`)))})}))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})},x=c(u(),1),ee=`popstate`;function S(e){return typeof e==`object`&&!!e&&`pathname`in e&&`search`in e&&`hash`in e&&`state`in e&&`key`in e}function C(e={}){function t(e,t){let n=t.state?.masked,{pathname:r,search:i,hash:a}=n||e.location;return O(``,{pathname:r,search:i,hash:a},t.state&&t.state.usr||null,t.state&&t.state.key||`default`,n?{pathname:e.location.pathname,search:e.location.search,hash:e.location.hash}:void 0)}function n(e,t){return typeof t==`string`?t:k(t)}return te(t,n,null,e)}function w(e,t){if(e===!1||e==null)throw Error(t)}function T(e,t){if(!e){typeof console<`u`&&console.warn(t);try{throw Error(t)}catch{}}}function E(){return Math.random().toString(36).substring(2,10)}function D(e,t){return{usr:e.state,key:e.key,idx:t,masked:e.mask?{pathname:e.pathname,search:e.search,hash:e.hash}:void 0}}function O(e,t,n=null,r,i){return{pathname:typeof e==`string`?e:e.pathname,search:``,hash:``,...typeof t==`string`?A(t):t,state:n,key:t&&t.key||r||E(),mask:i}}function k({pathname:e=`/`,search:t=``,hash:n=``}){return t&&t!==`?`&&(e+=t.charAt(0)===`?`?t:`?`+t),n&&n!==`#`&&(e+=n.charAt(0)===`#`?n:`#`+n),e}function A(e){let t={};if(e){let n=e.indexOf(`#`);n>=0&&(t.hash=e.substring(n),e=e.substring(0,n));let r=e.indexOf(`?`);r>=0&&(t.search=e.substring(r),e=e.substring(0,r)),e&&(t.pathname=e)}return t}function te(e,t,n,r={}){let{window:i=document.defaultView,v5Compat:a=!1}=r,o=i.history,s=`POP`,c=null,l=u();l??(l=0,o.replaceState({...o.state,idx:l},``));function u(){return(o.state||{idx:null}).idx}function d(){s=`POP`;let e=u(),t=e==null?null:e-l;l=e,c&&c({action:s,location:h.location,delta:t})}function f(e,t){s=`PUSH`;let r=S(e)?e:O(h.location,e,t);n&&n(r,e),l=u()+1;let d=D(r,l),f=h.createHref(r.mask||r);try{o.pushState(d,``,f)}catch(e){if(e instanceof DOMException&&e.name===`DataCloneError`)throw e;i.location.assign(f)}a&&c&&c({action:s,location:h.location,delta:1})}function p(e,t){s=`REPLACE`;let r=S(e)?e:O(h.location,e,t);n&&n(r,e),l=u();let i=D(r,l),d=h.createHref(r.mask||r);o.replaceState(i,``,d),a&&c&&c({action:s,location:h.location,delta:0})}function m(e){return ne(e)}let h={get action(){return s},get location(){return e(i,o)},listen(e){if(c)throw Error(`A history only accepts one active listener`);return i.addEventListener(ee,d),c=e,()=>{i.removeEventListener(ee,d),c=null}},createHref(e){return t(i,e)},createURL:m,encodeLocation(e){let t=m(e);return{pathname:t.pathname,search:t.search,hash:t.hash}},push:f,replace:p,go(e){return o.go(e)}};return h}function ne(e,t=!1){let n=`http://localhost`;typeof window<`u`&&(n=window.location.origin===`null`?window.location.href:window.location.origin),w(n,`No window.location.(origin|href) available to create URL`);let r=typeof e==`string`?e:k(e);return r=r.replace(/ $/,`%20`),!t&&r.startsWith(`//`)&&(r=n+r),new URL(r,n)}function re(e,t,n=`/`){return j(e,t,n,!1)}function j(e,t,n,r,i){let a=L((typeof t==`string`?A(t):t).pathname||`/`,n);if(a==null)return null;let o=i??N(e),s=null,c=ge(a);for(let e=0;s==null&&e<o.length;++e)s=pe(o[e],c,r);return s}function M(e,t){let{route:n,pathname:r,params:i}=e;return{id:n.id,pathname:r,params:i,data:t[n.id],loaderData:t[n.id],handle:n.handle}}function N(e){let t=ie(e);return oe(t),t}function ie(e,t=[],n=[],r=``,i=!1){let a=(e,a,o=i,s)=>{let c={relativePath:s===void 0?e.path||``:s,caseSensitive:e.caseSensitive===!0,childrenIndex:a,route:e};if(c.relativePath.startsWith(`/`)){if(!c.relativePath.startsWith(r)&&o)return;w(c.relativePath.startsWith(r),`Absolute route path "${c.relativePath}" nested under path "${r}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`),c.relativePath=c.relativePath.slice(r.length)}let l=Te([r,c.relativePath]),u=n.concat(c);e.children&&e.children.length>0&&(w(e.index!==!0,`Index routes must not have child routes. Please remove all child routes from route path "${l}".`),ie(e.children,t,u,l,o)),!(e.path==null&&!e.index)&&t.push({path:l,score:de(l,e.index),routesMeta:u})};return e.forEach((e,t)=>{if(e.path===``||!e.path?.includes(`?`))a(e,t);else for(let n of ae(e.path))a(e,t,!0,n)}),t}function ae(e){let t=e.split(`/`);if(t.length===0)return[];let[n,...r]=t,i=n.endsWith(`?`),a=n.replace(/\?$/,``);if(r.length===0)return i?[a,``]:[a];let o=ae(r.join(`/`)),s=[];return s.push(...o.map(e=>e===``?a:[a,e].join(`/`))),i&&s.push(...o),s.map(t=>e.startsWith(`/`)&&t===``?`/`:t)}function oe(e){e.sort((e,t)=>e.score===t.score?fe(e.routesMeta.map(e=>e.childrenIndex),t.routesMeta.map(e=>e.childrenIndex)):t.score-e.score)}var se=/^:[\w-]+$/,ce=3,P=2,F=1,le=10,I=-2,ue=e=>e===`*`;function de(e,t){let n=e.split(`/`),r=n.length;return n.some(ue)&&(r+=I),t&&(r+=P),n.filter(e=>!ue(e)).reduce((e,t)=>e+(se.test(t)?ce:t===``?F:le),r)}function fe(e,t){return e.length===t.length&&e.slice(0,-1).every((e,n)=>e===t[n])?e[e.length-1]-t[t.length-1]:0}function pe(e,t,n=!1){let{routesMeta:r}=e,i={},a=`/`,o=[];for(let e=0;e<r.length;++e){let s=r[e],c=e===r.length-1,l=a===`/`?t:t.slice(a.length)||`/`,u=me({path:s.relativePath,caseSensitive:s.caseSensitive,end:c},l),d=s.route;if(!u&&c&&n&&!r[r.length-1].route.index&&(u=me({path:s.relativePath,caseSensitive:s.caseSensitive,end:!1},l)),!u)return null;Object.assign(i,u.params),o.push({params:i,pathname:Te([a,u.pathname]),pathnameBase:De(Te([a,u.pathnameBase])),route:d}),u.pathnameBase!==`/`&&(a=Te([a,u.pathnameBase]))}return o}function me(e,t){typeof e==`string`&&(e={path:e,caseSensitive:!1,end:!0});let[n,r]=he(e.path,e.caseSensitive,e.end),i=t.match(n);if(!i)return null;let a=i[0],o=a.replace(/(.)\/+$/,`$1`),s=i.slice(1);return{params:r.reduce((e,{paramName:t,isOptional:n},r)=>{if(t===`*`){let e=s[r]||``;o=a.slice(0,a.length-e.length).replace(/(.)\/+$/,`$1`)}let i=s[r];return n&&!i?e[t]=void 0:e[t]=(i||``).replace(/%2F/g,`/`),e},{}),pathname:a,pathnameBase:o,pattern:e}}function he(e,t=!1,n=!0){T(e===`*`||!e.endsWith(`*`)||e.endsWith(`/*`),`Route path "${e}" will be treated as if it were "${e.replace(/\*$/,`/*`)}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${e.replace(/\*$/,`/*`)}".`);let r=[],i=`^`+e.replace(/\/*\*?$/,``).replace(/^\/*/,`/`).replace(/[\\.*+^${}|()[\]]/g,`\\$&`).replace(/\/:([\w-]+)(\?)?/g,(e,t,n,i,a)=>{if(r.push({paramName:t,isOptional:n!=null}),n){let t=a.charAt(i+e.length);return t&&t!==`/`?`/([^\\/]*)`:`(?:/([^\\/]*))?`}return`/([^\\/]+)`}).replace(/\/([\w-]+)\?(\/|$)/g,`(/$1)?$2`);return e.endsWith(`*`)?(r.push({paramName:`*`}),i+=e===`*`||e===`/*`?`(.*)$`:`(?:\\/(.+)|\\/*)$`):n?i+=`\\/*$`:e!==``&&e!==`/`&&(i+=`(?:(?=\\/|$))`),[new RegExp(i,t?void 0:`i`),r]}function ge(e){try{return e.split(`/`).map(e=>decodeURIComponent(e).replace(/\//g,`%2F`)).join(`/`)}catch(t){return T(!1,`The URL path "${e}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${t}).`),e}}function L(e,t){if(t===`/`)return e;if(!e.toLowerCase().startsWith(t.toLowerCase()))return null;let n=t.endsWith(`/`)?t.length-1:t.length,r=e.charAt(n);return r&&r!==`/`?null:e.slice(n)||`/`}var _e=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;function ve(e,t=`/`){let{pathname:n,search:r=``,hash:i=``}=typeof e==`string`?A(e):e,a;return n?(n=we(n),a=n.startsWith(`/`)?ye(n.substring(1),`/`):ye(n,t)):a=t,{pathname:a,search:Oe(r),hash:ke(i)}}function ye(e,t){let n=Ee(t).split(`/`);return e.split(`/`).forEach(e=>{e===`..`?n.length>1&&n.pop():e!==`.`&&n.push(e)}),n.length>1?n.join(`/`):`/`}function be(e,t,n,r){return`Cannot include a '${e}' character in a manually specified \`to.${t}\` field [${JSON.stringify(r)}].  Please separate it out to the \`to.${n}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`}function xe(e){return e.filter((e,t)=>t===0||e.route.path&&e.route.path.length>0)}function Se(e){let t=xe(e);return t.map((e,n)=>n===t.length-1?e.pathname:e.pathnameBase)}function Ce(e,t,n,r=!1){let i;typeof e==`string`?i=A(e):(i={...e},w(!i.pathname||!i.pathname.includes(`?`),be(`?`,`pathname`,`search`,i)),w(!i.pathname||!i.pathname.includes(`#`),be(`#`,`pathname`,`hash`,i)),w(!i.search||!i.search.includes(`#`),be(`#`,`search`,`hash`,i)));let a=e===``||i.pathname===``,o=a?`/`:i.pathname,s;if(o==null)s=n;else{let e=t.length-1;if(!r&&o.startsWith(`..`)){let t=o.split(`/`);for(;t[0]===`..`;)t.shift(),--e;i.pathname=t.join(`/`)}s=e>=0?t[e]:`/`}let c=ve(i,s),l=o&&o!==`/`&&o.endsWith(`/`),u=(a||o===`.`)&&n.endsWith(`/`);return!c.pathname.endsWith(`/`)&&(l||u)&&(c.pathname+=`/`),c}var we=e=>e.replace(/\/\/+/g,`/`),Te=e=>we(e.join(`/`)),Ee=e=>e.replace(/\/+$/,``),De=e=>Ee(e).replace(/^\/*/,`/`),Oe=e=>!e||e===`?`?``:e.startsWith(`?`)?e:`?`+e,ke=e=>!e||e===`#`?``:e.startsWith(`#`)?e:`#`+e,Ae=class{constructor(e,t,n,r=!1){this.status=e,this.statusText=t||``,this.internal=r,n instanceof Error?(this.data=n.toString(),this.error=n):this.data=n}};function je(e){return e!=null&&typeof e.status==`number`&&typeof e.statusText==`string`&&typeof e.internal==`boolean`&&`data`in e}function Me(e){return Te(e.map(e=>e.route.path).filter(Boolean))||`/`}var Ne=typeof window<`u`&&window.document!==void 0&&window.document.createElement!==void 0;function Pe(e,t){let n=e;if(typeof n!=`string`||!_e.test(n))return{absoluteURL:void 0,isExternal:!1,to:n};let r=n,i=!1;if(Ne)try{let e=new URL(window.location.href),r=n.startsWith(`//`)?new URL(e.protocol+n):new URL(n),a=L(r.pathname,t);r.origin===e.origin&&a!=null?n=a+r.search+r.hash:i=!0}catch{T(!1,`<Link to="${n}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`)}return{absoluteURL:r,isExternal:i,to:n}}Object.getOwnPropertyNames(Object.prototype).sort().join(`\0`);var Fe=[`POST`,`PUT`,`PATCH`,`DELETE`];new Set(Fe);var Ie=[`GET`,...Fe];new Set(Ie);var Le=x.createContext(null);Le.displayName=`DataRouter`;var Re=x.createContext(null);Re.displayName=`DataRouterState`;var ze=x.createContext(!1);function Be(){return x.useContext(ze)}var Ve=x.createContext({isTransitioning:!1});Ve.displayName=`ViewTransition`;var He=x.createContext(new Map);He.displayName=`Fetchers`;var Ue=x.createContext(null);Ue.displayName=`Await`;var R=x.createContext(null);R.displayName=`Navigation`;var We=x.createContext(null);We.displayName=`Location`;var Ge=x.createContext({outlet:null,matches:[],isDataRoute:!1});Ge.displayName=`Route`;var Ke=x.createContext(null);Ke.displayName=`RouteError`;var qe=`REACT_ROUTER_ERROR`,Je=`REDIRECT`,Ye=`ROUTE_ERROR_RESPONSE`;function Xe(e){if(e.startsWith(`${qe}:${Je}:{`))try{let t=JSON.parse(e.slice(28));if(typeof t==`object`&&t&&typeof t.status==`number`&&typeof t.statusText==`string`&&typeof t.location==`string`&&typeof t.reloadDocument==`boolean`&&typeof t.replace==`boolean`)return t}catch{}}function Ze(e){if(e.startsWith(`${qe}:${Ye}:{`))try{let t=JSON.parse(e.slice(40));if(typeof t==`object`&&t&&typeof t.status==`number`&&typeof t.statusText==`string`)return new Ae(t.status,t.statusText,t.data)}catch{}}function Qe(e,{relative:t}={}){w($e(),`useHref() may be used only in the context of a <Router> component.`);let{basename:n,navigator:r}=x.useContext(R),{hash:i,pathname:a,search:o}=at(e,{relative:t}),s=a;return n!==`/`&&(s=a===`/`?n:Te([n,a])),r.createHref({pathname:s,search:o,hash:i})}function $e(){return x.useContext(We)!=null}function et(){return w($e(),`useLocation() may be used only in the context of a <Router> component.`),x.useContext(We).location}var tt=`You should call navigate() in a React.useEffect(), not when your component is first rendered.`;function nt(e){x.useContext(R).static||x.useLayoutEffect(e)}function rt(){let{isDataRoute:e}=x.useContext(Ge);return e?Ct():it()}function it(){w($e(),`useNavigate() may be used only in the context of a <Router> component.`);let e=x.useContext(Le),{basename:t,navigator:n}=x.useContext(R),{matches:r}=x.useContext(Ge),{pathname:i}=et(),a=JSON.stringify(Se(r)),o=x.useRef(!1);return nt(()=>{o.current=!0}),x.useCallback((r,s={})=>{if(T(o.current,tt),!o.current)return;if(typeof r==`number`){n.go(r);return}let c=Ce(r,JSON.parse(a),i,s.relative===`path`);e==null&&t!==`/`&&(c.pathname=c.pathname===`/`?t:Te([t,c.pathname])),(s.replace?n.replace:n.push)(c,s.state,s)},[t,n,a,i,e])}x.createContext(null);function at(e,{relative:t}={}){let{matches:n}=x.useContext(Ge),{pathname:r}=et(),i=JSON.stringify(Se(n));return x.useMemo(()=>Ce(e,JSON.parse(i),r,t===`path`),[e,i,r,t])}function ot(e,t){return st(e,t)}function st(e,t,n){w($e(),`useRoutes() may be used only in the context of a <Router> component.`);let{navigator:r}=x.useContext(R),{matches:i}=x.useContext(Ge),a=i[i.length-1],o=a?a.params:{},s=a?a.pathname:`/`,c=a?a.pathnameBase:`/`,l=a&&a.route;{let e=l&&l.path||``;Tt(s,!l||e.endsWith(`*`)||e.endsWith(`*?`),`You rendered descendant <Routes> (or called \`useRoutes()\`) at "${s}" (under <Route path="${e}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${e}"> to <Route path="${e===`/`?`*`:`${e}/*`}">.`)}let u=et(),d;if(t){let e=typeof t==`string`?A(t):t;w(c===`/`||e.pathname?.startsWith(c),`When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${c}" but pathname "${e.pathname}" was given in the \`location\` prop.`),d=e}else d=u;let f=d.pathname||`/`,p=f;if(c!==`/`){let e=c.replace(/^\//,``).split(`/`);p=`/`+f.replace(/^\//,``).split(`/`).slice(e.length).join(`/`)}let m=n&&n.state.matches.length?n.state.matches.map(e=>Object.assign(e,{route:n.manifest[e.route.id]||e.route})):re(e,{pathname:p});T(l||m!=null,`No routes matched location "${d.pathname}${d.search}${d.hash}" `),T(m==null||m[m.length-1].route.element!==void 0||m[m.length-1].route.Component!==void 0||m[m.length-1].route.lazy!==void 0,`Matched leaf route at location "${d.pathname}${d.search}${d.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`);let h=mt(m&&m.map(e=>Object.assign({},e,{params:Object.assign({},o,e.params),pathname:Te([c,r.encodeLocation?r.encodeLocation(e.pathname.replace(/%/g,`%25`).replace(/\?/g,`%3F`).replace(/#/g,`%23`)).pathname:e.pathname]),pathnameBase:e.pathnameBase===`/`?c:Te([c,r.encodeLocation?r.encodeLocation(e.pathnameBase.replace(/%/g,`%25`).replace(/\?/g,`%3F`).replace(/#/g,`%23`)).pathname:e.pathnameBase])})),i,n);return t&&h?x.createElement(We.Provider,{value:{location:{pathname:`/`,search:``,hash:``,state:null,key:`default`,mask:void 0,...d},navigationType:`POP`}},h):h}function ct(){let e=St(),t=je(e)?`${e.status} ${e.statusText}`:e instanceof Error?e.message:JSON.stringify(e),n=e instanceof Error?e.stack:null,r=`rgba(200,200,200, 0.5)`,i={padding:`0.5rem`,backgroundColor:r},a={padding:`2px 4px`,backgroundColor:r},o=null;return console.error(`Error handled by React Router default ErrorBoundary:`,e),o=x.createElement(x.Fragment,null,x.createElement(`p`,null,`💿 Hey developer 👋`),x.createElement(`p`,null,`You can provide a way better UX than this when your app throws errors by providing your own `,x.createElement(`code`,{style:a},`ErrorBoundary`),` or`,` `,x.createElement(`code`,{style:a},`errorElement`),` prop on your route.`)),x.createElement(x.Fragment,null,x.createElement(`h2`,null,`Unexpected Application Error!`),x.createElement(`h3`,{style:{fontStyle:`italic`}},t),n?x.createElement(`pre`,{style:i},n):null,o)}var lt=x.createElement(ct,null),ut=class extends x.Component{constructor(e){super(e),this.state={location:e.location,revalidation:e.revalidation,error:e.error}}static getDerivedStateFromError(e){return{error:e}}static getDerivedStateFromProps(e,t){return t.location!==e.location||t.revalidation!==`idle`&&e.revalidation===`idle`?{error:e.error,location:e.location,revalidation:e.revalidation}:{error:e.error===void 0?t.error:e.error,location:t.location,revalidation:e.revalidation||t.revalidation}}componentDidCatch(e,t){this.props.onError?this.props.onError(e,t):console.error(`React Router caught the following error during render`,e)}render(){let e=this.state.error;if(this.context&&typeof e==`object`&&e&&`digest`in e&&typeof e.digest==`string`){let t=Ze(e.digest);t&&(e=t)}let t=e===void 0?this.props.children:x.createElement(Ge.Provider,{value:this.props.routeContext},x.createElement(Ke.Provider,{value:e,children:this.props.component}));return this.context?x.createElement(ft,{error:e},t):t}};ut.contextType=ze;var dt=new WeakMap;function ft({children:e,error:t}){let{basename:n}=x.useContext(R);if(typeof t==`object`&&t&&`digest`in t&&typeof t.digest==`string`){let e=Xe(t.digest);if(e){let r=dt.get(t);if(r)throw r;let i=Pe(e.location,n);if(Ne&&!dt.get(t))if(i.isExternal||e.reloadDocument)window.location.href=i.absoluteURL||i.to;else{let n=Promise.resolve().then(()=>window.__reactRouterDataRouter.navigate(i.to,{replace:e.replace}));throw dt.set(t,n),n}return x.createElement(`meta`,{httpEquiv:`refresh`,content:`0;url=${i.absoluteURL||i.to}`})}}return e}function pt({routeContext:e,match:t,children:n}){let r=x.useContext(Le);return r&&r.static&&r.staticContext&&(t.route.errorElement||t.route.ErrorBoundary)&&(r.staticContext._deepestRenderedBoundaryId=t.route.id),x.createElement(Ge.Provider,{value:e},n)}function mt(e,t=[],n){let r=n?.state;if(e==null){if(!r)return null;if(r.errors)e=r.matches;else if(t.length===0&&!r.initialized&&r.matches.length>0)e=r.matches;else return null}let i=e,a=r?.errors;if(a!=null){let e=i.findIndex(e=>e.route.id&&a?.[e.route.id]!==void 0);w(e>=0,`Could not find a matching route for errors on route IDs: ${Object.keys(a).join(`,`)}`),i=i.slice(0,Math.min(i.length,e+1))}let o=!1,s=-1;if(n&&r){o=r.renderFallback;for(let e=0;e<i.length;e++){let t=i[e];if((t.route.HydrateFallback||t.route.hydrateFallbackElement)&&(s=e),t.route.id){let{loaderData:e,errors:a}=r,c=t.route.loader&&!e.hasOwnProperty(t.route.id)&&(!a||a[t.route.id]===void 0);if(t.route.lazy||c){n.isStatic&&(o=!0),i=s>=0?i.slice(0,s+1):[i[0]];break}}}}let c=n?.onError,l=r&&c?(e,t)=>{c(e,{location:r.location,params:r.matches?.[0]?.params??{},pattern:Me(r.matches),errorInfo:t})}:void 0;return i.reduceRight((e,n,c)=>{let u,d=!1,f=null,p=null;r&&(u=a&&n.route.id?a[n.route.id]:void 0,f=n.route.errorElement||lt,o&&(s<0&&c===0?(Tt(`route-fallback`,!1,"No `HydrateFallback` element provided to render during initial hydration"),d=!0,p=null):s===c&&(d=!0,p=n.route.hydrateFallbackElement||null)));let m=t.concat(i.slice(0,c+1)),h=()=>{let t;return t=u?f:d?p:n.route.Component?x.createElement(n.route.Component,null):n.route.element?n.route.element:e,x.createElement(pt,{match:n,routeContext:{outlet:e,matches:m,isDataRoute:r!=null},children:t})};return r&&(n.route.ErrorBoundary||n.route.errorElement||c===0)?x.createElement(ut,{location:r.location,revalidation:r.revalidation,component:f,error:u,children:h(),routeContext:{outlet:null,matches:m,isDataRoute:!0},onError:l}):h()},null)}function ht(e){return`${e} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function gt(e){let t=x.useContext(Le);return w(t,ht(e)),t}function _t(e){let t=x.useContext(Re);return w(t,ht(e)),t}function vt(e){let t=x.useContext(Ge);return w(t,ht(e)),t}function z(e){let t=vt(e),n=t.matches[t.matches.length-1];return w(n.route.id,`${e} can only be used on routes that contain a unique "id"`),n.route.id}function yt(){return z(`useRouteId`)}function bt(){let e=_t(`useNavigation`);return x.useMemo(()=>{let{matches:t,historyAction:n,...r}=e.navigation;return r},[e.navigation])}function xt(){let{matches:e,loaderData:t}=_t(`useMatches`);return x.useMemo(()=>e.map(e=>M(e,t)),[e,t])}function St(){let e=x.useContext(Ke),t=_t(`useRouteError`),n=z(`useRouteError`);return e===void 0?t.errors?.[n]:e}function Ct(){let{router:e}=gt(`useNavigate`),t=z(`useNavigate`),n=x.useRef(!1);return nt(()=>{n.current=!0}),x.useCallback(async(r,i={})=>{T(n.current,tt),n.current&&(typeof r==`number`?await e.navigate(r):await e.navigate(r,{fromRouteId:t,...i}))},[e,t])}var wt={};function Tt(e,t,n){!t&&!wt[e]&&(wt[e]=!0,T(!1,n))}x.memo(Et);function Et({routes:e,manifest:t,future:n,state:r,isStatic:i,onError:a}){return st(e,void 0,{manifest:t,state:r,isStatic:i,onError:a,future:n})}function Dt(e){w(!1,`A <Route> is only ever to be used as the child of <Routes> element, never rendered directly. Please wrap your <Route> in a <Routes>.`)}function B({basename:e=`/`,children:t=null,location:n,navigationType:r=`POP`,navigator:i,static:a=!1,useTransitions:o}){w(!$e(),`You cannot render a <Router> inside another <Router>. You should never have more than one in your app.`);let s=e.replace(/^\/*/,`/`),c=x.useMemo(()=>({basename:s,navigator:i,static:a,useTransitions:o,future:{}}),[s,i,a,o]);typeof n==`string`&&(n=A(n));let{pathname:l=`/`,search:u=``,hash:d=``,state:f=null,key:p=`default`,mask:m}=n,h=x.useMemo(()=>{let e=L(l,s);return e==null?null:{location:{pathname:e,search:u,hash:d,state:f,key:p,mask:m},navigationType:r}},[s,l,u,d,f,p,r,m]);return T(h!=null,`<Router basename="${s}"> is not able to match the URL "${l}${u}${d}" because it does not start with the basename, so the <Router> won't render anything.`),h==null?null:x.createElement(R.Provider,{value:c},x.createElement(We.Provider,{children:t,value:h}))}function Ot({children:e,location:t}){return ot(V(e),t)}x.Component;function V(e,t=[]){let n=[];return x.Children.forEach(e,(e,r)=>{if(!x.isValidElement(e))return;let i=[...t,r];if(e.type===x.Fragment){n.push.apply(n,V(e.props.children,i));return}w(e.type===Dt,`[${typeof e.type==`string`?e.type:e.type.name}] is not a <Route> component. All component children of <Routes> must be a <Route> or <React.Fragment>`),w(!e.props.index||!e.props.children,`An index route cannot have child routes.`);let a={id:e.props.id||i.join(`-`),caseSensitive:e.props.caseSensitive,element:e.props.element,Component:e.props.Component,index:e.props.index,path:e.props.path,middleware:e.props.middleware,loader:e.props.loader,action:e.props.action,hydrateFallbackElement:e.props.hydrateFallbackElement,HydrateFallback:e.props.HydrateFallback,errorElement:e.props.errorElement,ErrorBoundary:e.props.ErrorBoundary,hasErrorBoundary:e.props.hasErrorBoundary===!0||e.props.ErrorBoundary!=null||e.props.errorElement!=null,shouldRevalidate:e.props.shouldRevalidate,handle:e.props.handle,lazy:e.props.lazy};e.props.children&&(a.children=V(e.props.children,i)),n.push(a)}),n}var kt=`get`,At=`application/x-www-form-urlencoded`;function jt(e){return typeof HTMLElement<`u`&&e instanceof HTMLElement}function Mt(e){return jt(e)&&e.tagName.toLowerCase()===`button`}function Nt(e){return jt(e)&&e.tagName.toLowerCase()===`form`}function Pt(e){return jt(e)&&e.tagName.toLowerCase()===`input`}function Ft(e){return!!(e.metaKey||e.altKey||e.ctrlKey||e.shiftKey)}function It(e,t){return e.button===0&&(!t||t===`_self`)&&!Ft(e)}var Lt=null;function Rt(){if(Lt===null)try{new FormData(document.createElement(`form`),0),Lt=!1}catch{Lt=!0}return Lt}var zt=new Set([`application/x-www-form-urlencoded`,`multipart/form-data`,`text/plain`]);function Bt(e){return e!=null&&!zt.has(e)?(T(!1,`"${e}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${At}"`),null):e}function Vt(e,t){let n,r,i,a,o;if(Nt(e)){let o=e.getAttribute(`action`);r=o?L(o,t):null,n=e.getAttribute(`method`)||kt,i=Bt(e.getAttribute(`enctype`))||At,a=new FormData(e)}else if(Mt(e)||Pt(e)&&(e.type===`submit`||e.type===`image`)){let o=e.form;if(o==null)throw Error(`Cannot submit a <button> or <input type="submit"> without a <form>`);let s=e.getAttribute(`formaction`)||o.getAttribute(`action`);if(r=s?L(s,t):null,n=e.getAttribute(`formmethod`)||o.getAttribute(`method`)||kt,i=Bt(e.getAttribute(`formenctype`))||Bt(o.getAttribute(`enctype`))||At,a=new FormData(o,e),!Rt()){let{name:t,type:n,value:r}=e;if(n===`image`){let e=t?`${t}.`:``;a.append(`${e}x`,`0`),a.append(`${e}y`,`0`)}else t&&a.append(t,r)}}else if(jt(e))throw Error(`Cannot submit element that is not <form>, <button>, or <input type="submit|image">`);else n=kt,r=null,i=At,o=e;return a&&i===`text/plain`&&(o=a,a=void 0),{action:r,method:n.toLowerCase(),encType:i,formData:a,body:o}}Object.getOwnPropertyNames(Object.prototype).sort().join(`\0`);var Ht={"&":`\\u0026`,">":`\\u003e`,"<":`\\u003c`,"\u2028":`\\u2028`,"\u2029":`\\u2029`},Ut=/[&><\u2028\u2029]/g;function Wt(e){return e.replace(Ut,e=>Ht[e])}function Gt(e,t){if(e===!1||e==null)throw Error(t)}function Kt(e,t,n,r){let i=typeof e==`string`?new URL(e,typeof window>`u`?`server://singlefetch/`:window.location.origin):e;return n?i.pathname.endsWith(`/`)?i.pathname=`${i.pathname}_.${r}`:i.pathname=`${i.pathname}.${r}`:i.pathname===`/`?i.pathname=`_root.${r}`:t&&L(i.pathname,t)===`/`?i.pathname=`${Ee(t)}/_root.${r}`:i.pathname=`${Ee(i.pathname)}.${r}`,i}async function qt(e,t){if(e.id in t)return t[e.id];try{let n=await b(()=>import(e.module),[]);return t[e.id]=n,n}catch(t){return console.error(`Error loading route module \`${e.module}\`, reloading page...`),console.error(t),window.__reactRouterContext&&window.__reactRouterContext.isSpaMode,window.location.reload(),new Promise(()=>{})}}function Jt(e){return e!=null&&typeof e.page==`string`}function Yt(e){return e==null?!1:e.href==null?e.rel===`preload`&&typeof e.imageSrcSet==`string`&&typeof e.imageSizes==`string`:typeof e.rel==`string`&&typeof e.href==`string`}async function Xt(e,t,n){return tn((await Promise.all(e.map(async e=>{let r=t.routes[e.route.id];if(r){let e=await qt(r,n);return e.links?e.links():[]}return[]}))).flat(1).filter(Yt).filter(e=>e.rel===`stylesheet`||e.rel===`preload`).map(e=>e.rel===`stylesheet`?{...e,rel:`prefetch`,as:`style`}:{...e,rel:`prefetch`}))}function Zt(e,t,n,r,i,a){let o=(e,t)=>n[t]?e.route.id!==n[t].route.id:!0,s=(e,t)=>n[t].pathname!==e.pathname||n[t].route.path?.endsWith(`*`)&&n[t].params[`*`]!==e.params[`*`];return a===`assets`?t.filter((e,t)=>o(e,t)||s(e,t)):a===`data`?t.filter((t,a)=>{let c=r.routes[t.route.id];if(!c||!c.hasLoader)return!1;if(o(t,a)||s(t,a))return!0;if(t.route.shouldRevalidate){let r=t.route.shouldRevalidate({currentUrl:new URL(i.pathname+i.search+i.hash,window.origin),currentParams:n[0]?.params||{},nextUrl:new URL(e,window.origin),nextParams:t.params,defaultShouldRevalidate:!0});if(typeof r==`boolean`)return r}return!0}):[]}function Qt(e,t,{includeHydrateFallback:n}={}){return $t(e.map(e=>{let r=t.routes[e.route.id];if(!r)return[];let i=[r.module];return r.clientActionModule&&(i=i.concat(r.clientActionModule)),r.clientLoaderModule&&(i=i.concat(r.clientLoaderModule)),n&&r.hydrateFallbackModule&&(i=i.concat(r.hydrateFallbackModule)),r.imports&&(i=i.concat(r.imports)),i}).flat(1))}function $t(e){return[...new Set(e)]}function en(e){let t={},n=Object.keys(e).sort();for(let r of n)t[r]=e[r];return t}function tn(e,t){let n=new Set,r=new Set(t);return e.reduce((e,i)=>{if(t&&!Jt(i)&&i.as===`script`&&i.href&&r.has(i.href))return e;let a=JSON.stringify(en(i));return n.has(a)||(n.add(a),e.push({key:a,link:i})),e},[])}function nn(){let e=x.useContext(Le);return Gt(e,`You must render this element inside a <DataRouterContext.Provider> element`),e}function rn(){let e=x.useContext(Re);return Gt(e,`You must render this element inside a <DataRouterStateContext.Provider> element`),e}var an=x.createContext(void 0);an.displayName=`FrameworkContext`;function on(){let e=x.useContext(an);return Gt(e,`You must render this element inside a <HydratedRouter> element`),e}function sn(e,t){let n=x.useContext(an),[r,i]=x.useState(!1),[a,o]=x.useState(!1),{onFocus:s,onBlur:c,onMouseEnter:l,onMouseLeave:u,onTouchStart:d}=t,f=x.useRef(null);x.useEffect(()=>{if(e===`render`&&o(!0),e===`viewport`){let e=new IntersectionObserver(e=>{e.forEach(e=>{o(e.isIntersecting)})},{threshold:.5});return f.current&&e.observe(f.current),()=>{e.disconnect()}}},[e]),x.useEffect(()=>{if(r){let e=setTimeout(()=>{o(!0)},100);return()=>{clearTimeout(e)}}},[r]);let p=()=>{i(!0)},m=()=>{i(!1),o(!1)};return n?e===`intent`?[a,f,{onFocus:cn(s,p),onBlur:cn(c,m),onMouseEnter:cn(l,p),onMouseLeave:cn(u,m),onTouchStart:cn(d,p)}]:[a,f,{}]:[!1,f,{}]}function cn(e,t){return n=>{e&&e(n),n.defaultPrevented||t(n)}}function ln({page:e,...t}){let n=Be(),{router:r}=nn(),i=x.useMemo(()=>re(r.routes,e,r.basename),[r.routes,e,r.basename]);return i?n?x.createElement(dn,{page:e,matches:i,...t}):x.createElement(fn,{page:e,matches:i,...t}):null}function un(e){let{manifest:t,routeModules:n}=on(),[r,i]=x.useState([]);return x.useEffect(()=>{let r=!1;return Xt(e,t,n).then(e=>{r||i(e)}),()=>{r=!0}},[e,t,n]),r}function dn({page:e,matches:t,...n}){let r=et(),{future:i}=on(),{basename:a}=nn(),o=x.useMemo(()=>{if(e===r.pathname+r.search+r.hash)return[];let n=Kt(e,a,i.unstable_trailingSlashAwareDataRequests,`rsc`),o=!1,s=[];for(let e of t)typeof e.route.shouldRevalidate==`function`?o=!0:s.push(e.route.id);return o&&s.length>0&&n.searchParams.set(`_routes`,s.join(`,`)),[n.pathname+n.search]},[a,i.unstable_trailingSlashAwareDataRequests,e,r,t]);return x.createElement(x.Fragment,null,o.map(e=>x.createElement(`link`,{key:e,rel:`prefetch`,as:`fetch`,href:e,...n})))}function fn({page:e,matches:t,...n}){let r=et(),{future:i,manifest:a,routeModules:o}=on(),{basename:s}=nn(),{loaderData:c,matches:l}=rn(),u=x.useMemo(()=>Zt(e,t,l,a,r,`data`),[e,t,l,a,r]),d=x.useMemo(()=>Zt(e,t,l,a,r,`assets`),[e,t,l,a,r]),f=x.useMemo(()=>{if(e===r.pathname+r.search+r.hash)return[];let n=new Set,l=!1;if(t.forEach(e=>{let t=a.routes[e.route.id];!t||!t.hasLoader||(!u.some(t=>t.route.id===e.route.id)&&e.route.id in c&&o[e.route.id]?.shouldRevalidate||t.hasClientLoader?l=!0:n.add(e.route.id))}),n.size===0)return[];let d=Kt(e,s,i.unstable_trailingSlashAwareDataRequests,`data`);return l&&n.size>0&&d.searchParams.set(`_routes`,t.filter(e=>n.has(e.route.id)).map(e=>e.route.id).join(`,`)),[d.pathname+d.search]},[s,i.unstable_trailingSlashAwareDataRequests,c,r,a,u,t,e,o]),p=x.useMemo(()=>Qt(d,a),[d,a]),m=un(d);return x.createElement(x.Fragment,null,f.map(e=>x.createElement(`link`,{key:e,rel:`prefetch`,as:`fetch`,href:e,...n})),p.map(e=>x.createElement(`link`,{key:e,rel:`modulepreload`,href:e,...n})),m.map(({key:e,link:t})=>x.createElement(`link`,{key:e,nonce:n.nonce,...t,crossOrigin:t.crossOrigin??n.crossOrigin})))}function H(...e){return t=>{e.forEach(e=>{typeof e==`function`?e(t):e!=null&&(e.current=t)})}}x.Component;var pn=typeof window<`u`&&window.document!==void 0&&window.document.createElement!==void 0;try{pn&&(window.__reactRouterVersion=`7.15.1`)}catch{}function mn({basename:e,children:t,useTransitions:n,window:r}){let i=x.useRef();i.current??=C({window:r,v5Compat:!0});let a=i.current,[o,s]=x.useState({action:a.action,location:a.location}),c=x.useCallback(e=>{n===!1?s(e):x.startTransition(()=>s(e))},[n]);return x.useLayoutEffect(()=>a.listen(c),[a,c]),x.createElement(B,{basename:e,children:t,location:o.location,navigationType:o.action,navigator:a,useTransitions:n})}function hn({basename:e,children:t,history:n,useTransitions:r}){let[i,a]=x.useState({action:n.action,location:n.location}),o=x.useCallback(e=>{r===!1?a(e):x.startTransition(()=>a(e))},[r]);return x.useLayoutEffect(()=>n.listen(o),[n,o]),x.createElement(B,{basename:e,children:t,location:i.location,navigationType:i.action,navigator:n,useTransitions:r})}hn.displayName=`unstable_HistoryRouter`;var gn=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,_n=x.forwardRef(function({onClick:e,discover:t=`render`,prefetch:n=`none`,relative:r,reloadDocument:i,replace:a,mask:o,state:s,target:c,to:l,preventScrollReset:u,viewTransition:d,defaultShouldRevalidate:f,...p},m){let{basename:h,navigator:g,useTransitions:_}=x.useContext(R),v=typeof l==`string`&&gn.test(l),y=Pe(l,h);l=y.to;let b=Qe(l,{relative:r}),ee=et(),S=null;if(o){let e=Ce(o,[],ee.mask?ee.mask.pathname:`/`,!0);h!==`/`&&(e.pathname=e.pathname===`/`?h:Te([h,e.pathname])),S=g.createHref(e)}let[C,w,T]=sn(n,p),E=wn(l,{replace:a,mask:o,state:s,target:c,preventScrollReset:u,relative:r,viewTransition:d,defaultShouldRevalidate:f,useTransitions:_});function D(t){e&&e(t),t.defaultPrevented||E(t)}let O=!(y.isExternal||i),k=x.createElement(`a`,{...p,...T,href:(O?S:void 0)||y.absoluteURL||b,onClick:O?D:e,ref:H(m,w),target:c,"data-discover":!v&&t===`render`?`true`:void 0});return C&&!v?x.createElement(x.Fragment,null,k,x.createElement(ln,{page:b})):k});_n.displayName=`Link`;var vn=x.forwardRef(function({"aria-current":e=`page`,caseSensitive:t=!1,className:n=``,end:r=!1,style:i,to:a,viewTransition:o,children:s,...c},l){let u=at(a,{relative:c.relative}),d=et(),f=x.useContext(Re),{navigator:p,basename:m}=x.useContext(R),h=f!=null&&Pn(u)&&o===!0,g=p.encodeLocation?p.encodeLocation(u).pathname:u.pathname,_=d.pathname,v=f&&f.navigation&&f.navigation.location?f.navigation.location.pathname:null;t||(_=_.toLowerCase(),v=v?v.toLowerCase():null,g=g.toLowerCase()),v&&m&&(v=L(v,m)||v);let y=g!==`/`&&g.endsWith(`/`)?g.length-1:g.length,b=_===g||!r&&_.startsWith(g)&&_.charAt(y)===`/`,ee=v!=null&&(v===g||!r&&v.startsWith(g)&&v.charAt(g.length)===`/`),S={isActive:b,isPending:ee,isTransitioning:h},C=b?e:void 0,w;w=typeof n==`function`?n(S):[n,b?`active`:null,ee?`pending`:null,h?`transitioning`:null].filter(Boolean).join(` `);let T=typeof i==`function`?i(S):i;return x.createElement(_n,{...c,"aria-current":C,className:w,ref:l,style:T,to:a,viewTransition:o},typeof s==`function`?s(S):s)});vn.displayName=`NavLink`;var yn=x.forwardRef(({discover:e=`render`,fetcherKey:t,navigate:n,reloadDocument:r,replace:i,state:a,method:o=kt,action:s,onSubmit:c,relative:l,preventScrollReset:u,viewTransition:d,defaultShouldRevalidate:f,...p},m)=>{let{useTransitions:h}=x.useContext(R),g=Dn(),_=On(s,{relative:l}),v=o.toLowerCase()===`get`?`get`:`post`,y=typeof s==`string`&&gn.test(s);return x.createElement(`form`,{ref:m,method:v,action:_,onSubmit:r?c:e=>{if(c&&c(e),e.defaultPrevented)return;e.preventDefault();let r=e.nativeEvent.submitter,s=r?.getAttribute(`formmethod`)||o,p=()=>g(r||e.currentTarget,{fetcherKey:t,method:s,navigate:n,replace:i,state:a,relative:l,preventScrollReset:u,viewTransition:d,defaultShouldRevalidate:f});h&&n!==!1?x.startTransition(()=>p()):p()},...p,"data-discover":!y&&e===`render`?`true`:void 0})});yn.displayName=`Form`;function bn({getKey:e,storageKey:t,...n}){let r=x.useContext(an),{basename:i}=x.useContext(R),a=et(),o=xt();Mn({getKey:e,storageKey:t});let s=x.useMemo(()=>{if(!r||!e)return null;let t=jn(a,o,i,e);return t===a.key?null:t},[]);if(!r||r.isSpaMode)return null;let c=((e,t)=>{if(!window.history.state||!window.history.state.key){let e=Math.random().toString(32).slice(2);window.history.replaceState({key:e},``)}try{let n=JSON.parse(sessionStorage.getItem(e)||`{}`)[t||window.history.state.key];typeof n==`number`&&window.scrollTo(0,n)}catch(t){console.error(t),sessionStorage.removeItem(e)}}).toString();return x.createElement(`script`,{...n,suppressHydrationWarning:!0,dangerouslySetInnerHTML:{__html:`(${c})(${Wt(JSON.stringify(t||kn))}, ${Wt(JSON.stringify(s))})`}})}bn.displayName=`ScrollRestoration`;function xn(e){return`${e} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function Sn(e){let t=x.useContext(Le);return w(t,xn(e)),t}function Cn(e){let t=x.useContext(Re);return w(t,xn(e)),t}function wn(e,{target:t,replace:n,mask:r,state:i,preventScrollReset:a,relative:o,viewTransition:s,defaultShouldRevalidate:c,useTransitions:l}={}){let u=rt(),d=et(),f=at(e,{relative:o});return x.useCallback(p=>{if(It(p,t)){p.preventDefault();let t=n===void 0?k(d)===k(f):n,m=()=>u(e,{replace:t,mask:r,state:i,preventScrollReset:a,relative:o,viewTransition:s,defaultShouldRevalidate:c});l?x.startTransition(()=>m()):m()}},[d,u,f,n,r,i,t,e,a,o,s,c,l])}var Tn=0,En=()=>`__${String(++Tn)}__`;function Dn(){let{router:e}=Sn(`useSubmit`),{basename:t}=x.useContext(R),n=yt(),r=e.fetch,i=e.navigate;return x.useCallback(async(e,a={})=>{let{action:o,method:s,encType:c,formData:l,body:u}=Vt(e,t);a.navigate===!1?await r(a.fetcherKey||En(),n,a.action||o,{defaultShouldRevalidate:a.defaultShouldRevalidate,preventScrollReset:a.preventScrollReset,formData:l,body:u,formMethod:a.method||s,formEncType:a.encType||c,flushSync:a.flushSync}):await i(a.action||o,{defaultShouldRevalidate:a.defaultShouldRevalidate,preventScrollReset:a.preventScrollReset,formData:l,body:u,formMethod:a.method||s,formEncType:a.encType||c,replace:a.replace,state:a.state,fromRouteId:n,flushSync:a.flushSync,viewTransition:a.viewTransition})},[r,i,t,n])}function On(e,{relative:t}={}){let{basename:n}=x.useContext(R),r=x.useContext(Ge);w(r,`useFormAction must be used inside a RouteContext`);let[i]=r.matches.slice(-1),a={...at(e||`.`,{relative:t})},o=et();if(e==null){a.search=o.search;let e=new URLSearchParams(a.search),t=e.getAll(`index`);if(t.some(e=>e===``)){e.delete(`index`),t.filter(e=>e).forEach(t=>e.append(`index`,t));let n=e.toString();a.search=n?`?${n}`:``}}return(!e||e===`.`)&&i.route.index&&(a.search=a.search?a.search.replace(/^\?/,`?index&`):`?index`),n!==`/`&&(a.pathname=a.pathname===`/`?n:Te([n,a.pathname])),k(a)}var kn=`react-router-scroll-positions`,An={};function jn(e,t,n,r){let i=null;return r&&(i=r(n===`/`?e:{...e,pathname:L(e.pathname,n)||e.pathname},t)),i??=e.key,i}function Mn({getKey:e,storageKey:t}={}){let{router:n}=Sn(`useScrollRestoration`),{restoreScrollPosition:r,preventScrollReset:i}=Cn(`useScrollRestoration`),{basename:a}=x.useContext(R),o=et(),s=xt(),c=bt();x.useEffect(()=>(window.history.scrollRestoration=`manual`,()=>{window.history.scrollRestoration=`auto`}),[]),Nn(x.useCallback(()=>{if(c.state===`idle`){let t=jn(o,s,a,e);An[t]=window.scrollY}try{sessionStorage.setItem(t||kn,JSON.stringify(An))}catch(e){T(!1,`Failed to save scroll positions in sessionStorage, <ScrollRestoration /> will not work properly (${e}).`)}window.history.scrollRestoration=`auto`},[c.state,e,a,o,s,t])),typeof document<`u`&&(x.useLayoutEffect(()=>{try{let e=sessionStorage.getItem(t||kn);e&&(An=JSON.parse(e))}catch{}},[t]),x.useLayoutEffect(()=>{let t=n?.enableScrollRestoration(An,()=>window.scrollY,e?(t,n)=>jn(t,n,a,e):void 0);return()=>t&&t()},[n,a,e]),x.useLayoutEffect(()=>{if(r!==!1){if(typeof r==`number`){window.scrollTo(0,r);return}try{if(o.hash){let e=document.getElementById(decodeURIComponent(o.hash.slice(1)));if(e){e.scrollIntoView();return}}}catch{T(!1,`"${o.hash.slice(1)}" is not a decodable element ID. The view will not scroll to it.`)}i!==!0&&window.scrollTo(0,0)}},[o,r,i]))}function Nn(e,t){let{capture:n}=t||{};x.useEffect(()=>{let t=n==null?void 0:{capture:n};return window.addEventListener(`pagehide`,e,t),()=>{window.removeEventListener(`pagehide`,e,t)}},[e,n])}function Pn(e,{relative:t}={}){let n=x.useContext(Ve);w(n!=null,"`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?");let{basename:r}=Sn(`useViewTransitionState`),i=at(e,{relative:t});if(!n.isTransitioning)return!1;let a=L(n.currentLocation.pathname,r)||n.currentLocation.pathname,o=L(n.nextLocation.pathname,r)||n.nextLocation.pathname;return me(i.pathname,o)!=null||me(i.pathname,a)!=null}var Fn=o((e=>{var t=Symbol.for(`react.transitional.element`),n=Symbol.for(`react.fragment`);function r(e,n,r){var i=null;if(r!==void 0&&(i=``+r),n.key!==void 0&&(i=``+n.key),`key`in n)for(var a in r={},n)a!==`key`&&(r[a]=n[a]);else r=n;return n=r.ref,{$$typeof:t,type:e,key:i,ref:n===void 0?null:n,props:r}}e.Fragment=n,e.jsx=r,e.jsxs=r})),In=o(((e,t)=>{t.exports=Fn()})),Ln=g(),U=In(),Rn=window.__ENV__?.API_BASE?.trim()||void 0,zn=`http://localhost:5174`,Bn=typeof window<`u`&&window.location?.origin?[`localhost`,`127.0.0.1`,`0.0.0.0`].includes(window.location.hostname)?zn:window.location.origin:void 0,Vn=Rn||Bn||zn;async function W(e,t){let n=await fetch(Vn+e,t);if(!n.ok)throw Error(await n.text());return n.json()}var Hn=Vn.replace(/^http/,`ws`)+`/ws`,Un=(0,x.createContext)(null);function Wn(){let e=(0,x.useContext)(Un);if(!e)throw Error(`useAuth must be used within AuthProvider`);return e}function Gn({children:e}){let[t,n]=(0,x.useState)(localStorage.getItem(`sessionToken`)||``),[r,i]=(0,x.useState)(!1),[a,o]=(0,x.useState)(!1),[s,c]=(0,x.useState)(`user`),[l,u]=(0,x.useState)({username:``,displayName:``,picture:``}),d=s===`admin`,f=e=>{u(t=>({...t,...e}))},p=()=>{u({username:``,displayName:``,picture:``})};return(0,U.jsx)(Un.Provider,{value:{isLoggedIn:r,sessionToken:t,setSessionToken:n,setIsLoggedIn:i,isDefaultPassword:a,setIsDefaultPassword:o,role:s,setRole:c,isAdmin:d,profile:l,setProfile:f,clearProfile:p,handleLogout:async()=>{try{await W(`/api/auth/logout`,{method:`POST`,headers:{"x-session-token":t}})}catch(e){console.error(`Logout error:`,e)}finally{n(``),localStorage.removeItem(`sessionToken`),i(!1),o(!1),c(`user`),p()}}},children:e})}function G(e){if(!e)return null;for(let t of[/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,/^([a-zA-Z0-9_-]{11})$/]){let n=e.match(t);if(n&&n[1])return n[1]}return null}function Kn(e){return e!=null&&!isNaN(e)&&isFinite(e)&&e>0}var qn=100,Jn={visible:!0,height:90,qrSize:60,customMessage:``,showRoller:!0,showQrCode:!0,hideSingerQueue:!1};function Yn(e,t){if(typeof e==`boolean`)return e;if(typeof e==`string`){if(e.toLowerCase()===`true`)return!0;if(e.toLowerCase()===`false`)return!1}return t}function Xn(e){if(!e||typeof e!=`object`)return Jn;let t=e;return{visible:Yn(t.visible,Jn.visible),height:typeof t.height==`number`?t.height:Jn.height,qrSize:typeof t.qrSize==`number`?t.qrSize:Jn.qrSize,customMessage:typeof t.customMessage==`string`?t.customMessage:Jn.customMessage,showRoller:Yn(t.showRoller,Jn.showRoller),showQrCode:Yn(t.showQrCode,Jn.showQrCode),hideSingerQueue:Yn(t.hideSingerQueue,Jn.hideSingerQueue)}}function Zn(){let[e,t]=(0,x.useState)([]),[n,r]=(0,x.useState)(null),[i,a]=(0,x.useState)(!1),[o,s]=(0,x.useState)(!1),[c,l]=(0,x.useState)(!1),[u,d]=(0,x.useState)(!1),[f,p]=(0,x.useState)(!1),[m,h]=(0,x.useState)(null),[g,_]=(0,x.useState)(Jn),[v,y]=(0,x.useState)(!1),[b,ee]=(0,x.useState)(5),[S,C]=(0,x.useState)(null),[w,T]=(0,x.useState)(!1),[E,D]=(0,x.useState)({paused:!1,crossfadeSeconds:3,volumePercent:100,elapsedSec:0,currentTrack:null}),O=(0,x.useRef)(null),k=(0,x.useRef)(null),A=(0,x.useRef)(null),te=(0,x.useRef)(null),ne=(0,x.useRef)(null),re=(0,x.useRef)(null),j=(0,x.useRef)(null),M=(0,x.useRef)(null),N=(0,x.useRef)(null),ie=(0,x.useRef)(null),ae=(0,x.useRef)(null),oe=(0,x.useRef)(null),se=(0,x.useRef)(!1),ce=(0,x.useRef)(null),P=(0,x.useRef)(``),F=g.hideSingerQueue;(0,x.useEffect)(()=>{let e=document.body.style.background,t=document.body.style.color,n=document.documentElement.style.colorScheme;document.documentElement.style.colorScheme=`dark`,document.body.style.background=`#000`,document.body.style.color=`#e5e7eb`,document.body.style.margin=`0`,document.body.style.overflow=`hidden`;let r=Array.from(document.querySelectorAll(`nav, header, .top-shortcuts`));if(r.forEach(e=>e.style.display=`none`),!window.YT){let e=document.createElement(`script`);e.src=`https://www.youtube.com/iframe_api`;let t=document.getElementsByTagName(`script`)[0];t.parentNode?.insertBefore(e,t)}return()=>{document.documentElement.style.colorScheme=n,document.body.style.background=e,document.body.style.color=t,document.body.style.margin=``,document.body.style.overflow=``,r.forEach(e=>e.style.display=``)}},[]);let le=()=>{s(!0),re.current&&clearTimeout(re.current),re.current=setTimeout(()=>{s(!1)},3e3)};(0,x.useEffect)(()=>()=>{re.current&&clearTimeout(re.current),ae.current&&clearInterval(ae.current),oe.current&&clearInterval(oe.current)},[]),(0,x.useEffect)(()=>{let e=()=>{a(!!document.fullscreenElement)};return document.addEventListener(`fullscreenchange`,e),document.addEventListener(`webkitfullscreenchange`,e),()=>{document.removeEventListener(`fullscreenchange`,e),document.removeEventListener(`webkitfullscreenchange`,e)}},[]);let I=async()=>{document.fullscreenElement?await document.exitFullscreen():await te.current?.requestFullscreen()},ue=async()=>{let e=O.current;if(e)try{await e.play(),l(!1),d(!0)}catch(e){console.error(`Play failed:`,e)}};async function de(){let e=await W(`/api/queue`);t(e);let n=e.find(e=>e.status===`playing`)||null;r(e=>!e&&!n?null:!e&&n?n:e&&!n?null:e&&n&&String(e.id)!==String(n.id)?n:e)}async function fe(){try{let e=await W(`/api/break-music/state`);D({paused:!!e.paused,crossfadeSeconds:typeof e.crossfadeSeconds==`number`?e.crossfadeSeconds:3,volumePercent:typeof e.volumePercent==`number`?Math.max(0,Math.min(100,Math.round(e.volumePercent))):100,elapsedSec:typeof e.elapsedSec==`number`?e.elapsedSec:0,currentTrack:e.currentTrack||null})}catch{}}(0,x.useEffect)(()=>{de(),fe(),W(`/api/player/state`).then(e=>{T(e.manualStop)}).catch(()=>{})},[]),(0,x.useEffect)(()=>{W(`/api/overlay/settings`).then(e=>{_(Xn(e))}).catch(()=>{})},[]),(0,x.useEffect)(()=>{W(`/api/autoplay/settings`).then(e=>{y(e.enabled),ee(t=>t===e.delay?t:e.delay)}).catch(()=>{})},[]),(0,x.useEffect)(()=>{function e(){try{ne.current=new WebSocket(Hn),ne.current.onmessage=e=>{try{let t=JSON.parse(e.data);(t.type===`library.scanned`||t.type===`queue.updated`||t.type===`player.updated`||t.type===`player.play`||t.type===`player.next`||t.type===`player.stop`)&&(de(),t.type===`player.stop`?T(!0):(t.type===`player.play`||t.type===`player.next`)&&T(!1)),t.type===`break_music.updated`&&fe(),t.type===`overlay.settings`&&_(Xn(t)),t.type===`autoplay.settings`&&(typeof t.enabled==`boolean`&&y(t.enabled),typeof t.delay==`number`&&ee(e=>e===t.delay?e:t.delay))}catch{}},ne.current.onclose=()=>{console.log(`WebSocket closed, reconnecting...`),ne.current=null,ie.current&&=(clearInterval(ie.current),null),setTimeout(e,1e3)},ne.current.onerror=e=>{console.error(`WebSocket error:`,e)},ne.current.onopen=()=>{console.log(`WebSocket connected`),W(`/api/player/state`).then(e=>{T(e.manualStop)}).catch(()=>{}),ie.current=setInterval(()=>{ne.current&&ne.current.readyState===WebSocket.OPEN&&ne.current.send(JSON.stringify({type:`heartbeat`}))},45e3)}}catch{setTimeout(e,1500)}}return e(),()=>{ie.current&&clearInterval(ie.current),ne.current?.close()}},[]),(0,x.useEffect)(()=>{if(!n){if(p(!1),h(null),j.current){try{j.current.destroy()}catch(e){console.warn(`Failed to destroy YouTube player:`,e)}j.current=null}M.current&&=(clearInterval(M.current),null);return}if(n.external_url){let e=G(n.external_url);e?(p(!0),h(e)):(p(!1),h(null))}else p(!1),h(null)},[n?.id,n?.external_url]);let pe=(0,x.useMemo)(()=>{if(!n)return``;let e=n.key_adjustment??0;if(n.external_url)return G(n.external_url)?``:n.external_url;if(n.kind===`mp4`&&n.file_mp4){let t=new URLSearchParams;return t.set(`path`,n.file_mp4),e&&t.set(`pitch`,String(e)),`${Vn}/media/mp4stream?${t.toString()}`}if(n.kind===`cdgmp3`&&n.file_cdg&&n.file_mp3){let t=n.file_cdg.startsWith(`zip://`)||n.file_mp3.startsWith(`zip://`),r=new URLSearchParams;if(t){let e=n.file_cdg.replace(`zip://`,``),t=n.file_mp3.replace(`zip://`,``),i=`.zip#`,a=e.indexOf(i),o=t.indexOf(i),s=a>=0?e.substring(0,a+4):e,c=a>=0?e.substring(a+5):``,l=o>=0?t.substring(o+5):``;r.set(`file`,s),r.set(`cdg`,c||``),r.set(`mp3`,l||``)}else r.set(`cdg`,n.file_cdg),r.set(`mp3`,n.file_mp3);return e&&r.set(`pitch`,String(e)),`${Vn}/media/cdgmp4?${r.toString()}`}return``},[n?.id,n?.external_url,n?.kind,n?.file_mp4,n?.file_cdg,n?.file_mp3,n?.key_adjustment]);(0,x.useEffect)(()=>{if(l(!1),d(!1),f&&m){d(!0);return}let e=O.current;!e||!pe||(e.src=pe,e.load(),(async()=>{try{e.muted=!0,await e.play(),d(!0),await new Promise(e=>setTimeout(e,qn)),e.muted=!1}catch{e.muted=!1,l(!0)}})())},[pe,f,m]);let me=(0,x.useCallback)((e,t,n)=>{Kn(t)&&W(`/api/player/timing`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({currentTime:e,duration:t,queueId:n})}).catch(e=>{console.error(`Failed to send timing update:`,e)})},[]),he=(0,x.useCallback)((e,t,n)=>{let r=k.current;if(!r)return;oe.current&&=(clearInterval(oe.current),null);let i=r.volume,a=Math.max(0,Math.min(1,e));if(t<=0){r.volume=a,n?.();return}let o=Math.max(1,Math.floor(t*1e3/100)),s=0;oe.current=setInterval(()=>{s+=1;let e=Math.min(1,s/o);r.volume=i+(a-i)*e,e>=1&&(oe.current&&=(clearInterval(oe.current),null),n?.())},100)},[]);(0,x.useEffect)(()=>{let e=O.current;if(!e||!n)return;let t=()=>d(!0),r=()=>d(!1),i=()=>{d(!1);let t,r=n.key_adjustment!==void 0&&n.key_adjustment!==0;(n.kind===`cdgmp3`||r)&&n.duration_ms&&n.duration_ms>0?t=n.duration_ms/1e3:(t=e.duration,Kn(t)||n.duration_ms&&(t=n.duration_ms/1e3)),Kn(t)?(console.log(`Video ended, sending final timing update:`,t),me(t,t,n.id)):(console.warn(`Video ended but no valid duration available; sending sentinel timing update`),me(1,1,n.id))};return e.addEventListener(`play`,t),e.addEventListener(`pause`,r),e.addEventListener(`ended`,i),()=>{e.removeEventListener(`play`,t),e.removeEventListener(`pause`,r),e.removeEventListener(`ended`,i)}},[n,me]),(0,x.useEffect)(()=>{if(!n||f)return;let e=O.current;if(!e)return;let t=setInterval(()=>{let t=e.currentTime||0,r,i=n.key_adjustment!==void 0&&n.key_adjustment!==0;(n.kind===`cdgmp3`||i)&&n.duration_ms&&n.duration_ms>0?r=n.duration_ms/1e3:(r=e.duration,Kn(r)||n.duration_ms&&n.duration_ms>0&&(r=n.duration_ms/1e3)),Kn(r)?me(t,r,n.id):console.warn(`Cannot send timing update for song ${n.id}: duration not available (video.duration=${e.duration}, db.duration_ms=${n.duration_ms})`)},1e3);return()=>clearInterval(t)},[n,f,me]),(0,x.useEffect)(()=>{if(!n||!f||!m)return;let e=`youtube-player-`+m,t=()=>{let r=window.YT;if(!r||!r.Player){setTimeout(t,100);return}M.current&&clearInterval(M.current);try{j.current=new r.Player(e,{events:{onReady:e=>{console.log(`YouTube player ready`);try{e.target.unMute(),e.target.setVolume(100),console.log(`YouTube player unmuted`)}catch(e){console.error(`Error unmuting YouTube player:`,e)}M.current=setInterval(()=>{try{let t=e.target.getCurrentTime(),r=e.target.getDuration();r&&t!==void 0&&me(t,r,n.id)}catch(e){console.error(`Error getting YouTube timing:`,e)}},1e3)},onStateChange:e=>{if(e.data===1)try{e.target.isMuted()&&(e.target.unMute(),e.target.setVolume(100),console.log(`YouTube player unmuted on play`))}catch(e){console.error(`Error unmuting YouTube player on play:`,e)}if(e.data===0){console.log(`YouTube video ended, sending final timing update`);try{let t=e.target.getDuration();Kn(t)?me(t,t,n.id):(console.warn(`YouTube ended but no valid duration; sending sentinel timing update`),me(1,1,n.id))}catch(e){console.error(`Error sending final YouTube timing:`,e),me(1,1,n.id)}}},onError:e=>{console.error(`YouTube player error:`,e.data)}}})}catch(e){console.error(`Failed to initialize YouTube player:`,e)}};return setTimeout(t,500),()=>{if(M.current&&clearInterval(M.current),j.current){try{j.current.destroy()}catch(e){console.warn(`Failed to destroy YouTube player in cleanup:`,e)}j.current=null}}},[n,f,m,me]),(0,x.useEffect)(()=>{let e=k.current;if(!e)return;let t=E.currentTrack,r=!n&&!E.paused&&!!t?.file_path,i=Math.max(0,E.crossfadeSeconds||0),a=Math.max(0,Math.min(1,(E.volumePercent??100)/100)),o=t?.id??null;if(!r){se.current=!1,ce.current=o,P.current=``;let t=o;he(0,i,()=>{!se.current&&ce.current===t&&e.pause()});return}let s=`${Vn}/media/file?path=${encodeURIComponent(t.file_path)}`,c=e.getAttribute(`src`)||``,l=P.current!==s||c!==s;l&&(e.src=s,e.load(),P.current=s),E.elapsedSec>0&&(l||Math.abs((e.currentTime||0)-E.elapsedSec)>2)&&(e.currentTime=E.elapsedSec),se.current=!0,ce.current=o,(async()=>{try{l||e.paused||!se.current||ce.current!==o?(e.volume=0,e.muted=!0,await e.play(),e.muted=!1,he(a,i)):Math.abs(e.volume-a)>.01&&he(a,Math.min(1,i||.5))}catch{e.muted=!1}})()},[n,E.paused,E.crossfadeSeconds,E.volumePercent,E.elapsedSec,E.currentTrack?.id,E.currentTrack?.file_path,he]),(0,x.useEffect)(()=>{let e=k.current,t=E.currentTrack?.id;if(!(!e||!t||E.paused)&&!n)return ae.current&&=(clearInterval(ae.current),null),ae.current=setInterval(()=>{if(!k.current)return;let e=k.current.currentTime||0;W(`/api/break-music/timing`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({trackId:t,currentTime:e})}).catch(()=>{})},1e3),()=>{ae.current&&=(clearInterval(ae.current),null)}},[E.currentTrack?.id,E.paused,n]),(0,x.useEffect)(()=>{let e=k.current;if(!e)return;let t=()=>{W(`/api/break-music/auto-next`,{method:`POST`}).catch(()=>{})};return e.addEventListener(`ended`,t),()=>e.removeEventListener(`ended`,t)},[n]);let ge=e.filter(e=>e.status===`queued`).sort((t,n)=>e.indexOf(t)-e.indexOf(n)),L=(0,x.useMemo)(()=>ge.length,[e]);(0,x.useEffect)(()=>(N.current&&=(clearInterval(N.current),null),!n&&v&&L>0&&!w?(C(b),N.current=setInterval(()=>{C(e=>e===null||e<=0?0:e-1)},1e3)):C(null),()=>{N.current&&clearInterval(N.current)}),[n,v,L,b,w]);let _e=(0,x.useMemo)(()=>{if(!n){if(ge.length===0)return g.customMessage?`🎵 Waiting for singers... Add your song from the request page! 📢 ${g.customMessage}     🎵     🎵 Waiting for singers... Add your song from the request page! 📢 ${g.customMessage}     🎵     `:`🎵 Waiting for singers... Add your song from the request page! 🎵     🎵 Waiting for singers... Add your song from the request page! 🎵     `;let e=ge.slice(0,5).map((e,t)=>{let n=e.requested_by||`Anonymous`;return`${t+1}. ${n}`}).join(` • `),t=v&&S!==null&&!w?`⏱️ Starting in ${S}s... `:``,n=g.customMessage?`${t}🎤 QUEUE: ${e} 📢 ${g.customMessage}`:`${t}🎤 QUEUE: ${e}`;return`${n}     🎵     ${n}     🎵     `}let e=F?n.requested_by?`🎤 NOW SINGING: ${n.requested_by}`:`🎤 NOW PLAYING`:n.requested_by?`🎤 NOW SINGING: ${n.requested_by} — ${n.artist||`Unknown`} — ${n.title||`Unknown`}`:`🎤 NOW PLAYING: ${n.artist||`Unknown`} — ${n.title||`Unknown`}`,t=ge.slice(0,5).map((e,t)=>{let n=e.requested_by||`Anonymous`;return`${t+1}. ${n}`}).join(` • `),r=t?`${e} ⭐ UP NEXT: ${t}`:e;return g.customMessage&&(r+=` 📢 ${g.customMessage}`),`${r}     🎵     ${r}     🎵     `},[n,ge,g.customMessage,F,v,S,w]),ve=()=>{if(!g.visible)return null;let e=g.height/90,t=Math.round(40*e),n=Math.round(16*e),r=Math.round(15*e),a=Math.round(15*e),s=Math.round(5*e),c=Math.round(8*e),l=g.qrSize;return(0,U.jsxs)(`div`,{className:`controls-overlay`,style:{position:`absolute`,bottom:0,left:0,right:0,height:`${g.height}px`,background:`transparent`,zIndex:10,display:`flex`,alignItems:`flex-end`,padding:`${r}px`,gap:`${a}px`,opacity:1},children:[g.showQrCode&&(0,U.jsx)(`div`,{style:{width:`${l}px`,height:`${l}px`,background:`white`,borderRadius:`${c}px`,padding:`${s}px`,flexShrink:0,boxShadow:`0 2px 8px rgba(0,0,0,0.3)`},children:(0,U.jsx)(`img`,{src:`${Vn}/api/qr`,alt:`QR`,style:{width:`100%`,height:`100%`,imageRendering:`crisp-edges`},onError:e=>{let t=e.currentTarget;t.style.display=`none`}})}),g.showRoller&&(0,U.jsx)(`div`,{style:{flex:1,height:`${t}px`,overflow:`hidden`,position:`relative`,backgroundColor:`transparent`,borderRadius:`${c}px`,display:`flex`,alignItems:`center`,paddingLeft:`${r}px`,paddingRight:`${r}px`},children:(0,U.jsx)(`div`,{className:`ticker-text`,style:{fontSize:`${n}px`,fontWeight:600,color:`#fff`,textShadow:`2px 2px 4px rgba(0,0,0,0.9)`,letterSpacing:`0.5px`},children:_e})}),o&&(0,U.jsx)(`button`,{onClick:I,style:{flexShrink:0,padding:`${Math.round(10*e)}px ${Math.round(20*e)}px`,background:`rgba(255,255,255,0.15)`,border:`1px solid rgba(255,255,255,0.3)`,borderRadius:`${c}px`,color:`white`,cursor:`pointer`,fontSize:`${Math.round(14*e)}px`,fontWeight:500,transition:`all 0.3s ease`},onMouseEnter:e=>{e.currentTarget.style.background=`rgba(255,255,255,0.25)`,e.currentTarget.style.transform=`scale(1.05)`},onMouseLeave:e=>{e.currentTarget.style.background=`rgba(255,255,255,0.15)`,e.currentTarget.style.transform=`scale(1)`},children:i?`⊗ Exit Fullscreen`:`⛶ Fullscreen`})]})};return n?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`style`,{children:`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        
        .ticker-text {
          display: inline-block;
          white-space: nowrap;
          animation: ticker-scroll 30s linear infinite;
        }
        
        .controls-overlay {
          transition: opacity 0.3s ease-in-out;
        }
        
        .play-button-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 100;
          background: rgba(0,0,0,0.7);
          border-radius: 50%;
          width: 100px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
        }
        
        .play-button-overlay:hover {
          transform: translate(-50%, -50%) scale(1.1);
          background: rgba(0,0,0,0.8);
        }
        
        .play-icon {
          width: 0;
          height: 0;
          border-left: 40px solid white;
          border-top: 25px solid transparent;
          border-bottom: 25px solid transparent;
          margin-left: 10px;
        }
      `}),(0,U.jsxs)(`div`,{ref:te,onMouseMove:le,onMouseEnter:()=>s(!0),style:{position:`relative`,height:`100vh`,width:`100vw`,background:`#000`,color:`#e5e7eb`,overflow:`hidden`,cursor:o?`default`:`none`},children:[(0,U.jsx)(`audio`,{ref:k,preload:`auto`,style:{display:`none`}}),f&&m?(0,U.jsx)(`iframe`,{id:`youtube-player-${m}`,ref:A,src:`https://www.youtube.com/embed/${m}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&fs=1&playsinline=1&enablejsapi=1`,allow:`accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share`,allowFullScreen:!0,style:{position:`absolute`,top:0,left:0,width:`100%`,height:`100%`,border:`none`,zIndex:1}}):(0,U.jsx)(`video`,{ref:O,autoPlay:!0,playsInline:!0,style:{position:`absolute`,top:0,left:0,width:`100%`,height:`100%`,objectFit:`contain`,zIndex:1}}),!f&&c&&!u&&(0,U.jsx)(`div`,{className:`play-button-overlay`,onClick:ue,children:(0,U.jsx)(`div`,{className:`play-icon`})}),ve()]})]}):(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`style`,{children:`
          @keyframes ticker-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          
          .ticker-text {
            display: inline-block;
            white-space: nowrap;
            animation: ticker-scroll 30s linear infinite;
          }
          
          .controls-overlay {
            transition: opacity 0.3s ease-in-out;
          }
        `}),(0,U.jsxs)(`div`,{ref:te,onMouseMove:le,onMouseEnter:()=>s(!0),style:{position:`relative`,height:`100vh`,width:`100vw`,background:`#000`,color:`#e5e7eb`,display:`grid`,placeItems:`center`,fontFamily:`system-ui, -apple-system, sans-serif`,cursor:o?`default`:`none`},children:[(0,U.jsx)(`audio`,{ref:k,preload:`auto`,style:{display:`none`}}),ge.length>0?(0,U.jsxs)(`div`,{style:{textAlign:`center`,padding:`20px`,display:`flex`,flexDirection:`column`,alignItems:`center`,gap:`24px`,animation:`fadeInUp 0.6s ease`},children:[v&&S!==null&&!w&&(0,U.jsxs)(`div`,{style:{fontSize:`clamp(24px, 4vw, 40px)`,background:`linear-gradient(135deg, #10b981, #34d399)`,WebkitBackgroundClip:`text`,WebkitTextFillColor:`transparent`,backgroundClip:`text`,fontWeight:700,animation:`pulse 2s ease infinite`},children:[`⏱️ Starting in `,S,`s...`]}),(0,U.jsx)(`h2`,{style:{fontSize:`clamp(32px, 5vw, 56px)`,margin:0,fontWeight:700,background:`linear-gradient(135deg, #6366f1, #a855f7)`,WebkitBackgroundClip:`text`,WebkitTextFillColor:`transparent`,backgroundClip:`text`,letterSpacing:`-0.02em`},children:`🎤 Up Next`}),(0,U.jsxs)(`div`,{style:{textAlign:`center`},children:[(0,U.jsx)(`div`,{style:{fontSize:`clamp(24px, 4vw, 48px)`,fontWeight:700,color:`#ffffff`,marginBottom:`8px`},children:ge[0].requested_by||`Anonymous`}),!F&&(0,U.jsxs)(`div`,{style:{fontSize:`clamp(14px, 2vw, 20px)`,color:`rgba(161, 161, 170, 1)`},children:[ge[0].title||`Unknown`,` • `,ge[0].artist||`Unknown`]})]})]}):(0,U.jsxs)(`div`,{style:{textAlign:`center`,animation:`fadeInUp 0.6s ease`},children:[(0,U.jsx)(`h1`,{style:{fontSize:`clamp(32px, 6vw, 64px)`,fontWeight:700,margin:`0 0 16px 0`,background:`linear-gradient(135deg, #6366f1, #a855f7)`,WebkitBackgroundClip:`text`,WebkitTextFillColor:`transparent`,backgroundClip:`text`,letterSpacing:`-0.02em`},children:`🎤 Waiting for singers...`}),(0,U.jsx)(`p`,{style:{fontSize:`clamp(16px, 2. 5vw, 20px)`,color:`rgba(161, 161, 170, 1)`,margin:0},children:`Add your song from the request page!`})]}),ve()]})]})}var Qn=c(m(),1),$n=-6,er=6,tr=640;function nr(){let[e,t]=(0,x.useState)(``),[n,r]=(0,x.useState)(``),[i,a]=(0,x.useState)(new Map),[o,s]=(0,x.useState)(`local`),[c,l]=(0,x.useState)([]),[u,d]=(0,x.useState)([]),[f,p]=(0,x.useState)(!1),[m,h]=(0,x.useState)(null),[g,_]=(0,x.useState)(null),[v,y]=(0,x.useState)(new Set),[b,ee]=(0,x.useState)(!1),[S,C]=(0,x.useState)(`all`),[w,T]=(0,x.useState)(!1),[E,D]=(0,x.useState)(null),[O,k]=(0,x.useState)(null),[A,te]=(0,x.useState)(null),[ne,re]=(0,x.useState)(null),[j,M]=(0,x.useState)(null),[N,ie]=(0,x.useState)({}),ae=(0,x.useRef)(null),oe=(0,x.useRef)(null),se=(0,x.useRef)(null),ce=(0,x.useRef)(null),[P,F]=(0,x.useState)(`local`),[le,I]=(0,x.useState)(!0),[ue,de]=(0,x.useState)(!0);(0,x.useEffect)(()=>{function e(e){if(E){let t=se.current;t&&!t.contains(e.target)&&(D(null),te(null),re(null))}if(j){let t=ce.current;t&&!t.contains(e.target)&&M(null)}}return document.addEventListener(`mousedown`,e),()=>document.removeEventListener(`mousedown`,e)},[E,j]),(0,x.useEffect)(()=>{document.documentElement.style.cssText=`
      --color-bg-primary: #0a0a0f;
      --color-bg-secondary: #16161d;
      --color-bg-card: #1d1d27;
      --color-bg-hover: #252533;
      --color-accent: #6366f1;
      --color-accent-hover: #7c7ff3;
      --color-success: #10b981;
      --color-warning: #f59e0b;
      --color-danger: #ef4444;
      --color-text-primary: #ffffff;
      --color-text-secondary: #a1a1aa;
      --color-text-muted: #71717a;
      --color-border: rgba(255, 255, 255, 0.08);
      --color-border-focus: rgba(99, 102, 241, 0.5);
    `,document.body.style.cssText=`
      background: linear-gradient(135deg, #0a0a0f 0%, #16161d 100%);
      color: #ffffff;
      margin: 0;
      padding: 0;
      min-height: 100vh;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    `;let e=document.querySelector(`nav`),t=e?e.style.display:``;e&&(e.style.display=`none`);let n=localStorage.getItem(`karaoke-name`);n&&r(n);async function i(){try{let e=await W(`/api/settings/public`),t=e[`requests.acceptance`]||`local`,n=e[`libraries.local_enabled`]!==!1,r=e[`libraries.external_enabled`]!==!1;F(t),I(n),de(r),n?s(`local`):r&&s(`karaoke-nerds`)}catch(e){console.error(`Failed to load settings:`,e)}}return i(),()=>{document.documentElement.style.cssText=``,document.body.style.cssText=``,e&&(e.style.display=t),ae.current&&clearTimeout(ae.current),oe.current&&clearTimeout(oe.current)}},[]),(0,x.useLayoutEffect)(()=>{E&&(window.innerWidth<=tr||O&&requestAnimationFrame(()=>{let e=se.current;if(!e)return;let t=e.getBoundingClientRect(),n=window.innerWidth,r=window.innerHeight,i=O.bottom+8;i+t.height+8>r&&(i=O.top-t.height-8),i=Math.max(8,Math.min(i,r-t.height-8));let a=O.right-t.width;a=Math.max(8,Math.min(a,n-t.width-8)),te({top:i,left:a,width:O.width})}))},[E,O]),(0,x.useEffect)(()=>{n.trim()&&localStorage.setItem(`karaoke-name`,n.trim())},[n]);let fe=(0,x.useCallback)((e,t)=>{a(n=>{let r=new Map(n),i=(r.get(e)??0)+t;return i>=$n&&i<=er&&r.set(e,i),r})},[]),pe=(0,x.useCallback)((e,t,n)=>{e.stopPropagation();let r=n===t;if(!r)if(window.innerWidth>tr){let t=e.currentTarget.getBoundingClientRect();k({top:t.top,left:t.left,right:t.right,bottom:t.bottom,width:t.width}),te({top:t.bottom+8,left:t.left,width:t.width})}else k(null),te(null);D(e=>e===t?null:t),r&&k(null)},[]),me=(0,x.useCallback)(async(e,t,n)=>{ie(t=>({...t,[e]:{loading:!0,lyrics:null,error:null}}));try{let r=new AbortController,i=setTimeout(()=>r.abort(),1e4),a=await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(t)}/${encodeURIComponent(n)}`,{signal:r.signal});if(clearTimeout(i),!a.ok)throw Error(`Lyrics not found`);let o=await a.json();ie(t=>({...t,[e]:{loading:!1,lyrics:o.lyrics||`No lyrics available`,error:null}}))}catch(t){let n=t instanceof Error&&t.name===`AbortError`?`Request timeout - please try again`:`Lyrics not found`;ie(t=>({...t,[e]:{loading:!1,lyrics:null,error:n}}))}},[]),he=(0,x.useCallback)(async()=>{if(!e.trim()){l([]);return}p(!0);try{let t=`/api/search?q=${encodeURIComponent(e.trim())}`;S!==`all`&&(t+=`&kind=${S}`);let n=await W(t);l(Array.isArray(n)?n:[])}catch(e){console.error(`Search error:`,e),l([])}finally{p(!1)}},[e,S]),ge=(0,x.useCallback)(async()=>{if(!e.trim()){d([]);return}p(!0);try{let t=await W(`/api/karaoke-nerds/search?q=${encodeURIComponent(e.trim())}`);d(Array.isArray(t)?t:[])}catch(e){console.error(`Karaoke Nerds search error:`,e),d([])}finally{p(!1)}},[e]);(0,x.useEffect)(()=>(ae.current&&clearTimeout(ae.current),ae.current=setTimeout(()=>{o===`local`?he():ge()},o===`local`?300:500),()=>{ae.current&&clearTimeout(ae.current)}),[e,o,he,ge]),(0,x.useEffect)(()=>{e.trim()&&(o===`local`?he():ge())},[o]);let L=(e,t=`success`)=>{let n=document.createElement(`div`);n.className=`toast-notification ${t}`,n.innerHTML=`
      <div class="toast-icon">${t===`success`?`✓`:`⚠`}</div>
      <div class="toast-message">${e}</div>
    `,document.body.appendChild(n),requestAnimationFrame(()=>{n.classList.add(`show`)}),oe.current=setTimeout(()=>{n.classList.remove(`show`),setTimeout(()=>{document.body.contains(n)&&document.body.removeChild(n)},300)},3e3)};async function _e(e,t){let r=n.trim();if(!r){ee(!0),document.getElementById(`singer-name-input`)?.focus();return}let a=`local-${e}`,o=i.get(a)??0;h(e);try{await W(`/api/queue`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({trackId:e,requestedBy:r,keyAdjustment:o})}),y(e=>new Set(e).add(a)),setTimeout(()=>{y(e=>{let t=new Set(e);return t.delete(a),t})},3e3),L(`🎤 "${t}" added for ${r}${o===0?``:` (Key: ${o>0?`+`:``}${o})`}`)}catch(e){L(`Failed to add song.  Please try again.`,`error`),console.error(e)}finally{h(null)}}async function ve(e){let t=n.trim();if(!t){ee(!0),document.getElementById(`singer-name-input`)?.focus();return}let r=`kn-${e.url}`,a=i.get(r)??0;_(e.url);try{await W(`/api/karaoke-nerds/add`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({title:e.title,artist:e.artist,url:e.url,requestedBy:t,keyAdjustment:a})}),y(e=>new Set(e).add(r)),setTimeout(()=>{y(e=>{let t=new Set(e);return t.delete(r),t})},3e3);let n=a===0?``:` (Key: ${a>0?`+`:``}${a})`;L(`🎤 "${e.title}" added for ${t}${n}`)}catch(e){L(`Failed to add song. Please try again.`,`error`),console.error(e)}finally{_(null)}}return(0,U.jsxs)(`div`,{className:`requests-page`,children:[(0,U.jsx)(`style`,{children:`
        /* Import Inter font */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* Animations */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            transform: translateX(-10px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes ripple {
          to {
            transform: scale(1. 5);
            opacity: 0;
          }
        }

        @keyframes toastSlide {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* Base styles */
        .requests-page {
          min-height: 100vh;
          padding: 16px;
          padding-bottom: env(safe-area-inset-bottom, 16px);
          animation: fadeInUp 0.5s ease;
        }

        .container {
          max-width: 768px;
          margin: 0 auto;
        }

        /* Header */
        .header {
          text-align: center;
          margin-bottom: 32px;
          animation: fadeInUp 0.6s ease;
        }

        .header-title {
          font-size: clamp(28px, 5vw, 40px);
          font-weight: 700;
          margin: 0 0 8px 0;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em;
        }

        .header-subtitle {
          color: var(--color-text-secondary);
          font-size: clamp(14px, 2.5vw, 16px);
          margin: 0;
        }

        /* Cards */
        .card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          animation: fadeInUp 0.6s ease backwards;
          overflow: hidden;
        }

        .card:nth-child(2) {
          animation-delay: 0.1s;
        }

        .card:nth-child(3) {
          animation-delay: 0.2s;
        }

        /* Singer Input Card */
        .singer-card {
          position: relative;
          overflow: hidden;
        }
        
        .singer-card::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(45deg, #6366f1, #a855f7, #ec4899, #6366f1);
          background-size: 300% 300%;
          border-radius: 20px;
          opacity: 0;
          transition: opacity 0.3s ease;
          animation: gradient 4s ease infinite;
          z-index: -1;
        }

        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .singer-card. has-name::before {
          opacity: 0.3;
        }

        .input-group {
          margin-bottom: 16px;
        }

        . input-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-secondary);
          margin-bottom: 8px;
          transition: color 0.3s ease;
        }

        .input-wrapper {
          position: relative;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        .input-field {
          width: 100%;
          padding: 14px 16px;
          padding-left: 44px;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 12px;
          color: var(--color-text-primary);
          font-size: 16px;
          font-weight: 500;
          transition: all 0.3s ease;
          outline: none;
          box-sizing: border-box;
        }

        .input-field:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
          transform: translateY(-2px);
        }

        .input-field::placeholder {
          color: var(--color-text-muted);
        }

        .input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 20px;
          transition: transform 0.3s ease;
        }

        .input-field:focus + .input-icon {
          transform: translateY(-50%) scale(1.1);
        }

        /* Singer Badge */
        .singer-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
          border: 1px solid rgba(99, 102, 241, 0.4);
          border-radius: 100px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 600;
          animation: slideIn 0.3s ease;
        }

        .singer-badge-icon {
          font-size: 18px;
          animation: pulse 2s ease infinite;
        }

        /* Name Prompt */
        .name-prompt {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(245, 158, 11, 0.1));
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: slideIn 0.3s ease;
        }

        .name-prompt-icon {
          font-size: 20px;
          animation: pulse 1.5s ease infinite;
        }

        .name-prompt-text {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
        }

        /* Search Mode Toggle - FIXED SELECTORS WITHOUT SPACES */
        .search-mode-toggle {
          display: flex;
          flex-direction: row;
          gap: 8px;
          background: transparent;
          padding: 0;
          margin-bottom: 20px;
        }

        .mode-button {
          flex: 1;
          padding: 12px 16px;
          border: none;
          border-radius: 12px;
          background: var(--color-bg-secondary);
          color: var(--color-text-secondary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 1px solid var(--color-border);
        }

        /* Active state - NO SPACES IN SELECTOR */
        .mode-button.active {
          background: linear-gradient(135deg, #6366f1, #818cf8);
          color: white;
          border-color: transparent;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0. 3);
        }

        /* Active state for Karaoke Nerds - NO SPACES IN SELECTOR */
        .mode-button.active. karaoke-nerds {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
        }

        . mode-button:not(.active):hover {
          background: var(--color-bg-hover);
          color: var(--color-text-primary);
          border-color: var(--color-accent);
        }

        .mode-icon {
          font-size: 16px;
        }

        /* Search Input */
        .search-wrapper {
          position: relative;
          margin-bottom: 20px;
        }

        .search-input {
          width: 100%;
          padding: 16px 20px;
          padding-left: 48px;
          padding-right: 48px;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 16px;
          color: var(--color-text-primary);
          font-size: 16px;
          font-weight: 500;
          transition: all 0.3s ease;
          outline: none;
        }

        .search-input:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
          transform: translateY(-2px);
        }

        .search-icon {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 20px;
          color: var(--color-text-muted);
          transition: color 0.3s ease;
        }

        .search-input:focus ~ .search-icon {
          color: var(--color-accent);
        }

        . search-clear {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          padding: 4px;
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          font-size: 20px;
          cursor: pointer;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          line-height: 1;
        }

        .search-clear. visible {
          opacity: 1;
          visibility: visible;
        }

        .search-clear:hover {
          color: var(--color-text-primary);
        }

        /* Search Filters */
        .search-filters {
          margin-top: 16px;
          animation: fadeInUp 0.3s ease;
        }

        .filter-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 10px;
          color: var(--color-text-secondary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          width: fit-content;
        }

        .filter-toggle:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          color: var(--color-text-primary);
        }

        .filter-icon {
          font-size: 16px;
        }

        .filter-chevron {
          font-size: 10px;
          margin-left: 4px;
          transition: transform 0.3s ease;
        }

        .filter-options {
          margin-top: 12px;
          padding: 16px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          animation: slideIn 0.3s ease;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .filter-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .filter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .filter-chip {
          padding: 8px 14px;
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          color: var(--color-text-secondary);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .filter-chip:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          color: var(--color-text-primary);
          transform: translateY(-1px);
        }

        .filter-chip.active {
          background: linear-gradient(135deg, #6366f1, #818cf8);
          border-color: transparent;
          color: white;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }

        .filter-chip.active:hover {
          background: linear-gradient(135deg, #7c7ff3, #8b91f9);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        /* Loading State */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          gap: 16px;
        }

        . loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--color-border);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        . loading-text {
          color: var(--color-text-secondary);
          font-size: 14px;
          font-weight: 500;
        }

        /* Results Header */
        .results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0;
          margin-bottom: 12px;
          border-bottom: 1px solid var(--color-border);
          animation: fadeInUp 0.3s ease;
        }

        .results-count {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .active-filter-badge {
          padding: 4px 10px;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        /* Results - UPDATED WITH RIGHT-SIDE SMALL BUTTON */
        .results-container {
          animation: fadeInUp 0.4s ease;
        }

        .result-card {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 12px;
          margin-bottom: 12px;
          transition: all 0.3s ease;
          position: relative;
          overflow: visible;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        . result-card:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          transform: translateX(4px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }

        .result-number {
          min-width: 36px;
          height: 36px;
          background: var(--color-accent);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
          color: white;
        }

        .result-info {
          flex: 1;
          min-width: 0;
        }

        .result-title {
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--color-text-primary);
        }

        .result-artist {
          font-size: 14px;
          color: var(--color-text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-bottom: 6px;
        }

        . result-meta {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .meta-tag {
          display: inline-block;
          padding: 2px 6px;
          background: var(--color-bg-primary);
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          color: var(--color-text-muted);
        }

        .meta-tag. brand {
          background: rgba(124, 58, 237, 0.2);
          color: #a855f7;
        }

        /* Add Button - Smaller and on the right */
        .add-button {
          padding: 8px 16px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          white-space: nowrap;
          min-width: 80px;
        }

        .add-button::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .add-button:active::before {
          width: 200px;
          height: 200px;
        }

        . add-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
        }

        .add-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        . add-button.karaoke-nerds {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
        }

        . add-button.karaoke-nerds:hover:not(:disabled) {
          box-shadow: 0 6px 20px rgba(124, 58, 237, 0. 4);
        }

        . add-button.success {
          background: var(--color-success);
          pointer-events: none;
        }

        .add-button-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        . button-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        /* Button Container - Flex container for key button and add button */
        .button-container {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        }

        /* Action Menu Button - Single button to open menu */
        .action-menu-button {
          padding: 8px 16px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          white-space: nowrap;
          min-width: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .action-menu-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
        }

        .action-menu-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .action-menu-button.karaoke-nerds {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
        }

        .action-menu-button.karaoke-nerds:hover:not(:disabled) {
          box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
        }

        .action-menu-button.success {
          background: var(--color-success);
          pointer-events: none;
        }

        /* Action Menu Overlay for mobile */
        .action-menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          z-index: 999;
          animation: fadeIn 0.3s ease;
          display: none;
        }

        @media (max-width: 640px) {
          .action-menu-overlay {
            display: block;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Action Menu Container - Desktop popup */
        .action-menu {
          position: fixed;
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 8px;
          min-width: 200px;
          z-index: 1001;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          animation: slideInDown 0.2s ease;
        }

        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Mobile: Bottom sheet */
        @media (max-width: 640px) {
          .action-menu {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            top: auto;
            border-radius: 20px 20px 0 0;
            padding: 20px;
            padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
            animation: slideInUp 0.3s ease;
            max-width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 1001;
          }

          @keyframes slideInUp {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
        }

        .action-menu-header {
          padding: 8px 12px;
          border-bottom: 1px solid var(--color-border);
          margin-bottom: 8px;
        }

        .action-menu-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }

        .action-menu-subtitle {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin: 4px 0 0 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .action-menu-items {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .action-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--color-text-primary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          width: 100%;
        }

        .action-menu-item:hover {
          background: var(--color-bg-hover);
        }

        .action-menu-item-icon {
          font-size: 20px;
          width: 24px;
          text-align: center;
        }

        .action-menu-item-content {
          flex: 1;
          min-width: 0;
        }

        .action-menu-item-label {
          display: block;
          font-weight: 600;
        }

        .action-menu-item-description {
          display: block;
          font-size: 12px;
          color: var(--color-text-secondary);
          margin-top: 2px;
        }

        .action-menu-item-value {
          font-size: 12px;
          color: var(--color-text-secondary);
          white-space: nowrap;
        }

        .action-menu-item.primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
        }

        .action-menu-item.primary:hover {
          background: linear-gradient(135deg, #7c7ff3, #9d6ff7);
        }

        .action-menu-item.primary .action-menu-item-description {
          color: rgba(255, 255, 255, 0.8);
        }

        /* Key Adjustment View within Action Menu */
        .key-adjustment-view {
          padding: 16px 12px;
          border-top: 1px solid var(--color-border);
          margin-top: 4px;
        }

        .key-adjustment-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .key-adjustment-back {
          background: transparent;
          border: none;
          color: var(--color-text-secondary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .key-adjustment-back:hover {
          background: var(--color-bg-hover);
          color: var(--color-text-primary);
        }

        .key-adjustment-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .key-adjustment-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 20px 0;
        }

        .key-adjustment-button {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          border: 2px solid var(--color-border);
          background: var(--color-bg-secondary);
          color: var(--color-text-primary);
          font-size: 24px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .key-adjustment-button:hover:not(:disabled) {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          transform: scale(1.05);
        }

        .key-adjustment-button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .key-adjustment-display {
          min-width: 100px;
          text-align: center;
        }

        .key-adjustment-value {
          font-weight: 700;
          font-size: 24px;
          color: var(--color-text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .key-adjustment-label {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin-top: 4px;
        }

        /* Mobile optimizations for action menu */
        @media (max-width: 640px) {
          .action-menu-item {
            padding: 16px;
          }

          .action-menu-header {
            padding: 12px 0;
            margin-bottom: 12px;
          }

          .action-menu-title {
            font-size: 16px;
          }

          .key-adjustment-controls {
            padding: 24px 0;
          }

          .key-adjustment-button {
            width: 60px;
            height: 60px;
            font-size: 28px;
          }

          .key-adjustment-value {
            font-size: 28px;
          }
        }

        /* Lyrics Button */
        .lyrics-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          color: var(--color-text-primary);
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
        }

        .lyrics-button:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
        }

        /* Lyrics Popup/Modal */
        .lyrics-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          padding: 20px;
          animation: fadeInUp 0.3s ease;
        }

        .lyrics-popup {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 24px;
          max-width: 600px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          animation: slideIn 0.3s ease;
          z-index: 1201;
        }

        .lyrics-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--color-border);
        }

        .lyrics-title-info {
          flex: 1;
          min-width: 0;
        }

        .lyrics-popup-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 4px 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .lyrics-popup-artist {
          font-size: 14px;
          color: var(--color-text-secondary);
          margin: 0;
        }

        .lyrics-close-button {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-primary);
          font-size: 20px;
          line-height: 1;
          transition: all 0.3s ease;
          flex-shrink: 0;
          margin-left: 12px;
        }

        .lyrics-close-button:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
        }

        .lyrics-content {
          color: var(--color-text-primary);
          font-size: 14px;
          line-height: 1.8;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .lyrics-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          gap: 16px;
        }

        .lyrics-error {
          text-align: center;
          padding: 40px 20px;
          color: var(--color-text-secondary);
        }

        .lyrics-error-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 48px 24px;
          animation: fadeInUp 0.5s ease;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
          animation: pulse 2s ease infinite;
        }

        .empty-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--color-text-primary);
          margin-bottom: 8px;
        }

        .empty-message {
          font-size: 14px;
          color: var(--color-text-secondary);
        }

        /* Toast Notifications */
        .toast-notification {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%) translateY(100%);
          background: var(--color-success);
          color: white;
          padding: 14px 20px;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 600;
          font-size: 14px;
          z-index: 1300;
          opacity: 0;
          transition: all 0.3s ease;
          max-width: calc(100vw - 48px);
        }

        .toast-notification. show {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }

        .toast-notification.error {
          background: var(--color-danger);
        }

        .toast-icon {
          width: 24px;
          height: 24px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .requests-page {
            padding: 12px;
          }

          .card {
            padding: 16px;
            border-radius: 16px;
          }

          . search-mode-toggle {
            position: sticky;
            top: 0;
            z-index: 10;
            backdrop-filter: blur(10px);
            margin-bottom: 16px;
          }

          .result-card {
            padding: 10px;
          }

          .result-number {
            min-width: 32px;
            height: 32px;
            font-size: 14px;
          }

          .result-title {
            font-size: 15px;
          }

          . result-artist {
            font-size: 13px;
          }

          .add-button {
            padding: 7px 14px;
            font-size: 13px;
            min-width: 70px;
          }

          .action-menu-button {
            padding: 7px 14px;
            font-size: 13px;
            min-width: 70px;
          }

          .empty-icon {
            font-size: 48px;
          }
        }

        @media (max-width: 380px) {
          .header-title {
            font-size: 24px;
          }

          .card {
            padding: 14px;
          }

          .mode-button {
            font-size: 13px;
            padding: 10px 8px;
          }
        }

        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0. 01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* High contrast mode */
        @media (prefers-contrast: high) {
          . card {
            border-width: 2px;
          }

          .input-field,
          .search-input {
            border-width: 2px;
          }

          .add-button {
            border: 2px solid white;
          }
        }
      `}),(0,U.jsxs)(`div`,{className:`container`,children:[(0,U.jsxs)(`div`,{className:`header`,children:[(0,U.jsx)(`h1`,{className:`header-title`,children:`🎤 Request a Song`}),(0,U.jsx)(`p`,{className:`header-subtitle`,children:`Find your favorite songs and rock the stage!`})]}),(0,U.jsxs)(`div`,{className:`card singer-card ${n.trim()?`has-name`:``}`,children:[b&&!n.trim()&&(0,U.jsxs)(`div`,{className:`name-prompt`,children:[(0,U.jsx)(`span`,{className:`name-prompt-icon`,children:`⚠️`}),(0,U.jsx)(`span`,{className:`name-prompt-text`,children:`Please enter your name to add songs to the queue`})]}),(0,U.jsxs)(`div`,{className:`input-group`,children:[(0,U.jsx)(`label`,{className:`input-label required`,htmlFor:`singer-name-input`,children:`Your Name`}),(0,U.jsxs)(`div`,{className:`input-wrapper`,children:[(0,U.jsx)(`input`,{id:`singer-name-input`,className:`input-field`,type:`text`,placeholder:`Enter your name...`,value:n,onChange:e=>{r(e.target.value),ee(!1)},autoComplete:`name`,autoCapitalize:`words`}),(0,U.jsx)(`span`,{className:`input-icon`,children:`👤`})]})]}),n.trim()&&(0,U.jsxs)(`div`,{className:`singer-badge`,children:[(0,U.jsx)(`span`,{className:`singer-badge-icon`,children:`🎵`}),(0,U.jsxs)(`span`,{children:[`Ready to sing as `,(0,U.jsx)(`strong`,{children:n.trim()})]})]})]}),(0,U.jsxs)(`div`,{className:`card`,children:[(le||ue)&&(0,U.jsxs)(`div`,{className:`search-mode-toggle`,children:[le&&(0,U.jsxs)(`button`,{className:`mode-button ${o===`local`?`active local`:``}`,onClick:()=>s(`local`),children:[(0,U.jsx)(`img`,{src:`https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4da.svg`,alt:`Local Library`,className:`mode-icon`,style:{width:`20px`,height:`20px`,marginRight:`6px`}}),(0,U.jsx)(`span`,{children:`Local Library`})]}),ue&&(0,U.jsxs)(`button`,{className:`mode-button ${o===`karaoke-nerds`?`active karaoke-nerds`:``}`,onClick:()=>s(`karaoke-nerds`),children:[(0,U.jsx)(`img`,{src:`https://karaokenerds.com/Content/Icons/favicon.ico`,alt:`Karaoke Nerds`,style:{width:`20px`,height:`20px`,marginRight:`6px`}}),(0,U.jsx)(`span`,{children:`Karaoke Nerds`})]})]}),!le&&!ue?(0,U.jsxs)(`div`,{style:{padding:`40px`,textAlign:`center`,color:`var(--color-text-secondary)`},children:[(0,U.jsx)(`div`,{style:{fontSize:`48px`,marginBottom:`16px`},children:`🎤`}),(0,U.jsx)(`div`,{style:{fontSize:`18px`,fontWeight:500},children:`We are not accepting requests at this time.`})]}):(0,U.jsxs)(U.Fragment,{children:[(0,U.jsxs)(`div`,{className:`search-wrapper`,children:[(0,U.jsx)(`input`,{className:`search-input`,type:`search`,placeholder:o===`local`?`Search local songs...`:`Search online catalog...`,value:e,onChange:e=>t(e.target.value),autoComplete:`off`,autoCorrect:`off`,spellCheck:`false`}),(0,U.jsx)(`span`,{className:`search-icon`,children:`🔍`})]}),o===`local`&&(0,U.jsxs)(`div`,{className:`search-filters`,children:[(0,U.jsxs)(`button`,{className:`filter-toggle`,onClick:()=>T(!w),"aria-label":`Toggle filters`,children:[(0,U.jsx)(`span`,{className:`filter-icon`,children:`⚙️`}),(0,U.jsx)(`span`,{children:`Filters`}),(0,U.jsx)(`span`,{className:`filter-chevron`,children:w?`▼`:`▶`})]}),w&&(0,U.jsx)(`div`,{className:`filter-options`,children:(0,U.jsxs)(`div`,{className:`filter-group`,children:[(0,U.jsx)(`label`,{className:`filter-label`,children:`Format`}),(0,U.jsxs)(`div`,{className:`filter-chips`,children:[(0,U.jsx)(`button`,{className:`filter-chip ${S===`all`?`active`:``}`,onClick:()=>C(`all`),children:(0,U.jsx)(`span`,{children:`All Formats`})}),(0,U.jsx)(`button`,{className:`filter-chip ${S===`mp4`?`active`:``}`,onClick:()=>C(`mp4`),children:(0,U.jsx)(`span`,{children:`🎬 MP4 Video`})}),(0,U.jsx)(`button`,{className:`filter-chip ${S===`cdgmp3`?`active`:``}`,onClick:()=>C(`cdgmp3`),children:(0,U.jsx)(`span`,{children:`📀 CDG+MP3`})})]})]})})]}),f?(0,U.jsxs)(`div`,{className:`loading-container`,children:[(0,U.jsx)(`div`,{className:`loading-spinner`}),(0,U.jsx)(`div`,{className:`loading-text`,children:o===`local`?`Searching local library...`:`Searching Karaoke Nerds...`})]}):o===`local`&&c.length>0?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsxs)(`div`,{className:`results-header`,children:[(0,U.jsxs)(`span`,{className:`results-count`,children:[c.length,` `,c.length===1?`song`:`songs`,` found`]}),S!==`all`&&(0,U.jsx)(`span`,{className:`active-filter-badge`,children:S===`mp4`?`🎬 MP4`:`📀 CDG+MP3`})]}),(0,U.jsx)(`div`,{className:`results-container`,children:c.map((e,t)=>{let n=`local-${e.id}`,r=v.has(n),a=i.get(n)??0;return(0,U.jsxs)(`div`,{className:`result-card`,children:[(0,U.jsx)(`div`,{className:`result-number`,children:t+1}),(0,U.jsxs)(`div`,{className:`result-info`,children:[(0,U.jsx)(`div`,{className:`result-title`,children:e.title||`Unknown Title`}),(0,U.jsx)(`div`,{className:`result-artist`,children:e.artist||`Unknown Artist`}),(0,U.jsxs)(`div`,{className:`result-meta`,children:[e.disc_id&&(0,U.jsxs)(`span`,{className:`meta-tag`,children:[`📀 `,e.disc_id]}),e.kind&&(0,U.jsx)(`span`,{className:`meta-tag`,children:e.kind.toUpperCase()})]})]}),(0,U.jsx)(`div`,{className:`button-container`,children:(0,U.jsxs)(`div`,{style:{position:`relative`,width:`100%`},children:[(0,U.jsx)(`button`,{className:`action-menu-button ${r?`success`:``}`,onClick:t=>{!r&&m!==e.id&&pe(t,n,E)},disabled:m===e.id||r,children:m===e.id?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{className:`button-spinner`}),(0,U.jsx)(`span`,{children:`Adding`})]}):r?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`span`,{children:`✓`}),(0,U.jsx)(`span`,{children:`Added`})]}):(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`span`,{children:`⋯`}),(0,U.jsx)(`span`,{children:`Options`})]})}),E===n&&(0,Qn.createPortal)((0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{className:`action-menu-overlay`,onClick:()=>D(null)}),(0,U.jsxs)(`div`,{className:`action-menu`,ref:se,onClick:e=>e.stopPropagation(),style:A?{top:`${A.top}px`,left:`${A.left}px`,width:`max-content`,minWidth:`${A.width}px`}:void 0,children:[(0,U.jsxs)(`div`,{className:`action-menu-header`,children:[(0,U.jsx)(`h3`,{className:`action-menu-title`,children:e.title||`Unknown Title`}),(0,U.jsx)(`p`,{className:`action-menu-subtitle`,children:e.artist||`Unknown Artist`})]}),ne===n?(0,U.jsxs)(`div`,{className:`key-adjustment-view`,children:[(0,U.jsxs)(`div`,{className:`key-adjustment-header`,children:[(0,U.jsxs)(`button`,{className:`key-adjustment-back`,onClick:()=>re(null),children:[(0,U.jsx)(`span`,{children:`←`}),(0,U.jsx)(`span`,{children:`Back`})]}),(0,U.jsx)(`span`,{className:`key-adjustment-title`,children:`Adjust Key`})]}),(0,U.jsxs)(`div`,{className:`key-adjustment-controls`,children:[(0,U.jsx)(`button`,{className:`key-adjustment-button`,onClick:()=>fe(n,-1),disabled:(i.get(n)??0)<=$n,"aria-label":`Lower key`,children:`−`}),(0,U.jsxs)(`div`,{className:`key-adjustment-display`,children:[(0,U.jsxs)(`div`,{className:`key-adjustment-value`,children:[`🎹 `,a>0?`+${a}`:a]}),(0,U.jsx)(`div`,{className:`key-adjustment-label`,children:`Semitones`})]}),(0,U.jsx)(`button`,{className:`key-adjustment-button`,onClick:()=>fe(n,1),disabled:(i.get(n)??0)>=er,"aria-label":`Raise key`,children:`+`})]})]}):(0,U.jsxs)(`div`,{className:`action-menu-items`,children:[(0,U.jsxs)(`button`,{className:`action-menu-item primary`,onClick:()=>{D(null),_e(e.id,e.title||`Unknown`)},children:[(0,U.jsx)(`span`,{className:`action-menu-item-icon`,children:`+`}),(0,U.jsxs)(`div`,{className:`action-menu-item-content`,children:[(0,U.jsx)(`span`,{className:`action-menu-item-label`,children:`Add to Queue`}),(0,U.jsx)(`span`,{className:`action-menu-item-description`,children:`Request this song`})]})]}),(0,U.jsxs)(`button`,{className:`action-menu-item`,onClick:e=>{e.stopPropagation(),re(n)},children:[(0,U.jsx)(`span`,{className:`action-menu-item-icon`,children:`🎹`}),(0,U.jsxs)(`div`,{className:`action-menu-item-content`,children:[(0,U.jsx)(`span`,{className:`action-menu-item-label`,children:`Adjust Key`}),(0,U.jsx)(`span`,{className:`action-menu-item-description`,children:`Change pitch`})]}),(0,U.jsx)(`span`,{className:`action-menu-item-value`,children:a>0?`+${a}`:a})]}),(0,U.jsxs)(`button`,{className:`action-menu-item`,onClick:t=>{t.stopPropagation();let r=e.artist||`Unknown Artist`,i=e.title||`Unknown Title`;D(null),M(n),N[n]||me(n,r,i)},children:[(0,U.jsx)(`span`,{className:`action-menu-item-icon`,children:`📄`}),(0,U.jsxs)(`div`,{className:`action-menu-item-content`,children:[(0,U.jsx)(`span`,{className:`action-menu-item-label`,children:`View Lyrics`}),(0,U.jsx)(`span`,{className:`action-menu-item-description`,children:`See song words`})]})]})]})]})]}),document.body)]})})]},e.id)})})]}):o===`karaoke-nerds`&&u.length>0?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{className:`results-header`,children:(0,U.jsxs)(`span`,{className:`results-count`,children:[u.length,` `,u.length===1?`song`:`songs`,` found`]})}),(0,U.jsx)(`div`,{className:`results-container`,children:u.map((e,t)=>{let n=`kn-${e.url}`,r=v.has(n);return i.get(n),(0,U.jsxs)(`div`,{className:`result-card`,children:[(0,U.jsx)(`div`,{className:`result-number`,children:t+1}),(0,U.jsxs)(`div`,{className:`result-info`,children:[(0,U.jsx)(`div`,{className:`result-title`,children:e.title}),(0,U.jsx)(`div`,{className:`result-artist`,children:e.artist||`Unknown Artist`}),(0,U.jsxs)(`div`,{className:`result-meta`,children:[e.brand&&(0,U.jsxs)(`span`,{className:`meta-tag brand`,children:[`🎵 `,e.brand]}),(0,U.jsx)(`span`,{className:`meta-tag`,children:`🌐 Online`})]})]}),(0,U.jsx)(`div`,{className:`button-container`,children:(0,U.jsxs)(`div`,{style:{position:`relative`,width:`100%`},children:[(0,U.jsx)(`button`,{className:`action-menu-button karaoke-nerds ${r?`success`:``}`,onClick:t=>{!r&&g!==e.url&&pe(t,n,E)},disabled:g===e.url||r,children:g===e.url?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{className:`button-spinner`}),(0,U.jsx)(`span`,{children:`Adding`})]}):r?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`span`,{children:`✓`}),(0,U.jsx)(`span`,{children:`Added`})]}):(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`span`,{children:`⋯`}),(0,U.jsx)(`span`,{children:`Options`})]})}),E===n&&(0,Qn.createPortal)((0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{className:`action-menu-overlay`,onClick:()=>D(null)}),(0,U.jsxs)(`div`,{className:`action-menu`,ref:se,onClick:e=>e.stopPropagation(),style:A?{top:`${A.top}px`,left:`${A.left}px`,width:`max-content`,minWidth:`${A.width}px`}:void 0,children:[(0,U.jsxs)(`div`,{className:`action-menu-header`,children:[(0,U.jsx)(`h3`,{className:`action-menu-title`,children:e.title}),(0,U.jsx)(`p`,{className:`action-menu-subtitle`,children:e.artist||`Unknown Artist`})]}),(0,U.jsxs)(`div`,{className:`action-menu-items`,children:[(0,U.jsxs)(`button`,{className:`action-menu-item primary`,onClick:()=>{D(null),ve(e)},children:[(0,U.jsx)(`span`,{className:`action-menu-item-icon`,children:`+`}),(0,U.jsxs)(`div`,{className:`action-menu-item-content`,children:[(0,U.jsx)(`span`,{className:`action-menu-item-label`,children:`Add to Queue`}),(0,U.jsx)(`span`,{className:`action-menu-item-description`,children:`Request this song`})]})]}),(0,U.jsxs)(`button`,{className:`action-menu-item`,onClick:t=>{t.stopPropagation();let r=e.artist||`Unknown Artist`,i=e.title;D(null),M(n),N[n]||me(n,r,i)},children:[(0,U.jsx)(`span`,{className:`action-menu-item-icon`,children:`📄`}),(0,U.jsxs)(`div`,{className:`action-menu-item-content`,children:[(0,U.jsx)(`span`,{className:`action-menu-item-label`,children:`View Lyrics`}),(0,U.jsx)(`span`,{className:`action-menu-item-description`,children:`See song words`})]})]})]})]})]}),document.body)]})})]},e.url||t)})})]}):e.trim()?(0,U.jsxs)(`div`,{className:`empty-state`,children:[(0,U.jsx)(`div`,{className:`empty-icon`,children:`🎵`}),(0,U.jsx)(`div`,{className:`empty-title`,children:`No results found`}),(0,U.jsx)(`div`,{className:`empty-message`,children:o===`karaoke-nerds`?`No songs found on Karaoke Nerds for "${e}"`:`No songs found in library for "${e}"`})]}):(0,U.jsxs)(`div`,{className:`empty-state`,children:[(0,U.jsx)(`div`,{className:`empty-icon`,children:`🎤`}),(0,U.jsx)(`div`,{className:`empty-title`,children:`Ready to search? `}),(0,U.jsx)(`div`,{className:`empty-message`,children:o===`karaoke-nerds`?`Browse thousands of karaoke tracks online`:`Search our local karaoke library`})]})]})]})]}),j&&(()=>{let e=`Unknown Artist`,t=`Unknown Title`;if(j.startsWith(`local-`)){let n=parseInt(j.replace(`local-`,``)),r=c.find(e=>e.id===n);r&&(e=r.artist||`Unknown Artist`,t=r.title||`Unknown Title`)}else if(j.startsWith(`kn-`)){let n=j.replace(`kn-`,``),r=u.find(e=>e.url===n);r&&(e=r.artist||`Unknown Artist`,t=r.title)}let n=N[j];return(0,U.jsx)(`div`,{className:`lyrics-popup-overlay`,onClick:()=>M(null),children:(0,U.jsxs)(`div`,{className:`lyrics-popup`,ref:ce,onClick:e=>e.stopPropagation(),children:[(0,U.jsxs)(`div`,{className:`lyrics-header`,children:[(0,U.jsxs)(`div`,{className:`lyrics-title-info`,children:[(0,U.jsx)(`h2`,{className:`lyrics-popup-title`,children:t}),(0,U.jsx)(`p`,{className:`lyrics-popup-artist`,children:e})]}),(0,U.jsx)(`button`,{className:`lyrics-close-button`,onClick:()=>M(null),"aria-label":`Close`,children:`×`})]}),n?.loading?(0,U.jsxs)(`div`,{className:`lyrics-loading`,children:[(0,U.jsx)(`div`,{className:`loading-spinner`}),(0,U.jsx)(`div`,{className:`loading-text`,children:`Loading lyrics...`})]}):n?.error?(0,U.jsxs)(`div`,{className:`lyrics-error`,children:[(0,U.jsx)(`div`,{className:`lyrics-error-icon`,children:`😔`}),(0,U.jsx)(`div`,{children:n.error})]}):n?.lyrics?(0,U.jsx)(`div`,{className:`lyrics-content`,children:n.lyrics}):null]})})})()]})}function rr(e){return e==null?!0:!(e===!1||typeof e==`string`&&e.trim().toLowerCase()===`false`||e===0)}var ir=300,ar=500,or={song:!0,artist:!0,genre:!0,length:!0,path:!0},sr=`host.breakMusicColumns`;function cr(){if(typeof window>`u`)return or;try{let e=window.localStorage.getItem(sr);if(!e)return or;let t=JSON.parse(e);return{song:!!t?.song,artist:!!t?.artist,genre:!!t?.genre,length:!!t?.length,path:!!t?.path}}catch{return or}}function lr(){let e=Wn(),[t,n]=(0,x.useState)([]),[r,i]=(0,x.useState)(``),[a,o]=(0,x.useState)(``),[s,c]=(0,x.useState)(``),[l,u]=(0,x.useState)(null),[d,f]=(0,x.useState)(``),[p,m]=(0,x.useState)(!1),[h,g]=(0,x.useState)(!1),[_,v]=(0,x.useState)(5),[y,b]=(0,x.useState)(0),[ee,S]=(0,x.useState)(null),[C,w]=(0,x.useState)(``),[T,E]=(0,x.useState)([]),[D,O]=(0,x.useState)(null),[k,A]=(0,x.useState)(`local`),[te,ne]=(0,x.useState)(``),[re,j]=(0,x.useState)(``),[M,N]=(0,x.useState)(``),[ie,ae]=(0,x.useState)(``),[oe,se]=(0,x.useState)(null),[ce,P]=(0,x.useState)(null),[F,le]=(0,x.useState)(!0),[I,ue]=(0,x.useState)(90),[de,fe]=(0,x.useState)(60),[pe,me]=(0,x.useState)(``),[he,ge]=(0,x.useState)(!0),[L,_e]=(0,x.useState)(!0),[ve,ye]=(0,x.useState)(!1),[be,xe]=(0,x.useState)(!1),[Se,Ce]=(0,x.useState)(!1),[we,Te]=(0,x.useState)(!1),[Ee,De]=(0,x.useState)(``),[Oe,ke]=(0,x.useState)(``),[Ae,je]=(0,x.useState)(``),[Me,Ne]=(0,x.useState)(``),[Pe,Fe]=(0,x.useState)(!1),[Ie,Le]=(0,x.useState)(``),[Re,ze]=(0,x.useState)(``),[Be,Ve]=(0,x.useState)(``),[He,Ue]=(0,x.useState)(!1),[R,We]=(0,x.useState)(`local`),[Ge,Ke]=(0,x.useState)(``),[qe,Je]=(0,x.useState)([]),[Ye,Xe]=(0,x.useState)(``),[Ze,Qe]=(0,x.useState)(``),[$e,et]=(0,x.useState)(``),[tt,nt]=(0,x.useState)(``),[rt,it]=(0,x.useState)(``),[at,ot]=(0,x.useState)(!0),[st,ct]=(0,x.useState)(!0),[lt,ut]=(0,x.useState)(!0),[dt,ft]=(0,x.useState)(null),[pt,mt]=(0,x.useState)(!1),[ht,gt]=(0,x.useState)(null),[_t,vt]=(0,x.useState)(null),[z,yt]=(0,x.useState)(3),[bt,xt]=(0,x.useState)(100),[St,Ct]=(0,x.useState)(2),[wt,Tt]=(0,x.useState)(!1),[Et,Dt]=(0,x.useState)(``),[B,Ot]=(0,x.useState)([]),[V,kt]=(0,x.useState)([]),[At,jt]=(0,x.useState)([]),[Mt,Nt]=(0,x.useState)(null),[Pt,Ft]=(0,x.useState)(null),[It,Lt]=(0,x.useState)(()=>cr()),[Rt,zt]=(0,x.useState)({song:220,artist:180,genre:140,length:96,path:320}),[Bt,Vt]=(0,x.useState)([]),[Ht,Ut]=(0,x.useState)(null),[Wt,Gt]=(0,x.useState)(``),[Kt,qt]=(0,x.useState)(0),[Jt,Yt]=(0,x.useState)({column:`artist`,direction:`asc`}),[Xt,Zt]=(0,x.useState)(!1),[Qt,$t]=(0,x.useState)(62),[en,tn]=(0,x.useState)(null),[nn,rn]=(0,x.useState)(`strict_round_robin`),[an,on]=(0,x.useState)(!1),[sn,cn]=(0,x.useState)(!1),[ln,un]=(0,x.useState)(null),[dn,fn]=(0,x.useState)(null),[H,pn]=(0,x.useState)(null),[mn,hn]=(0,x.useState)(!1),[gn,_n]=(0,x.useState)(!1),[vn,yn]=(0,x.useState)(null),[bn,xn]=(0,x.useState)(null),[Sn,Cn]=(0,x.useState)(null),[wn,Tn]=(0,x.useState)(null),En=(0,x.useRef)(null),Dn=(0,x.useRef)(null),On=(0,x.useRef)(null),kn=(0,x.useRef)(null),An=(0,x.useRef)(null),jn=(0,x.useRef)(_),Mn=(0,x.useRef)(h),Nn=(0,x.useRef)(0),Pn=(0,x.useRef)(!1),Fn=(0,x.useRef)(!1),In=(0,x.useRef)(null),Ln=(0,x.useRef)(!1),Rn=(0,x.useRef)([]),zn=(0,x.useRef)(null),Bn=(0,x.useRef)(null),Un=(0,x.useRef)(0),Gn=(0,x.useRef)(null),G=(0,x.useMemo)(()=>({"x-session-token":e.sessionToken,"Content-Type":`application/json`}),[e.sessionToken]);(0,x.useEffect)(()=>{let t=new URLSearchParams(window.location.search),n=t.get(`oidc_session`),r=t.get(`oidc_error`);return n?(e.setSessionToken(n),localStorage.setItem(`sessionToken`,n),window.history.replaceState({},``,window.location.pathname)):r&&(c(`SSO login failed: ${decodeURIComponent(r)}`),window.history.replaceState({},``,window.location.pathname)),document.documentElement.style.cssText=`
      --color-bg-primary: #0a0a0f;
      --color-bg-secondary: #16161d;
      --color-bg-card: #1d1d27;
      --color-bg-hover: #252533;
      --color-accent: #6366f1;
      --color-accent-hover: #7c7ff3;
      --color-success: #10b981;
      --color-warning: #f59e0b;
      --color-danger: #ef4444;
      --color-text-primary: #ffffff;
      --color-text-secondary: #a1a1aa;
      --color-text-muted: #71717a;
      --color-border: rgba(255, 255, 255, 0.08);
      --color-border-focus: rgba(99, 102, 241, 0.5);
    `,document.body.style.cssText=`
      background: linear-gradient(135deg, #0a0a0f 0%, #16161d 100%);
      color: #ffffff;
      margin: 0;
      padding: 0;
      min-height: 100vh;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    `,Rr(),zr(),W(`/api/auth/oidc/config`).then(e=>u(e)).catch(()=>{}),()=>{document.documentElement.style.cssText=``,document.body.style.cssText=``,kn.current&&clearTimeout(kn.current),An.current&&clearTimeout(An.current),Gn.current&&clearTimeout(Gn.current)}},[]);async function Kn(t){t.preventDefault(),c(``),m(!0);try{let t=await W(`/api/auth/login`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({username:r,password:a})});t.ok&&t.sessionToken?(e.setSessionToken(t.sessionToken),localStorage.setItem(`sessionToken`,t.sessionToken),e.setIsLoggedIn(!0),e.setRole(t.role||`user`),o(``),e.setIsDefaultPassword(t.isDefaultPassword||!1),e.setProfile({username:t.username||``,displayName:t.displayName||``,picture:t.picture||``}),t.isDefaultPassword&&f(`⚠️ You are using the default password. Please change it in Account Settings.`)):c(`Invalid password`)}catch{c(`Login failed.  Please try again.`)}finally{m(!1)}}(0,x.useEffect)(()=>{async function t(){if(!e.sessionToken){e.setIsLoggedIn(!1);return}try{let t=await W(`/api/auth/validate`,{headers:{"x-session-token":e.sessionToken}});t.valid?(e.setIsLoggedIn(!0),e.setRole(t.role||`user`),e.setProfile({username:t.username||``,displayName:t.displayName||``,picture:t.picture||``})):(e.setIsLoggedIn(!1),e.setSessionToken(``),e.clearProfile(),localStorage.removeItem(`sessionToken`))}catch{e.setIsLoggedIn(!1),e.setSessionToken(``),e.clearProfile(),localStorage.removeItem(`sessionToken`)}}t()},[e.sessionToken]),(0,x.useEffect)(()=>{let e=()=>{Ce(!0)};return window.addEventListener(`showAccountManagement`,e),()=>{window.removeEventListener(`showAccountManagement`,e)}},[]);async function qn(t){if(t.preventDefault(),Ne(``),Oe!==Ae){Ne(`Passwords do not match`);return}if(Oe.length<8){Ne(`Password must be at least 8 characters long`);return}m(!0);try{await W(`/api/auth/change-password`,{method:`POST`,headers:G,body:JSON.stringify({currentPassword:Ee,newPassword:Oe})}),f(`Password changed successfully`),Te(!1),De(``),ke(``),je(``),Ne(``),e.setIsDefaultPassword(!1)}catch(e){Ne(e?.message||`Failed to change password`)}finally{m(!1)}}async function Jn(t){if(t.preventDefault(),Ve(``),!Ie.trim()||Ie.trim().length<3){Ve(`Username must be at least 3 characters long`);return}if(!Re){Ve(`Please enter your current password to confirm`);return}let n=Ie.trim();m(!0);try{await W(`/api/auth/change-username`,{method:`POST`,headers:G,body:JSON.stringify({newUsername:n,currentPassword:Re})}),f(`Username changed successfully`),Fe(!1),Le(``),ze(``),Ve(``),e.setProfile({username:n,displayName:n})}catch(e){Ve(e?.message||`Failed to change username`)}finally{m(!1)}}(0,x.useEffect)(()=>{async function t(){if(!(!e.sessionToken||!e.isLoggedIn))try{let e=await W(`/api/admin/settings`,{headers:G}),t=rr(e[`libraries.local_enabled`]),n=rr(e[`libraries.external_enabled`]),r=rr(e[`ytdlp.allow_downloads`]);ot(t),ct(n),ut(r),t?A(`local`):n&&A(`karaoke-nerds`)}catch(e){console.error(`Failed to load settings:`,e)}}t(),Yn()},[e.sessionToken,e.isLoggedIn,G]);async function Yn(){try{let e=await W(`/api/break-music/state`),t=Number(e.playlistIndex);mt(!!e.paused),gt(e.currentTrack||null),vt(typeof e.remainingSec==`number`?e.remainingSec:null),jt(Array.isArray(e.playlistTrackIds)?e.playlistTrackIds:[]),qt(Number.isFinite(t)?t:0),typeof e.crossfadeSeconds==`number`&&yt(e.crossfadeSeconds),typeof e.volumePercent==`number`&&xt(Math.max(0,Math.min(100,Math.round(e.volumePercent)))),typeof e.resumeDelaySec==`number`&&Ct(Math.max(0,Math.min(30,Math.round(e.resumeDelaySec)))),Vt(e.playlists||[]);let n=Number.isFinite(Number(e.activePlaylistId))?Number(e.activePlaylistId):null;Ut(n),Gt(n==null?``:String(n))}catch(e){console.error(`Failed to load break music state:`,e)}}async function Xn(t){!e.sessionToken||!e.isLoggedIn||await W(`/api/break-music/settings`,{method:`POST`,headers:G,body:JSON.stringify({crossfadeSeconds:t})})}async function Zn(t){!e.sessionToken||!e.isLoggedIn||await W(`/api/break-music/settings`,{method:`POST`,headers:G,body:JSON.stringify({volumePercent:t})})}async function Qn(t){!e.sessionToken||!e.isLoggedIn||await W(`/api/break-music/settings`,{method:`POST`,headers:G,body:JSON.stringify({resumeDelaySec:t})})}function $n(e){Gn.current&&clearTimeout(Gn.current),Gn.current=setTimeout(()=>{Zn(e),Gn.current=null},160)}async function er(t){!e.sessionToken||!e.isLoggedIn||(await W(`/api/break-music/control`,{method:`POST`,headers:G,body:JSON.stringify({action:t})}),await Yn())}async function tr(t=``){if(!e.sessionToken||!e.isLoggedIn)return console.warn(`Cannot load break music library without authentication`),[];try{let e=await W(`/api/break-music/search?q=${encodeURIComponent(t)}`,{headers:G}),n=Array.isArray(e)?e:[];return Ot(n),n}catch{return Ot([]),[]}}async function nr(){Tt(!0);let e=await tr(``),t=new Map(e.map(e=>[e.id,e])),n=At.map(e=>t.get(e)).filter(e=>!!e);kt(n),Rn.current=n}async function or(){let e=await tr(``),t=new Map(e.map(e=>[e.id,e])),n=Rn.current.map(e=>t.get(e.id)||e);kt(n),Rn.current=n}async function lr(){if(!e.sessionToken||!e.isLoggedIn||V.length===0)return;let t=Bt.find(e=>String(e.id)===Wt)?.name||``,n=window.prompt(`Save playlist as:`,t);if(n===null)return;let r=n.trim();if(!r){window.alert(`Playlist name is required.`);return}let i=await W(`/api/break-music/playlists`,{method:`POST`,headers:G,body:JSON.stringify({name:r,trackIds:V.map(e=>e.id)})});await Yn(),i?.playlistId&&Gt(String(i.playlistId))}async function ur(t){!e.sessionToken||!e.isLoggedIn||(await W(`/api/break-music/playlists/load`,{method:`POST`,headers:G,body:JSON.stringify({playlistId:t})}),Gt(String(t)),await Yn(),await or())}async function dr(t){if(!e.sessionToken||!e.isLoggedIn)return;let n=++Un.current;try{let e=await W(`/api/break-music/playlist/active`,{method:`POST`,headers:G,body:JSON.stringify({trackIds:t.map(e=>e.id)})});if(n!==Un.current)return;let r=Number(e?.playlistIndex);jt(Array.isArray(e?.trackIds)?e.trackIds:[]),qt(Number.isFinite(r)?r:0),gt(e?.currentTrack||null),await Yn()}catch(e){console.error(`Failed to sync active break playlist:`,e),n===Un.current&&(f(`⚠️ Failed to update active break playlist`),setTimeout(()=>f(``),4e3))}}function fr(e){kt(e),Rn.current=e,dr(e)}function pr(e){let t=Rn.current,n=ht!=null&&Kt>=0&&Kt<t.length&&t[Kt]?.id===ht.id?Kt+1:t.length,r=[...t];r.splice(n,0,e),fr(r)}function mr(e){let t=Rn.current;e<0||e>=t.length||fr(t.filter((t,n)=>n!==e))}function hr(){fr([])}function gr(){let e=jr;if(e.length===0)return;let t=Rn.current,n=new Set(t.map(e=>e.id)),r=e.filter(e=>!n.has(e.id));if(r.length===0)return;let i=ht!=null&&Kt>=0&&Kt<t.length&&t[Kt]?.id===ht.id?Kt+1:t.length,a=[...t];a.splice(i,0,...r),fr(a)}function _r(){let e=[...Rn.current];if(!(e.length<2)){for(let t=e.length-1;t>0;t--){let n=Math.floor(Math.random()*(t+1));[e[t],e[n]]=[e[n],e[t]]}if(ht){let t=e.findIndex(e=>e.id===ht.id);if(t>0){let[n]=e.splice(t,1);e.unshift(n)}}fr(e)}}function vr(e,t){let n=Rn.current,r=e+t;if(r<0||r>=n.length)return;let i=[...n],[a]=i.splice(e,1);i.splice(r,0,a),fr(i)}function yr(e,t){let n=Rn.current;if(e<0||e>=n.length||t<0||t>=n.length||e===t)return;let r=[...n],[i]=r.splice(e,1);r.splice(t,0,i),fr(r)}let br=(0,x.useMemo)(()=>{let e=Et.trim().toLowerCase();return e?B.filter(t=>[t.title||``,t.artist||``,t.genre||``,t.file_path||``].join(` `).toLowerCase().includes(e)):B},[B,Et]),xr=(0,x.useMemo)(()=>V.reduce((e,t)=>e+(t.duration_ms||0),0),[V]),Sr=(0,x.useMemo)(()=>ht?V[Kt]?.id===ht.id?Kt:V.findIndex(e=>e.id===ht.id):-1,[ht,V,Kt]),Cr=(0,x.useMemo)(()=>Ht==null?``:Bt.find(e=>e.id===Ht)?.name||``,[Ht,Bt]);(0,x.useEffect)(()=>{if(!wt||B.length===0)return;let e=new Map(B.map(e=>[e.id,e])),t=At.map(t=>e.get(t)).filter(e=>!!e);kt(t),Rn.current=t},[wt,At,B]),(0,x.useEffect)(()=>{if(!Xt)return;let e=e=>{zn.current?.contains(e.target)||Zt(!1)};return document.addEventListener(`mousedown`,e),()=>document.removeEventListener(`mousedown`,e)},[Xt]),(0,x.useEffect)(()=>{typeof window>`u`||window.localStorage.setItem(sr,JSON.stringify(It))},[It]);function wr(e){return!e||e<=0?`—`:ni(Math.floor(e/1e3))}function Tr(e){Lt(t=>({...t,[e]:!t[e]}))}function Er(e){return!!It[e]}function Dr(e,t){zt(n=>({...n,[e]:t}))}function Or(e){return e===`length`?{min:72,max:180}:e===`path`?{min:180,max:640}:{min:100,max:420}}function kr(e,t){t.preventDefault(),t.stopPropagation();let n=t.clientX,r=Rt[e],{min:i,max:a}=Or(e),o=t=>{let o=t.clientX-n;Dr(e,Math.min(a,Math.max(i,r+o)))},s=()=>{window.removeEventListener(`mousemove`,o),window.removeEventListener(`mouseup`,s)};window.addEventListener(`mousemove`,o),window.addEventListener(`mouseup`,s)}function Ar(e){Yt(t=>t.column===e?{column:e,direction:t.direction===`asc`?`desc`:`asc`}:{column:e,direction:`asc`})}let jr=(0,x.useMemo)(()=>{let e=[...br],t=Jt.direction===`asc`?1:-1,n=(e,t)=>(e||``).localeCompare(t||``,void 0,{sensitivity:`base`});return e.sort((e,r)=>{let i=0;return Jt.column===`song`?i=n(e.title,r.title):Jt.column===`artist`?i=n(e.artist,r.artist)||n(e.title,r.title):Jt.column===`genre`?i=n(e.genre,r.genre)||n(e.title,r.title):Jt.column===`length`?i=(e.duration_ms||0)-(r.duration_ms||0):Jt.column===`path`&&(i=n(e.file_path,r.file_path)),i*t}),e},[br,Jt]);function Mr(){let e=[];return e.push(`48px`),Er(`song`)&&e.push(`minmax(140px, ${Rt.song}px)`),Er(`artist`)&&e.push(`minmax(120px, ${Rt.artist}px)`),Er(`genre`)&&e.push(`minmax(100px, ${Rt.genre}px)`),Er(`length`)&&e.push(`${Rt.length}px`),Er(`path`)&&e.push(`minmax(180px, ${Rt.path}px)`),e.join(` `)}function Nr(e){return e.dataTransfer.types?.includes(`text/plain`)||Mt!==null||Pt!==null}function Pr(e){let t=e.dataTransfer.getData(`text/plain`),n=Number(t);return Number.isFinite(n)?n:Mt}function Fr(e){e.preventDefault();let t=Bn.current;if(!t)return;let n=t.getBoundingClientRect(),r=e=>{let t=(e.clientX-n.left)/n.width*100;$t(Math.max(35,Math.min(80,t)))},i=()=>{window.removeEventListener(`mousemove`,r),window.removeEventListener(`mouseup`,i)};window.addEventListener(`mousemove`,r),window.addEventListener(`mouseup`,i)}function Ir(){Zt(!1),Tt(!1)}(0,x.useEffect)(()=>{jn.current=_},[_]),(0,x.useEffect)(()=>{Mn.current=h,h&&(Pn.current=!1)},[h]);async function Lr(t,n){if(!(!e.sessionToken||!e.isLoggedIn))try{await W(`/api/autoplay/settings`,{method:`POST`,headers:G,body:JSON.stringify({enabled:t,delay:n})})}catch(e){console.error(`Failed to update autoplay settings:`,e)}}async function Rr(){n(await W(`/api/queue`)||[])}async function zr(){try{un(await W(`/api/queue/state`)||null)}catch(e){console.error(`Failed to load queue state:`,e)}}async function Br(e){fn(e),hn(!0),_n(!0),pn(null);try{pn(await W(`/api/singers/${e}/history`,{headers:G})||null)}catch(e){console.error(`Failed to load singer history:`,e)}finally{_n(!1)}}function Vr(){hn(!1),fn(null),pn(null)}async function Hr(t){if(Tn(null),!Sn||Sn===t||!dn){Cn(null);return}if(!e.sessionToken||!e.isLoggedIn||!H){Cn(null);return}let n=H.queuedSongs.filter(e=>e.status===`queued`),r=n.findIndex(e=>e.queueId===Sn),i=n.findIndex(e=>e.queueId===t);if(r<0||i<0){Cn(null);return}let a=[...n],[o]=a.splice(r,1);a.splice(i,0,o);try{await W(`/api/singers/${dn}/song-order`,{method:`PATCH`,headers:G,body:JSON.stringify({queueIds:a.map(e=>e.queueId)})}),await zr(),pn(await W(`/api/singers/${dn}/history`,{headers:G})||null)}catch(e){console.error(`Failed to reorder singer queue:`,e)}finally{Cn(null)}}async function Ur(t){if(!(!e.sessionToken||!e.isLoggedIn)){m(!0);try{await W(`/api/queue/${t}/status`,{method:`PATCH`,headers:G,body:JSON.stringify({status:`queued`})}),await zr(),dn&&pn(await W(`/api/singers/${dn}/history`,{headers:G})||null)}catch(e){console.error(`Failed to restore song to queue:`,e)}finally{m(!1)}}}async function Wr(t){if(!(!e.sessionToken||!e.isLoggedIn)){m(!0);try{await W(`/api/queue/${t}/status`,{method:`PATCH`,headers:G,body:JSON.stringify({status:`removed`})}),await zr(),dn&&pn(await W(`/api/singers/${dn}/history`,{headers:G})||null)}catch(e){console.error(`Failed to remove song from queue:`,e)}finally{m(!1)}}}function Gr(e){yn(e)}function Kr(){yn(null),xn(null)}function qr(e,t){e.preventDefault(),xn(t)}async function Jr(t,n){if(t.preventDefault(),xn(null),!vn||vn===n){yn(null);return}if(!e.sessionToken||!e.isLoggedIn||!ln?.activeRotation){yn(null);return}let r=ln.activeRotation.id,i=ln.queueOrder,a=i.findIndex(e=>e.singerId===vn),o=i.findIndex(e=>e.singerId===n);if(a<0||o<0){yn(null);return}let s=[...i],[c]=s.splice(a,1);s.splice(o,0,c);let l=Math.min(...i.map(e=>e.position??999));try{for(let e=0;e<s.length;e++)await W(`/api/rotations/${r}/singers/${s[e].singerId}/position`,{method:`PATCH`,headers:G,body:JSON.stringify({position:l+e})});await zr()}catch(e){console.error(`Failed to reorder singers:`,e)}finally{yn(null)}}function Yr(e){if(!e)return`Never`;let t=new Date(e),n=Date.now()-t.getTime(),r=Math.floor(n/6e4);if(r<1)return`Just now`;if(r<60)return`${r}m ago`;let i=Math.floor(r/60);return i<24?`${i}h ago`:t.toLocaleDateString()}(0,x.useEffect)(()=>{W(`/api/autoplay/settings`).then(e=>{g(e.enabled),v(e.delay)}).catch(()=>{})},[]),(0,x.useEffect)(()=>{W(`/api/overlay/settings`).then(e=>{le(e.visible),ue(e.height),fe(e.qrSize),me(e.customMessage||``),ge(e.showRoller??!0),_e(e.showQrCode??!0),ye(e.hideSingerQueue??!1)}).catch(()=>{})},[]);async function Xr(t,n,r,i,a,o,s){if(!(!e.sessionToken||!e.isLoggedIn))try{await W(`/api/overlay/settings`,{method:`POST`,headers:G,body:JSON.stringify({visible:t,height:n,qrSize:r,customMessage:i??pe,showRoller:a??he,showQrCode:o??L,hideSingerQueue:s??ve})})}catch(e){console.error(`Failed to update overlay settings:`,e)}}(0,x.useEffect)(()=>{!e.sessionToken||!e.isLoggedIn||W(`/api/rotations`,{headers:G}).then(e=>{if(e&&e.length>0){let t=e.find(e=>e.status===`active`)||e[0];tn(String(t.id)),rn(t.config?.type||t.type||`strict_round_robin`)}}).catch(e=>{console.error(`Failed to load rotation settings:`,e)})},[e.sessionToken,e.isLoggedIn,G]);async function Zr(t){if(!(!e.sessionToken||!e.isLoggedIn)){on(!0);try{let e=en;if(e)await W(`/api/rotations/${e}/config`,{method:`PATCH`,headers:G,body:JSON.stringify({type:t})});else{let n=await W(`/api/rotations`,{method:`POST`,headers:G,body:JSON.stringify({name:`Default Rotation`,config:{type:t}})});e=String(n.id),tn(e)}rn(t),await Rr(),await zr()}catch(e){console.error(`Failed to update rotation type:`,e)}finally{on(!1)}}}(0,x.useEffect)(()=>{function e(){try{En.current=new WebSocket(Hn),En.current.onmessage=e=>{try{let t=JSON.parse(e.data);t.type===`queue.updated`||t.type===`player.updated`||t.type===`player.play`||t.type===`player.next`||t.type===`player.stop`?(Rr(),zr()):t.type===`break_music.updated`?Yn():t.type===`player.timing`?(typeof t.currentTime==`number`&&(b(t.currentTime),Nn.current=Date.now()),typeof t.duration==`number`&&!isNaN(t.duration)&&isFinite(t.duration)&&t.duration>0&&(Ln.current?S(e=>{if(e===null||e===0)return t.duration;let n=Math.abs(t.duration-e)/e;return n>.1?(console.log(`Duration updated from ${e}s to ${t.duration}s (${(n*100).toFixed(1)}% change)`),t.duration):e}):(Ln.current=!0,S(t.duration)))):t.type===`autoplay.settings`&&(typeof t.enabled==`boolean`&&g(t.enabled),typeof t.delay==`number`&&v(t.delay))}catch{}},En.current.onclose=()=>{console.log(`WebSocket closed, reconnecting...`),En.current=null,In.current&&=(clearInterval(In.current),null),setTimeout(e,1e3)},En.current.onerror=e=>{console.error(`WebSocket error:`,e)},En.current.onopen=()=>{console.log(`WebSocket connected`),In.current=setInterval(()=>{En.current&&En.current.readyState===WebSocket.OPEN&&En.current.send(JSON.stringify({type:`heartbeat`}))},45e3)}}catch{setTimeout(e,1500)}}return e(),()=>{In.current&&clearInterval(In.current),En.current?.close()}},[]);let Qr=(0,x.useMemo)(()=>t.find(e=>e.status===`playing`),[t]);(0,x.useCallback)(async()=>{if(!e.sessionToken||!e.isLoggedIn)return;let n=t.find(e=>e.status===`queued`);if(n){console.log(`Autoplay: Playing next song:`,n.title),m(!0);try{await W(`/api/player/play`,{method:`POST`,headers:G,body:JSON.stringify({id:n.id})})}catch(e){console.error(`Autoplay failed:`,e)}finally{m(!1),await Rr()}}},[e.sessionToken,G,t,e.isLoggedIn]),(0,x.useEffect)(()=>{b(0),S(null),Ln.current=!1,Nn.current=0,Qr&&console.log(`Now playing:`,Qr.title)},[Qr?.id]),(0,x.useEffect)(()=>()=>{Dn.current&&clearTimeout(Dn.current),On.current&&clearInterval(On.current)},[]),(0,x.useEffect)(()=>{if(pt||_t==null||_t<=0)return;let e=setInterval(()=>{vt(e=>e==null?e:Math.max(0,e-1))},1e3);return()=>clearInterval(e)},[pt,_t]);async function $r(e){if(!e.trim()){E([]);return}try{E(k===`local`?await W(`/api/search?q=${encodeURIComponent(e)}`)||[]:await W(`/api/karaoke-nerds/search?q=${encodeURIComponent(e)}`)||[])}catch{E([])}}(0,x.useEffect)(()=>(kn.current&&clearTimeout(kn.current),kn.current=setTimeout(()=>$r(C),k===`local`?ir:ar),()=>{kn.current&&clearTimeout(kn.current)}),[C,k]),(0,x.useEffect)(()=>{if(k===`url`&&te.trim()&&!re){let e=setTimeout(async()=>{j(await oi(te))},500);return()=>clearTimeout(e)}},[te,k,re]),(0,x.useEffect)(()=>{if(R===`url`&&Ze.trim()&&!$e){let e=setTimeout(async()=>{et(await oi(Ze))},500);return()=>clearTimeout(e)}},[Ze,R,$e]);async function ei(n,r){if(!e.sessionToken||!e.isLoggedIn)return;let i=t.find(e=>e.id===n);if(i){m(!0);try{await W(`/api/queue/delete`,{method:`POST`,headers:G,body:JSON.stringify({id:n})}),await W(`/api/queue`,{method:`POST`,headers:G,body:JSON.stringify({trackId:r,requestedBy:i.requested_by})}),O(null),w(``),E([]),A(`local`)}finally{m(!1),await Rr()}}}async function ti(n,r){if(!e.sessionToken||!e.isLoggedIn)return;let i=t.find(e=>e.id===n);if(i){m(!0);try{await W(`/api/queue/delete`,{method:`POST`,headers:G,body:JSON.stringify({id:n})}),await W(`/api/karaoke-nerds/add`,{method:`POST`,headers:G,body:JSON.stringify({title:r.title,artist:r.artist,url:r.url,requestedBy:i.requested_by})}),O(null),w(``),E([]),A(`local`)}finally{m(!1),await Rr()}}}function ni(e){return!e||!isFinite(e)?`0:00`:`${Math.floor(e/60)}:${Math.floor(e%60).toString().padStart(2,`0`)}`}async function ri(e){if(!e.trim()){Je([]);return}try{R===`local`?Je(await W(`/api/search?q=${encodeURIComponent(e)}`)||[]):R===`external`&&Je(await W(`/api/karaoke-nerds/search?q=${encodeURIComponent(e)}`)||[])}catch{Je([])}}(0,x.useEffect)(()=>{if(R===`url`){Je([]);return}return An.current&&clearTimeout(An.current),An.current=setTimeout(()=>ri(Ge),R===`local`?ir:ar),()=>{An.current&&clearTimeout(An.current)}},[Ge,R]);async function ii(t){if(!(!e.sessionToken||!e.isLoggedIn)){m(!0);try{await W(`/api/queue`,{method:`POST`,headers:G,body:JSON.stringify({trackId:t,requestedBy:Ye||null})}),Ue(!1),Ke(``),Je([]),Xe(``),We(`local`)}finally{m(!1),await Rr()}}}async function ai(t){if(!(!e.sessionToken||!e.isLoggedIn)){m(!0);try{await W(`/api/karaoke-nerds/add`,{method:`POST`,headers:G,body:JSON.stringify({title:t.title,artist:t.artist,url:t.url,requestedBy:Ye||null})}),Ue(!1),Ke(``),Je([]),Xe(``),We(`local`)}finally{m(!1),await Rr()}}}async function oi(e){try{return(await W(`/api/video-metadata?url=${encodeURIComponent(e)}`)).title||e.split(`/`).pop()?.split(`?`)[0]||`Video`}catch(t){return console.error(`Failed to fetch video title:`,t),e.split(`/`).pop()?.split(`?`)[0]||`Video`}}async function si(n,r,i,a){if(!e.sessionToken||!e.isLoggedIn)return;let o=t.find(e=>e.id===n);if(o){m(!0);try{await W(`/api/queue/delete`,{method:`POST`,headers:G,body:JSON.stringify({id:n})}),await W(`/api/karaoke-nerds/add`,{method:`POST`,headers:G,body:JSON.stringify({title:i||`Video`,artist:a||`Unknown`,url:r,requestedBy:o.requested_by})}),O(null),w(``),E([]),ne(``),j(``),N(``),A(`local`)}finally{m(!1),await Rr()}}}async function ci(){if(!(!e.sessionToken||!e.isLoggedIn)&&Ze.trim()){m(!0);try{await W(`/api/karaoke-nerds/add`,{method:`POST`,headers:G,body:JSON.stringify({title:$e||`Video`,artist:tt||`Unknown`,url:Ze,requestedBy:Ye||null})}),Ue(!1),Ke(``),Je([]),Xe(``),Qe(``),et(``),nt(``),We(`local`)}finally{m(!1),await Rr()}}}async function li(t,n,r,i,a){if(!(!e.sessionToken||!e.isLoggedIn)){if(!lt){alert(`Downloads are disabled`);return}ft(`${t}`),m(!0);try{let e=await W(`/api/admin/ytdlp/download`,{method:`POST`,headers:G,body:JSON.stringify({url:t,title:n,artist:r,brand:i||null,discId:a||null})});e.ok?(f(`✔ Downloaded: ${r} - ${n}`),setTimeout(()=>f(``),5e3)):(f(`⚠️ Download failed: ${e.error||`Unknown error`}`),setTimeout(()=>f(``),5e3))}catch(e){console.error(`Download failed:`,e),f(`⚠️ Download failed: ${e.message||`Unknown error`}`),setTimeout(()=>f(``),5e3)}finally{m(!1),ft(null)}}}async function ui(){if(!(!e.sessionToken||!e.isLoggedIn)){Pn.current=!1,m(!0);try{await W(`/api/player/play`,{method:`POST`,headers:G})}finally{m(!1),await Rr()}}}async function di(){if(!(!e.sessionToken||!e.isLoggedIn)){Pn.current=!1,m(!0);try{await W(`/api/player/next`,{method:`POST`,headers:G})}finally{m(!1),await Rr()}}}async function fi(){if(!(!e.sessionToken||!e.isLoggedIn)){m(!0);try{Pn.current=!0,Fn.current=!1,Dn.current&&=(clearTimeout(Dn.current),null),On.current&&=(clearInterval(On.current),null),b(0),Nn.current=0,await W(`/api/player/stop`,{method:`POST`,headers:G})}finally{m(!1),await Rr()}}}async function pi(){if(!(!e.sessionToken||!e.isLoggedIn)&&confirm(`⚠️ Clear ALL queues?

This will remove all songs from the queue AND remove all singers from the rotation. This cannot be undone.`)){m(!0);try{if(await W(`/api/queue/clear`,{method:`POST`,headers:G}),ln?.activeRotation){let e=ln.activeRotation.id;await Promise.allSettled(ln.queueOrder.map(t=>W(`/api/rotations/${e}/singers/${t.singerId}`,{method:`DELETE`,headers:G}).catch(e=>console.error(`Failed to remove singer ${t.singerId} from rotation:`,e))))}}finally{m(!1),await Rr(),await zr()}}}async function mi(t){if(!(!e.sessionToken||!e.isLoggedIn)&&confirm(`Remove this singer from the rotation? This will also delete their sang history and cannot be undone.`)){m(!0);try{if(await W(`/api/singers/${t}/history`,{method:`DELETE`,headers:G}),ln?.activeRotation){let e=ln.activeRotation.id;await W(`/api/rotations/${e}/singers/${t}`,{method:`DELETE`,headers:G}).catch(e=>console.error(`Failed to remove singer ${t} from rotation:`,e))}await zr()}catch(e){console.error(`Failed to remove singer:`,e)}finally{m(!1)}}}let hi=ee||(Qr?.duration_ms?Qr.duration_ms/1e3:210);return(0,U.jsxs)(`div`,{className:`host-page`,children:[(0,U.jsx)(`style`,{children:`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideIn {
          from { transform: translateX(-10px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes progressPulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }

        .host-page {
          min-height: 100vh;
          padding: 16px;
          padding-bottom: env(safe-area-inset-bottom, 16px);
          animation: fadeInUp 0.5s ease;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .header {
          text-align: center;
          margin-bottom: 32px;
          animation: fadeInUp 0.6s ease;
        }

        .header-title {
          font-size: clamp(28px, 5vw, 40px);
          font-weight: 700;
          margin: 0 0 8px 0;
          background: linear-gradient(135deg, #6366f1 0%, #10b981 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          animation: fadeInUp 0.6s ease backwards;
          overflow: hidden;
        }

        .status-bar {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(99, 102, 241, 0.1));
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .banner {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.15));
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 16px;
          padding: 14px 20px;
          margin-bottom: 20px;
          font-weight: 500;
          animation: slideIn 0.3s ease;
        }

        .now-playing {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(99, 102, 241, 0.1));
          border: 1px solid rgba(16, 185, 129, 0.3);
          position: relative;
          overflow: hidden;
          }

        .progress-bar {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 100px;
          overflow: hidden;
          margin-top: 12px;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #6366f1);
          border-radius: 100px;
          transition: width 1s linear;
          position: relative;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2s ease infinite;
        }
          
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .controls-grid {
          display: grid;
          gap: 12px;
        }

        .host-top-panels {
          display: grid;
          grid-template-columns: minmax(280px, 0.9fr) minmax(360px, 1.1fr);
          gap: 16px;
          align-items: stretch;
        }

        .host-controls-card .control-btn {
          padding: 8px 10px;
          min-width: 40px;
          font-size: 16px;
          min-height: 36px;
        }

        .control-btn {
          padding: 14px;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 14px;
          color: var(--color-text-primary);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0. 3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .control-btn:hover:not(:disabled) {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }

        .control-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .control-btn. primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          color: white;
        }

        .control-btn. danger {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border: none;
          color: white;
        }

        .control-btn.success {
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          color: white;
        }

        .toggle-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .toggle {
          position: relative;
          width: 48px;
          height: 24px;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--color-bg-hover);
          transition: 0.4s;
          border-radius: 100px;
        }

        . toggle-slider::before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 4px;
          bottom: 4px;
          background: white;
          transition: 0.4s;
          border-radius: 50%;
        }

        . toggle input:checked + .toggle-slider {
          background: var(--color-success);
        }

        .toggle input:checked + .toggle-slider::before {
          transform: translateX(24px);
        }

        .queue-item {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 12px;
          transition: all 0.3s ease;
          cursor: move;
        }

        .queue-item:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          transform: translateX(4px);
        }

        . queue-item.playing {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(99, 102, 241, 0.1));
          border-color: rgba(16, 185, 129, 0.3);
        }

        .queue-item. drag-over {
          background: rgba(99, 102, 241, 0.2);
          border-color: var(--color-accent);
        }

        .queue-item-singer,
        .queue-item-title,
        .queue-item-artist {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }


        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          z-index: 999;
        }

        /* Queue item actions: desktop buttons vs mobile context menu */
        .queue-item-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .queue-item-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 0 0 auto;
        }

        .queue-item-singer {
          font-size: 0.9rem;
          font-weight: 600;
          opacity: 0.95;
          margin-bottom: 2px;
        }

        .queue-item-title {
          font-size: 1.05rem;
          font-weight: 500;
          opacity: 0.9;
          line-height: 1.2;
        }

        .queue-item-artist {
          font-size: 0.85rem;
          font-weight: 400;
          opacity: 0.7;
          margin-top: 2px;
        }

        .queue-item.playing .queue-item-title {
          color: #a5b4fc;
          font-weight: 600;
        }


        .queue-item-actions.mobile {
          display: none;
        }

        .mobile-actions-menu {
          position: relative;
        }

        .mobile-actions-menu > summary {
          list-style: none;
        }
        .mobile-actions-menu > summary::-webkit-details-marker {
          display: none;
        }

        .mobile-actions-dropdown {
          position: absolute;
          right: 0;
          bottom: calc(100% + 12px);
          display: flex;
          gap: 8px;
          padding: 10px;
          border-radius: 14px;
          border: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
          z-index: 50;
        }

        @media (max-width: 640px) {
          .queue-item-actions.desktop {
            display: none;
          }
          .queue-item-actions.mobile {
            display: flex;
            justify-content: flex-end;
          }
        }

        .modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          padding: 24px;
          z-index: 1000;
          max-width: 600px;
          width: 90%;
          max-height: 85vh;
          overflow: hidden;
          box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
        }

        .break-manager-modal {
          width: min(96vw, 1180px);
          max-width: 1180px;
          max-height: 90vh;
          height: min(90vh, 860px);
        }

        .break-manager-body {
          min-height: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .break-manager-toolbar {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }

        .break-manager-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .break-manager-layout {
          display: flex;
          min-height: 0;
          flex: 1;
          overflow: hidden;
        }

        .break-manager-panel {
          min-width: 0;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .break-manager-splitter {
          width: 10px;
          min-width: 10px;
          cursor: col-resize;
          border-radius: 8px;
          background: transparent;
          position: relative;
        }

        .break-manager-splitter::before {
          content: '';
          position: absolute;
          left: 4px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--color-border);
        }

        .break-manager-card {
          border: 1px solid var(--color-border);
          border-radius: 12px;
          background: var(--color-bg-secondary);
          min-height: 0;
        }

        .break-playlist-row {
          display: grid;
          grid-template-columns: 28px minmax(0, 1fr) auto;
          gap: 8px;
          padding: 8px 10px;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          font-size: 13px;
        }

        .break-playlist-row.dragging {
          opacity: 0.55;
        }

        .break-playlist-row.current {
          background: rgba(99, 102, 241, 0.16);
        }

        .break-table-header-cell {
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .break-table-header-sort {
          border: none;
          background: transparent;
          color: inherit;
          font: inherit;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          padding: 0;
          margin: 0;
          min-width: 0;
        }

        .break-table-header-resizer {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 12px;
          height: calc(100% + 12px);
          cursor: col-resize;
        }

        .break-columns-popover {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          z-index: 10;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          background: var(--color-bg-secondary);
          box-shadow: 0 10px 28px rgba(0,0,0,0.4);
          padding: 12px;
          min-width: 190px;
          display: grid;
          gap: 8px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-shrink: 0;
          min-width: 0;
        }

        .modal-header h3 {
          margin: 0;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }

        .search-mode-toggle {
          display: flex;
          flex-direction: row;
          gap: 8px;
          background: transparent;
          padding: 0;
          margin-bottom: 20px;
        }

        .mode-button {
          flex: 1;
          padding: 12px 16px;
          border: none;
          border-radius: 12px;
          background: var(--color-bg-secondary);
          color: var(--color-text-secondary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 1px solid var(--color-border);
        }

        .mode-button.active {
          background: linear-gradient(135deg, #6366f1, #818cf8);
          color: white;
          border-color: transparent;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }

        .mode-button.active. karaoke-nerds {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
        }

        . mode-button:not(.active):hover {
          background: var(--color-bg-hover);
          color: var(--color-text-primary);
          border-color: var(--color-accent);
        }

        .search-input {
          width: 100%;
          padding: 12px 16px;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 12px;
          color: var(--color-text-primary);
          font-size: 15px;
          outline: none;
          margin-bottom: 16px;
          box-sizing: border-box;
        }

        .search-input:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .search-results {
          flex: 1;
          overflow-y: auto;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          background: var(--color-bg-secondary);
          margin-bottom: 16px;
        }

        .search-result {
          padding: 12px 16px;
          border-bottom: 1px solid var(--color-border);
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .search-result:hover {
          background: var(--color-bg-hover);
        }

        .search-result:last-child {
          border-bottom: none;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 12px;
          color: var(--color-text-primary);
          font-size: 15px;
          outline: none;
          box-sizing: border-box;
        }

        .form-input:focus {
          border-color: var(--color-accent);
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-secondary);
          margin-bottom: 8px;
        }

        . settings-section {
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--color-border);
        }

        .settings-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .settings-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
          color: var(--color-text-primary);
        }

        .slider-control {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        . slider {
          flex: 1;
          height: 6px;
          background: var(--color-bg-secondary);
          border-radius: 3px;
          outline: none;
          -webkit-appearance: none;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: var(--color-accent);
          cursor: pointer;
          border-radius: 50%;
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: var(--color-accent);
          cursor: pointer;
          border-radius: 50%;
          border: none;
        }

        .error-msg {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          padding: 12px 16px;
          color: #fca5a5;
          margin-bottom: 16px;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--color-border);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }

        . stat-pill {
          padding: 6px 14px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 100px;
          font-size: 13px;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .host-top-panels {
            grid-template-columns: 1fr;
          }
           
          .controls-grid {
            display: flex !important;
            flex-direction: row !important;
            gap: 6px !important;
            grid-template-columns: none !important;
            justify-content: space-between !important;
            align-items: center !important;
          }

          .controls-grid .control-btn {
            width: 44px !important;
            height: 44px !important;
            min-width: 0 !important;
            padding: 0 !important;
            flex: 1 1 0 !important;
            border-radius: 10px;

            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;

            line-height: 1 !important;
          }

          .controls-grid .control-btn > * {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .break-manager-modal {
            width: 95%;
            top: 0;
            transform: translate(-50%, 0);
            max-height: 100svh;
            height: 100svh;
            border-radius: 0 0 20px 20px;
          }

          .break-manager-modal .modal-header {
            position: sticky;
            top: 0;
            z-index: 10;
            background: var(--color-bg-card);
            padding-bottom: 4px;
          }

          .break-manager-layout {
            flex-direction: column;
          }

          .break-manager-layout .break-manager-panel {
            flex: 1 1 0 !important;
          }

          .break-manager-splitter {
            display: none;
          }
        }


        /* Even smaller screens */
        @media (max-width:  480px) {
          .host-top-panels {
            gap: 12px;
          }

          .controls-grid {
            gap:  4px !important;
          }
          
          .controls-grid .control-btn {
            min-width: 40px ! important;
            width: 40px !important;
            height:  40px !important;
          }
          
          .controls-grid .control-btn span {
            font-size: 18px !important;
          }
          
          .modal { width: 95%; padding: 20px; }
        }

        /* Very small screens */
        @media (max-width: 380px) {
          .controls-grid .control-btn {
            min-width: 38px !important;
            width: 38px !important;
            height: 38px !important;
          }
          
          .controls-grid .control-btn span {
            font-size:  16px !important;
          }
        }
        }
      `}),(0,U.jsxs)(`div`,{className:`container`,children:[d&&(0,U.jsx)(`div`,{className:`banner`,children:d}),e.isLoggedIn?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{className:`header`,children:(0,U.jsx)(`h1`,{className:`header-title`,children:`Host Panel`})}),(0,U.jsxs)(`div`,{className:`host-top-panels`,children:[(0,U.jsxs)(`div`,{className:`card host-controls-card${Qr?` now-playing`:``}`,children:[Qr&&(0,U.jsxs)(`div`,{style:{marginBottom:12},children:[(0,U.jsxs)(`div`,{style:{fontWeight:700,fontSize:16,color:`#10b981`,marginBottom:2},children:[`🎤 `,Qr.title||`Unknown Title`]}),(0,U.jsxs)(`div`,{style:{color:`var(--color-text-secondary)`,fontSize:13,marginBottom:4},children:[Qr.artist||`Unknown Artist`,Qr.requested_by&&(0,U.jsxs)(`span`,{style:{marginLeft:8},children:[`· `,(0,U.jsx)(`strong`,{style:{color:`var(--color-text-primary)`},children:Qr.requested_by})]})]}),(0,U.jsx)(`div`,{className:`progress-bar`,style:{marginTop:6},children:(0,U.jsx)(`div`,{className:`progress-fill`,style:{width:`${hi>0?Math.min(100,y/hi*100):0}%`}})}),(0,U.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,marginTop:4,fontSize:12,color:`var(--color-text-secondary)`},children:[(0,U.jsx)(`span`,{children:ni(y)}),(0,U.jsx)(`span`,{children:ni(hi)})]}),h&&(0,U.jsxs)(`div`,{style:{fontSize:12,opacity:.7,marginTop:6,textAlign:`center`,padding:`4px 8px`,background:`rgba(16,185,129,0.1)`,borderRadius:6,border:`1px solid rgba(16,185,129,0.2)`},children:[`🔄 Auto-play enabled · `,_,`s delay`]})]}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:8,flexWrap:`wrap`},children:[(0,U.jsx)(`button`,{className:`control-btn success`,onClick:ui,disabled:p,title:`Play`,"aria-label":`Play`,children:`▶`}),(0,U.jsx)(`button`,{className:`control-btn primary`,onClick:di,disabled:p,title:`Next`,"aria-label":`Next`,children:`⏭`}),(0,U.jsx)(`button`,{className:`control-btn danger`,onClick:fi,disabled:p,title:`Stop`,"aria-label":`Stop`,children:`⏹`}),(0,U.jsx)(`button`,{className:`control-btn`,onClick:Rr,disabled:p,title:`Refresh`,"aria-label":`Refresh`,children:`🔄`}),(0,U.jsx)(`button`,{className:`control-btn danger`,onClick:pi,disabled:p,title:`Clear all`,"aria-label":`Clear all`,children:`🗑`}),(0,U.jsx)(`button`,{className:`control-btn`,onClick:()=>xe(!0),title:`Settings`,"aria-label":`Settings`,children:`🎛️`})]})]}),(0,U.jsxs)(`div`,{className:`card`,children:[(0,U.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,alignItems:`center`,marginBottom:12,gap:8},children:[(0,U.jsx)(`h2`,{style:{margin:0},children:`🎼 Break Music`}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:6,alignItems:`center`,flexWrap:`nowrap`},children:[(0,U.jsx)(`button`,{className:`control-btn`,title:`Manage break music library and playlist`,style:{padding:`8px 10px`,minWidth:40},onClick:nr,disabled:p,children:`🛠️`}),(0,U.jsx)(`button`,{className:`control-btn`,title:`Play previous break playlist track`,style:{padding:`8px 10px`,minWidth:40},onClick:()=>er(`previous`),disabled:p||At.length===0,children:`⏮️`}),(0,U.jsx)(`button`,{className:`control-btn`,title:pt?`Resume break music`:`Pause break music`,style:{padding:`8px 10px`,minWidth:40},onClick:()=>er(pt?`resume`:`pause`),disabled:p||!ht,children:pt?`▶️`:`⏸️`}),(0,U.jsx)(`button`,{className:`control-btn`,title:`Skip to next break playlist track`,style:{padding:`8px 10px`,minWidth:40},onClick:()=>er(`skip`),disabled:p||At.length===0,children:`⏭️`})]})]}),ht?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsxs)(`div`,{style:{marginBottom:8,fontSize:15},children:[(0,U.jsx)(`strong`,{children:ht.title}),` by `,(0,U.jsx)(`strong`,{children:ht.artist||`Unknown Artist`})]}),(0,U.jsxs)(`div`,{style:{marginBottom:10,color:`var(--color-text-secondary)`,fontSize:14},children:[`Time remaining: `,_t==null?`—`:ni(_t)]})]}):(0,U.jsx)(`div`,{style:{marginBottom:10,color:`var(--color-text-secondary)`,fontSize:14},children:`No break track selected`}),Cr&&(0,U.jsxs)(`div`,{role:`status`,"aria-live":`polite`,style:{color:`var(--color-text-secondary)`,fontSize:13,marginBottom:4},children:[`Loaded playlist: `,(0,U.jsx)(`strong`,{style:{color:`var(--color-text-primary)`},children:Cr})]}),At.length>0&&(0,U.jsxs)(`div`,{role:`status`,"aria-live":`polite`,style:{color:`var(--color-text-secondary)`,fontSize:13},children:[`Playlist tracks: `,At.length]})]})]}),(0,U.jsxs)(`div`,{className:`card`,children:[(0,U.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,alignItems:`center`,marginBottom:20,gap:12},children:[(0,U.jsx)(`h2`,{style:{margin:0},children:`🎤 Queue Order`}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:12,alignItems:`center`},children:[(0,U.jsxs)(`span`,{className:`stat-pill`,children:[ln?.queueOrder.length??0,` singers`]}),(0,U.jsxs)(`span`,{className:`stat-pill`,children:[ln?.queueOrder.reduce((e,t)=>e+t.queuedSongsCount,0)??t.filter(e=>e.status===`queued`).length,` queued`]}),(0,U.jsx)(`button`,{className:`control-btn primary`,onClick:()=>Ue(!0),disabled:p,title:`Manually add a song to the queue`,style:{padding:`8px 12px`,fontSize:`16px`,lineHeight:1},children:`➕`})]})]}),!ln||ln.queueOrder.length===0?(0,U.jsxs)(`div`,{style:{textAlign:`center`,padding:`40px 20px`,color:`var(--color-text-secondary)`},children:[(0,U.jsx)(`div`,{style:{fontSize:48,marginBottom:16,opacity:.5},children:`🎵`}),(0,U.jsx)(`div`,{children:`No singers in queue`}),(0,U.jsx)(`div`,{style:{fontSize:14,marginTop:8},children:`Songs added from the Requests page will appear here automatically`})]}):(0,U.jsx)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:10},children:[...ln.queueOrder.map(e=>({...e,isSinging:e.queuedSongs.some(e=>e.status===`playing`)}))].sort((e,t)=>e.isSinging&&!t.isSinging?-1:!e.isSinging&&t.isSinging?1:0).map((e,t)=>{let{isSinging:n}=e;return(0,U.jsx)(`div`,{draggable:!0,onDragStart:()=>Gr(e.singerId),onDragEnd:Kr,onDragOver:t=>qr(t,e.singerId),onDragLeave:()=>xn(null),onDrop:t=>Jr(t,e.singerId),style:{background:n?`rgba(16,185,129,0.12)`:bn===e.singerId?`rgba(99,102,241,0.15)`:`var(--color-bg-secondary)`,border:n?`1.5px solid rgba(16,185,129,0.6)`:bn===e.singerId?`1.5px solid var(--color-accent)`:`1px solid var(--color-border)`,borderRadius:12,padding:`14px 16px`,opacity:vn===e.singerId?.5:1,cursor:`grab`,transition:`border-color 0.15s, background 0.15s`},children:(0,U.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:12,flexWrap:`wrap`},children:[(0,U.jsx)(`span`,{style:{display:`inline-flex`,alignItems:`center`,justifyContent:`center`,width:32,height:32,borderRadius:8,background:n?`rgba(16,185,129,0.9)`:`rgba(99, 102, 241, 0.9)`,color:`white`,fontWeight:700,flex:`0 0 auto`,fontSize:14},children:n?`🎤`:t+1}),(0,U.jsxs)(`div`,{style:{flex:1,minWidth:0},children:[(0,U.jsxs)(`div`,{style:{fontWeight:700,fontSize:16,color:n?`rgba(16,185,129,1)`:`var(--color-text-primary)`,display:`flex`,alignItems:`center`,gap:8},children:[e.displayName,n&&(0,U.jsx)(`span`,{style:{fontSize:11,fontWeight:600,padding:`2px 8px`,borderRadius:99,background:`rgba(16,185,129,0.2)`,color:`rgba(16,185,129,1)`,letterSpacing:.5,textTransform:`uppercase`},children:`Now Singing`})]}),(0,U.jsx)(`div`,{style:{fontSize:13,color:`var(--color-text-secondary)`,marginTop:2},children:e.nextSong?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`strong`,{style:{color:`var(--color-text-primary)`},children:n?`Singing:`:`Next:`}),` `,e.nextSong.title||`Unknown`,` — `,e.nextSong.artist||`Unknown`]}):(0,U.jsx)(`span`,{style:{opacity:.6},children:`No queued song`})}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:16,marginTop:4,fontSize:12,color:`var(--color-text-muted)`},children:[(0,U.jsxs)(`span`,{children:[`🎵 `,e.queuedSongsCount,` queued`]}),(0,U.jsxs)(`span`,{children:[`✅ `,e.totalSongsSung,` sang`]}),e.lastSangAt&&(0,U.jsxs)(`span`,{children:[`🕐 `,Yr(e.lastSangAt)]})]})]}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:6,flex:`0 0 auto`},children:[(0,U.jsx)(`button`,{className:`control-btn`,title:`View singer queue and history`,onClick:()=>Br(e.singerId),style:{padding:`6px 10px`,fontSize:16,lineHeight:1},children:`👁`}),(0,U.jsx)(`button`,{className:`control-btn danger`,title:`Remove singer from rotation`,disabled:p,onClick:()=>mi(e.singerId),style:{padding:`6px 10px`,fontSize:13},children:`✕`})]})]})},e.singerId)})}),!ln&&t.length>0&&(0,U.jsxs)(`div`,{style:{marginTop:16},children:[(0,U.jsx)(`div`,{style:{color:`var(--color-text-secondary)`,fontSize:13,marginBottom:8},children:`(Flat queue — singer grouping unavailable)`}),t.map(e=>(0,U.jsxs)(`div`,{className:`queue-item ${e.status===`playing`?`playing`:``}`,children:[(0,U.jsx)(`span`,{style:{fontWeight:600},children:e.requested_by}),` — `,e.title,` by `,e.artist]},e.id))]})]}),mn&&(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{className:`modal-backdrop`,onClick:Vr}),(0,U.jsxs)(`div`,{className:`modal`,style:{maxWidth:600},children:[(0,U.jsxs)(`div`,{className:`modal-header`,children:[(0,U.jsxs)(`h3`,{style:{margin:0},children:[`🎤 `,H?.singer.displayName??ln?.queueOrder.find(e=>e.singerId===dn)?.displayName??`Singer`,` — Queue & History`]}),(0,U.jsx)(`button`,{className:`control-btn`,style:{width:40,height:40,padding:0},onClick:Vr,children:`✕`})]}),gn?(0,U.jsx)(`div`,{style:{textAlign:`center`,padding:`32px 0`,color:`var(--color-text-secondary)`},children:`Loading…`}):H?(0,U.jsxs)(`div`,{style:{flex:1,overflowY:`auto`,minHeight:0,display:`flex`,flexDirection:`column`,gap:16},children:[(0,U.jsxs)(`div`,{style:{display:`flex`,gap:16,flexWrap:`wrap`},children:[(0,U.jsxs)(`span`,{className:`stat-pill`,children:[`🎵 `,H.singer.totalSongsSung,` songs sung`]}),H.singer.lastSangAt&&(0,U.jsxs)(`span`,{className:`stat-pill`,children:[`🕐 Last: `,Yr(H.singer.lastSangAt)]}),(0,U.jsx)(`span`,{className:`stat-pill`,style:{background:`rgba(99,102,241,0.15)`,color:`var(--color-accent)`},children:H.singer.status})]}),(0,U.jsxs)(`div`,{children:[(0,U.jsxs)(`div`,{style:{fontWeight:600,marginBottom:8,color:`var(--color-text-secondary)`,textTransform:`uppercase`,fontSize:11,letterSpacing:1},children:[`Queue (`,H.queuedSongs.length,`)`,H.queuedSongs.filter(e=>e.status===`queued`).length>1&&(0,U.jsx)(`span`,{style:{fontWeight:400,fontSize:10,marginLeft:8,opacity:.7},children:`drag to reorder`})]}),H.queuedSongs.length===0?(0,U.jsx)(`div`,{style:{color:`var(--color-text-muted)`,fontSize:13,padding:`8px 0`,opacity:.7},children:`No songs queued`}):(0,U.jsx)(`table`,{style:{width:`100%`,borderCollapse:`collapse`,fontSize:13},children:(0,U.jsx)(`tbody`,{children:(()=>{let e=H.queuedSongs.filter(e=>e.status===`queued`),t=new Map(e.map((e,t)=>[e.queueId,t]));return H.queuedSongs.map((e,n)=>{let r=e.status===`queued`;return t.get(e.queueId),(0,U.jsxs)(`tr`,{draggable:r,onDragStart:()=>r&&Cn(e.queueId),onDragEnd:()=>Cn(null),onDragOver:t=>{r&&(t.preventDefault(),Tn(e.queueId))},onDragLeave:()=>Tn(null),onDrop:()=>Hr(e.queueId),style:{background:wn===e.queueId?`rgba(99,102,241,0.15)`:`var(--color-bg-secondary)`,opacity:Sn===e.queueId?.4:1,cursor:r?`grab`:`default`,transition:`background 0.15s`},children:[(0,U.jsx)(`td`,{style:{padding:`8px 10px`,width:32,textAlign:`center`,borderBottom:`1px solid var(--color-border)`},children:(0,U.jsx)(`span`,{style:{background:`rgba(99,102,241,0.9)`,color:`white`,borderRadius:6,width:22,height:22,display:`inline-flex`,alignItems:`center`,justifyContent:`center`,fontSize:11,fontWeight:700},children:n+1})}),(0,U.jsxs)(`td`,{style:{padding:`8px 6px`,borderBottom:`1px solid var(--color-border)`},children:[(0,U.jsx)(`div`,{style:{fontWeight:600,color:`var(--color-text-primary)`},children:e.title||`Unknown`}),(0,U.jsx)(`div`,{style:{fontSize:12,color:`var(--color-text-secondary)`},children:e.artist||`Unknown`})]}),(0,U.jsx)(`td`,{style:{padding:`8px 6px`,textAlign:`center`,whiteSpace:`nowrap`,borderBottom:`1px solid var(--color-border)`},children:e.keyAdjustment!==0&&(0,U.jsxs)(`span`,{style:{fontSize:11,color:`var(--color-text-muted)`},title:`Key adjustment`,children:[`🎵`,e.keyAdjustment>0?`+`:``,e.keyAdjustment]})}),(0,U.jsx)(`td`,{style:{padding:`8px 6px`,textAlign:`center`,borderBottom:`1px solid var(--color-border)`},children:(0,U.jsx)(`span`,{style:{padding:`2px 8px`,borderRadius:100,fontSize:11,background:e.status===`playing`?`rgba(16,185,129,0.2)`:`rgba(99,102,241,0.15)`,color:e.status===`playing`?`#10b981`:`var(--color-accent)`},title:e.status===`playing`?`Playing`:`Queued`,children:e.status===`playing`?`▶`:`🎵`})}),(0,U.jsx)(`td`,{style:{padding:`8px 6px`,textAlign:`center`,width:36,borderBottom:`1px solid var(--color-border)`},children:e.status===`queued`&&(0,U.jsx)(`button`,{onClick:()=>Wr(e.queueId),title:`Remove song from queue`,style:{background:`rgba(239,68,68,0.15)`,color:`#ef4444`,border:`1px solid rgba(239,68,68,0.3)`,borderRadius:6,cursor:`pointer`,padding:`4px 8px`,fontSize:13,lineHeight:1},children:`✕`})})]},e.queueId)})})()})})]}),H.completedSongs.length>0&&(0,U.jsxs)(`div`,{children:[(0,U.jsxs)(`div`,{style:{fontWeight:600,marginBottom:8,color:`var(--color-text-secondary)`,textTransform:`uppercase`,fontSize:11,letterSpacing:1},children:[`Sang History (`,H.completedSongs.length,`)`]}),(0,U.jsx)(`table`,{style:{width:`100%`,borderCollapse:`collapse`,fontSize:13},children:(0,U.jsx)(`tbody`,{children:H.completedSongs.map(e=>(0,U.jsxs)(`tr`,{style:{background:`var(--color-bg-secondary)`},children:[(0,U.jsxs)(`td`,{style:{padding:`8px 10px`,borderBottom:`1px solid var(--color-border)`},children:[(0,U.jsx)(`div`,{style:{fontWeight:600,color:`var(--color-text-primary)`},children:e.title||`Unknown`}),(0,U.jsx)(`div`,{style:{fontSize:12,color:`var(--color-text-secondary)`},children:e.artist||`Unknown`})]}),(0,U.jsx)(`td`,{style:{padding:`8px 6px`,textAlign:`center`,whiteSpace:`nowrap`,borderBottom:`1px solid var(--color-border)`},children:e.completedAt&&(0,U.jsxs)(`span`,{style:{fontSize:11,color:`var(--color-text-muted)`},title:`Completed ${Yr(e.completedAt)}`,children:[`🕐 `,Yr(e.completedAt)]})}),(0,U.jsx)(`td`,{style:{padding:`8px 6px`,textAlign:`center`,width:36,borderBottom:`1px solid var(--color-border)`},children:(0,U.jsx)(`span`,{style:{padding:`2px 8px`,borderRadius:100,fontSize:11,background:`rgba(16,185,129,0.15)`,color:`#10b981`},title:`Completed`,children:`✅`})}),(0,U.jsx)(`td`,{style:{padding:`8px 6px`,textAlign:`center`,width:36,borderBottom:`1px solid var(--color-border)`},children:(0,U.jsx)(`button`,{className:`control-btn`,style:{fontSize:14,padding:`4px 8px`,lineHeight:1},disabled:p,onClick:()=>Ur(e.queueId),title:`Return this song to the queue`,children:`↩`})})]},e.queueId))})})]}),(H.skippedSongs.length>0||H.removedSongs.length>0)&&(0,U.jsxs)(`div`,{children:[(0,U.jsx)(`div`,{style:{fontWeight:600,marginBottom:8,color:`var(--color-text-secondary)`,textTransform:`uppercase`,fontSize:11,letterSpacing:1},children:`Skipped / Removed`}),(0,U.jsx)(`table`,{style:{width:`100%`,borderCollapse:`collapse`,fontSize:13,opacity:.7},children:(0,U.jsx)(`tbody`,{children:[...H.skippedSongs,...H.removedSongs].map(e=>(0,U.jsxs)(`tr`,{style:{background:`var(--color-bg-secondary)`},children:[(0,U.jsxs)(`td`,{style:{padding:`8px 10px`,borderBottom:`1px solid var(--color-border)`},children:[(0,U.jsx)(`div`,{style:{fontWeight:600,color:`var(--color-text-primary)`},children:e.title||`Unknown`}),(0,U.jsx)(`div`,{style:{fontSize:12,color:`var(--color-text-secondary)`},children:e.artist||`Unknown`})]}),(0,U.jsx)(`td`,{style:{padding:`8px 6px`,textAlign:`center`,width:36,borderBottom:`1px solid var(--color-border)`},children:(0,U.jsx)(`span`,{style:{padding:`2px 8px`,borderRadius:100,fontSize:11,background:`rgba(239,68,68,0.15)`,color:`#ef4444`},title:e.status===`skipped`?`Skipped`:`Removed`,children:e.status===`skipped`?`⏭`:`✕`})})]},e.queueId))})})]}),H.completedSongs.length===0&&H.skippedSongs.length===0&&H.removedSongs.length===0&&(0,U.jsx)(`div`,{style:{color:`var(--color-text-secondary)`,textAlign:`center`,padding:`10px 0`},children:`No sang history on record for this singer.`})]}):(0,U.jsx)(`div`,{style:{color:`var(--color-text-secondary)`,textAlign:`center`,padding:`20px 0`},children:`Could not load singer history.`})]})]}),Se&&(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{className:`modal-backdrop`,onClick:()=>Ce(!1)}),(0,U.jsxs)(`div`,{className:`modal`,style:{maxWidth:560},children:[(0,U.jsxs)(`div`,{className:`modal-header`,children:[(0,U.jsx)(`h3`,{style:{margin:0},children:`🔐 Account Settings`}),(0,U.jsx)(`button`,{className:`control-btn`,style:{width:40,height:40,padding:0},onClick:()=>Ce(!1),children:`✕`})]}),e.isDefaultPassword&&(0,U.jsx)(`div`,{className:`banner`,style:{marginBottom:16},children:`⚠️ You are using the default password. Please change it for security.`}),(0,U.jsx)(`p`,{style:{color:`var(--color-text-secondary)`,marginBottom:20,fontSize:14},children:`Change your username and password.`}),!Pe&&!we&&(0,U.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,gap:12,marginBottom:20},children:[(0,U.jsxs)(`button`,{className:`control-btn`,style:{minWidth:180,justifyContent:`center`,flex:1},onClick:()=>Fe(!0),children:[(0,U.jsx)(`span`,{children:`👤`}),` Change Username`]}),(0,U.jsxs)(`button`,{className:`control-btn`,style:{minWidth:180,justifyContent:`center`,flex:1},onClick:()=>Te(!0),children:[(0,U.jsx)(`span`,{children:`🔒`}),` Change Password`]})]}),Pe&&(0,U.jsxs)(`form`,{onSubmit:Jn,style:{display:`flex`,flexDirection:`column`,gap:12,background:`var(--color-bg-secondary)`,padding:16,borderRadius:12,border:`1px solid var(--color-border)`,marginBottom:20},children:[(0,U.jsxs)(`div`,{className:`form-group`,style:{marginBottom:0},children:[(0,U.jsx)(`label`,{className:`form-label`,children:`New Username`}),(0,U.jsx)(`input`,{className:`form-input`,type:`text`,value:Ie,onChange:e=>Le(e.target.value),placeholder:`Enter new username (min 3 characters)`,autoComplete:`username`,required:!0,minLength:3})]}),(0,U.jsxs)(`div`,{className:`form-group`,style:{marginBottom:0},children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Current Password (to confirm)`}),(0,U.jsx)(`input`,{className:`form-input`,type:`password`,value:Re,onChange:e=>ze(e.target.value),placeholder:`Enter current password`,autoComplete:`current-password`,required:!0})]}),Be&&(0,U.jsx)(`div`,{className:`error-msg`,style:{marginBottom:0},children:Be}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:8},children:[(0,U.jsxs)(`button`,{className:`control-btn success`,type:`submit`,disabled:p,children:[(0,U.jsx)(`span`,{children:`✓`}),` Change Username`]}),(0,U.jsx)(`button`,{type:`button`,className:`control-btn`,onClick:()=>{Fe(!1),Le(``),ze(``),Ve(``)},children:`Cancel`})]})]}),we&&(0,U.jsxs)(`form`,{onSubmit:qn,style:{display:`flex`,flexDirection:`column`,gap:12,background:`var(--color-bg-secondary)`,padding:16,borderRadius:12,border:`1px solid var(--color-border)`},children:[(0,U.jsxs)(`div`,{className:`form-group`,style:{marginBottom:0},children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Current Password`}),(0,U.jsx)(`input`,{className:`form-input`,type:`password`,value:Ee,onChange:e=>De(e.target.value),placeholder:`Enter current password`,autoComplete:`current-password`,required:!0})]}),(0,U.jsxs)(`div`,{className:`form-group`,style:{marginBottom:0},children:[(0,U.jsx)(`label`,{className:`form-label`,children:`New Password`}),(0,U.jsx)(`input`,{className:`form-input`,type:`password`,value:Oe,onChange:e=>ke(e.target.value),placeholder:`Enter new password (min 8 characters)`,autoComplete:`new-password`,required:!0,minLength:8})]}),(0,U.jsxs)(`div`,{className:`form-group`,style:{marginBottom:0},children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Confirm New Password`}),(0,U.jsx)(`input`,{className:`form-input`,type:`password`,value:Ae,onChange:e=>je(e.target.value),placeholder:`Confirm new password`,autoComplete:`new-password`,required:!0})]}),Me&&(0,U.jsx)(`div`,{className:`error-msg`,style:{marginBottom:0},children:Me}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:8},children:[(0,U.jsxs)(`button`,{className:`control-btn success`,type:`submit`,disabled:p,children:[(0,U.jsx)(`span`,{children:`✓`}),` Change Password`]}),(0,U.jsx)(`button`,{type:`button`,className:`control-btn`,onClick:()=>{Te(!1),De(``),ke(``),je(``),Ne(``)},children:`Cancel`})]})]})]})]}),be&&(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{className:`modal-backdrop`,onClick:()=>xe(!1)}),(0,U.jsxs)(`div`,{className:`modal`,children:[(0,U.jsxs)(`div`,{className:`modal-header`,children:[(0,U.jsx)(`h3`,{style:{margin:0},children:`🎛️ Player Settings`}),(0,U.jsx)(`button`,{style:{background:`transparent`,border:`none`,color:`var(--color-text-secondary)`,fontSize:24,cursor:`pointer`,padding:`4px`,display:`flex`,alignItems:`center`,justifyContent:`center`,width:`32px`,height:`32px`,borderRadius:`8px`,transition:`all 0.3s ease`},onMouseEnter:e=>e.currentTarget.style.background=`var(--color-bg-hover)`,onMouseLeave:e=>e.currentTarget.style.background=`transparent`,onClick:()=>xe(!1),children:`✕`})]}),(0,U.jsxs)(`div`,{style:{flex:1,overflowY:`auto`,minHeight:0},children:[(0,U.jsxs)(`div`,{className:`settings-section`,children:[(0,U.jsx)(`div`,{className:`settings-title`,children:`Auto-play Settings`}),(0,U.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,justifyContent:`space-between`,padding:`12px 0`,marginBottom:h?`16px`:`0`},children:[(0,U.jsx)(`span`,{style:{fontSize:`15px`,fontWeight:`500`},children:`Auto-play`}),(0,U.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`12px`},children:[(0,U.jsxs)(`label`,{style:{position:`relative`,display:`inline-block`,width:`48px`,height:`24px`},children:[(0,U.jsx)(`input`,{type:`checkbox`,checked:h,onChange:e=>{let t=e.target.checked;g(t),Lr(t,_)},style:{opacity:0,width:0,height:0}}),(0,U.jsx)(`span`,{style:{position:`absolute`,cursor:`pointer`,top:0,left:0,right:0,bottom:0,backgroundColor:h?`#10b981`:`#374151`,transition:`. 4s`,borderRadius:`34px`},children:(0,U.jsx)(`span`,{style:{position:`absolute`,content:``,height:`16px`,width:`16px`,left:h?`28px`:`4px`,bottom:`4px`,backgroundColor:`white`,transition:`.4s`,borderRadius:`50%`}})})]}),(0,U.jsx)(`span`,{style:{color:h?`var(--color-success)`:`var(--color-text-secondary)`,fontSize:`14px`,fontWeight:`500`,minWidth:`60px`},children:h?`Enabled`:`Disabled`})]})]}),h&&(0,U.jsxs)(`div`,{style:{padding:`16px`,background:`var(--color-bg-secondary)`,borderRadius:`12px`,border:`1px solid var(--color-border)`},children:[(0,U.jsxs)(`label`,{className:`form-label`,style:{marginBottom:`12px`},children:[`Delay between songs: `,(0,U.jsx)(`strong`,{children:_}),` seconds`]}),(0,U.jsxs)(`div`,{className:`slider-control`,children:[(0,U.jsx)(`span`,{style:{fontSize:`12px`,color:`var(--color-text-secondary)`},children:`0s`}),(0,U.jsx)(`input`,{type:`range`,className:`slider`,value:_,onChange:e=>{v(parseInt(e.target.value))},onMouseUp:()=>Lr(h,_),onTouchEnd:()=>Lr(h,_),min:`0`,max:`60`,style:{margin:`0 12px`,flex:1}}),(0,U.jsx)(`span`,{style:{fontSize:`12px`,color:`var(--color-text-secondary)`},children:`60s`}),(0,U.jsxs)(`span`,{style:{minWidth:`50px`,textAlign:`center`,padding:`4px 8px`,background:`var(--color-bg-primary)`,borderRadius:`6px`,fontSize:`13px`,fontWeight:`600`,marginLeft:`12px`},children:[_,`s`]})]})]})]}),(0,U.jsxs)(`div`,{className:`settings-section`,children:[(0,U.jsx)(`div`,{className:`settings-title`,children:`Break Music Crossfade`}),(0,U.jsxs)(`div`,{style:{padding:`16px`,background:`var(--color-bg-secondary)`,borderRadius:`12px`,border:`1px solid var(--color-border)`},children:[(0,U.jsxs)(`label`,{className:`form-label`,style:{marginBottom:`12px`},children:[`Crossfade: `,(0,U.jsx)(`strong`,{children:z}),` seconds`]}),(0,U.jsxs)(`div`,{className:`slider-control`,children:[(0,U.jsx)(`span`,{style:{fontSize:`12px`,color:`var(--color-text-secondary)`},children:`0s`}),(0,U.jsx)(`input`,{type:`range`,className:`slider`,value:z,min:`0`,max:`15`,onChange:e=>yt(parseInt(e.target.value)),onMouseUp:()=>Xn(z),onTouchEnd:()=>Xn(z),style:{margin:`0 12px`,flex:1}}),(0,U.jsx)(`span`,{style:{fontSize:`12px`,color:`var(--color-text-secondary)`},children:`15s`}),(0,U.jsxs)(`span`,{style:{minWidth:`50px`,textAlign:`center`,padding:`4px 8px`,background:`var(--color-bg-primary)`,borderRadius:`6px`,fontSize:`13px`,fontWeight:`600`,marginLeft:`12px`},children:[z,`s`]})]})]})]}),(0,U.jsxs)(`div`,{className:`settings-section`,children:[(0,U.jsx)(`div`,{className:`settings-title`,children:`Break Music Volume`}),(0,U.jsxs)(`div`,{style:{padding:`16px`,background:`var(--color-bg-secondary)`,borderRadius:`12px`,border:`1px solid var(--color-border)`},children:[(0,U.jsxs)(`label`,{className:`form-label`,style:{marginBottom:`12px`},children:[`Volume: `,(0,U.jsxs)(`strong`,{children:[bt,`%`]})]}),(0,U.jsxs)(`div`,{className:`slider-control`,children:[(0,U.jsx)(`span`,{style:{fontSize:`12px`,color:`var(--color-text-secondary)`},children:`0%`}),(0,U.jsx)(`input`,{type:`range`,className:`slider`,value:bt,min:`0`,max:`100`,onChange:e=>{let t=parseInt(e.target.value);xt(t),$n(t)},style:{margin:`0 12px`,flex:1}}),(0,U.jsx)(`span`,{style:{fontSize:`12px`,color:`var(--color-text-secondary)`},children:`100%`}),(0,U.jsxs)(`span`,{style:{minWidth:`50px`,textAlign:`center`,padding:`4px 8px`,background:`var(--color-bg-primary)`,borderRadius:`6px`,fontSize:`13px`,fontWeight:`600`,marginLeft:`12px`},children:[bt,`%`]})]})]})]}),(0,U.jsxs)(`div`,{className:`settings-section`,children:[(0,U.jsx)(`div`,{className:`settings-title`,children:`Break Music Resume Delay`}),(0,U.jsxs)(`div`,{style:{padding:`16px`,background:`var(--color-bg-secondary)`,borderRadius:`12px`,border:`1px solid var(--color-border)`},children:[(0,U.jsxs)(`label`,{className:`form-label`,style:{marginBottom:`12px`},children:[`Delay after karaoke ends before resuming break music: `,(0,U.jsx)(`strong`,{children:St}),` seconds`]}),(0,U.jsxs)(`div`,{className:`slider-control`,children:[(0,U.jsx)(`span`,{style:{fontSize:`12px`,color:`var(--color-text-secondary)`},children:`0s`}),(0,U.jsx)(`input`,{type:`range`,className:`slider`,value:St,min:`0`,max:`30`,onChange:e=>Ct(parseInt(e.target.value)),onMouseUp:()=>Qn(St),onTouchEnd:()=>Qn(St),style:{margin:`0 12px`,flex:1}}),(0,U.jsx)(`span`,{style:{fontSize:`12px`,color:`var(--color-text-secondary)`},children:`30s`}),(0,U.jsxs)(`span`,{style:{minWidth:`50px`,textAlign:`center`,padding:`4px 8px`,background:`var(--color-bg-primary)`,borderRadius:`6px`,fontSize:`13px`,fontWeight:`600`,marginLeft:`12px`},children:[St,`s`]})]})]})]}),(0,U.jsxs)(`div`,{className:`settings-section`,children:[(0,U.jsx)(`div`,{className:`settings-title`,children:`Overlay Settings`}),(0,U.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,justifyContent:`space-between`,padding:`12px 0`,marginBottom:F?`16px`:`0`},children:[(0,U.jsx)(`span`,{style:{fontSize:`15px`,fontWeight:`500`},children:`Show Overlay`}),(0,U.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`12px`},children:[(0,U.jsxs)(`label`,{style:{position:`relative`,display:`inline-block`,width:`48px`,height:`24px`},children:[(0,U.jsx)(`input`,{type:`checkbox`,checked:F,onChange:e=>{let t=e.target.checked;le(t),Xr(t,I,de)},style:{opacity:0,width:0,height:0}}),(0,U.jsx)(`span`,{style:{position:`absolute`,cursor:`pointer`,top:0,left:0,right:0,bottom:0,backgroundColor:F?`#10b981`:`#374151`,transition:`.4s`,borderRadius:`34px`},children:(0,U.jsx)(`span`,{style:{position:`absolute`,content:``,height:`16px`,width:`16px`,left:F?`28px`:`4px`,bottom:`4px`,backgroundColor:`white`,transition:`.4s`,borderRadius:`50%`}})})]}),(0,U.jsx)(`span`,{style:{color:F?`var(--color-success)`:`var(--color-text-secondary)`,fontSize:`14px`,fontWeight:`500`,minWidth:`60px`},children:F?`Visible`:`Hidden`})]})]}),F&&(0,U.jsxs)(`div`,{style:{padding:`16px`,background:`var(--color-bg-secondary)`,borderRadius:`12px`,border:`1px solid var(--color-border)`},children:[(0,U.jsxs)(`div`,{style:{marginBottom:`20px`},children:[(0,U.jsxs)(`label`,{className:`form-label`,style:{marginBottom:`12px`},children:[`Overlay Height: `,(0,U.jsxs)(`strong`,{children:[I,`px`]})]}),(0,U.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`12px`},children:[(0,U.jsx)(`span`,{style:{fontSize:`12px`,color:`var(--color-text-secondary)`},children:`40px`}),(0,U.jsx)(`input`,{type:`range`,value:I,onChange:e=>ue(parseInt(e.target.value)),onMouseUp:()=>Xr(F,I,de),onTouchEnd:()=>Xr(F,I,de),min:`40`,max:`150`,style:{flex:1,height:`6px`,background:`var(--color-bg-primary)`,borderRadius:`3px`,outline:`none`,WebkitAppearance:`none`}}),(0,U.jsx)(`span`,{style:{fontSize:`12px`,color:`var(--color-text-secondary)`},children:`150px`}),(0,U.jsxs)(`span`,{style:{minWidth:`50px`,textAlign:`center`,padding:`4px 8px`,background:`var(--color-bg-primary)`,borderRadius:`6px`,fontSize:`13px`,fontWeight:`600`},children:[I,`px`]})]})]}),(0,U.jsxs)(`div`,{children:[(0,U.jsxs)(`label`,{className:`form-label`,style:{marginBottom:`12px`},children:[`QR Code Size: `,(0,U.jsxs)(`strong`,{children:[de,`px`]})]}),(0,U.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`12px`},children:[(0,U.jsx)(`span`,{style:{fontSize:`12px`,color:`var(--color-text-secondary)`},children:`40px`}),(0,U.jsx)(`input`,{type:`range`,value:de,onChange:e=>fe(parseInt(e.target.value)),onMouseUp:()=>Xr(F,I,de),onTouchEnd:()=>Xr(F,I,de),min:`40`,max:`150`,style:{flex:1,height:`6px`,background:`var(--color-bg-primary)`,borderRadius:`3px`,outline:`none`,WebkitAppearance:`none`}}),(0,U.jsx)(`span`,{style:{fontSize:`12px`,color:`var(--color-text-secondary)`},children:`150px`}),(0,U.jsxs)(`span`,{style:{minWidth:`50px`,textAlign:`center`,padding:`4px 8px`,background:`var(--color-bg-primary)`,borderRadius:`6px`,fontSize:`13px`,fontWeight:`600`},children:[de,`px`]})]})]}),(0,U.jsxs)(`div`,{style:{marginTop:`20px`,display:`flex`,flexDirection:`column`,gap:`12px`},children:[(0,U.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,justifyContent:`space-between`},children:[(0,U.jsx)(`span`,{style:{fontSize:`14px`,fontWeight:`500`},children:`Show Roller`}),(0,U.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`12px`},children:[(0,U.jsxs)(`label`,{style:{position:`relative`,display:`inline-block`,width:`48px`,height:`24px`},children:[(0,U.jsx)(`input`,{type:`checkbox`,checked:he,onChange:e=>{let t=e.target.checked;ge(t),Xr(F,I,de,void 0,t,L)},style:{opacity:0,width:0,height:0}}),(0,U.jsx)(`span`,{style:{position:`absolute`,cursor:`pointer`,top:0,left:0,right:0,bottom:0,backgroundColor:he?`#10b981`:`#374151`,transition:`.4s`,borderRadius:`34px`},children:(0,U.jsx)(`span`,{style:{position:`absolute`,height:`16px`,width:`16px`,left:he?`28px`:`4px`,bottom:`4px`,backgroundColor:`white`,transition:`.4s`,borderRadius:`50%`}})})]}),(0,U.jsx)(`span`,{style:{color:he?`var(--color-success)`:`var(--color-text-secondary)`,fontSize:`14px`,fontWeight:`500`,minWidth:`60px`},children:he?`Visible`:`Hidden`})]})]}),(0,U.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,justifyContent:`space-between`},children:[(0,U.jsx)(`span`,{style:{fontSize:`14px`,fontWeight:`500`},children:`Show QR Code`}),(0,U.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`12px`},children:[(0,U.jsxs)(`label`,{style:{position:`relative`,display:`inline-block`,width:`48px`,height:`24px`},children:[(0,U.jsx)(`input`,{type:`checkbox`,checked:L,onChange:e=>{let t=e.target.checked;_e(t),Xr(F,I,de,void 0,he,t)},style:{opacity:0,width:0,height:0}}),(0,U.jsx)(`span`,{style:{position:`absolute`,cursor:`pointer`,top:0,left:0,right:0,bottom:0,backgroundColor:L?`#10b981`:`#374151`,transition:`.4s`,borderRadius:`34px`},children:(0,U.jsx)(`span`,{style:{position:`absolute`,height:`16px`,width:`16px`,left:L?`28px`:`4px`,bottom:`4px`,backgroundColor:`white`,transition:`.4s`,borderRadius:`50%`}})})]}),(0,U.jsx)(`span`,{style:{color:L?`var(--color-success)`:`var(--color-text-secondary)`,fontSize:`14px`,fontWeight:`500`,minWidth:`60px`},children:L?`Visible`:`Hidden`})]})]})]})]})]}),F&&(0,U.jsxs)(`div`,{className:`settings-section`,children:[(0,U.jsx)(`div`,{className:`settings-title`,children:`Custom Message`}),(0,U.jsx)(`input`,{type:`text`,className:`form-input`,placeholder:`Enter custom message for overlay...`,value:pe,onChange:e=>me(e.target.value),onBlur:()=>Xr(F,I,de,pe),onKeyDown:e=>{e.key===`Enter`&&Xr(F,I,de,pe)},style:{marginBottom:pe?`12px`:`0`}}),pe&&(0,U.jsx)(`button`,{className:`control-btn`,style:{background:`transparent`,border:`1px solid var(--color-border)`,padding:`8px 16px`,fontSize:`13px`},onClick:()=>{me(``),Xr(F,I,de,``)},children:`Clear Message`})]}),(0,U.jsxs)(`div`,{className:`settings-section`,children:[(0,U.jsx)(`div`,{className:`settings-title`,children:`Queue Display`}),(0,U.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,justifyContent:`space-between`,padding:`12px 0`},children:[(0,U.jsxs)(`div`,{children:[(0,U.jsx)(`span`,{style:{fontSize:`15px`,fontWeight:`500`},children:`Hide Singer's Queued Songs`}),(0,U.jsx)(`div`,{style:{fontSize:`12px`,color:`var(--color-text-secondary)`,marginTop:`2px`},children:`Show the singer's name but hide the song titles they've queued`})]}),(0,U.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`12px`,flexShrink:0,marginLeft:`16px`},children:[(0,U.jsxs)(`label`,{style:{position:`relative`,display:`inline-block`,width:`48px`,height:`24px`},children:[(0,U.jsx)(`input`,{type:`checkbox`,checked:ve,onChange:e=>{let t=e.target.checked;ye(t),Xr(F,I,de,void 0,he,L,t)},style:{opacity:0,width:0,height:0}}),(0,U.jsx)(`span`,{style:{position:`absolute`,cursor:`pointer`,top:0,left:0,right:0,bottom:0,backgroundColor:ve?`#10b981`:`#374151`,transition:`.4s`,borderRadius:`34px`},children:(0,U.jsx)(`span`,{style:{position:`absolute`,height:`16px`,width:`16px`,left:ve?`28px`:`4px`,bottom:`4px`,backgroundColor:`white`,transition:`.4s`,borderRadius:`50%`}})})]}),(0,U.jsx)(`span`,{style:{color:ve?`var(--color-success)`:`var(--color-text-secondary)`,fontSize:`14px`,fontWeight:`500`,minWidth:`60px`},children:ve?`Hidden`:`Visible`})]})]})]}),(0,U.jsxs)(`div`,{className:`settings-section`,children:[(0,U.jsx)(`div`,{className:`settings-title`,children:`Rotation Settings`}),(0,U.jsxs)(`div`,{style:{padding:`16px`,background:`var(--color-bg-secondary)`,borderRadius:`12px`,border:`1px solid var(--color-border)`},children:[(0,U.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`8px`,marginBottom:`12px`},children:[(0,U.jsx)(`label`,{className:`form-label`,style:{marginBottom:0,flex:1},children:`Rotation Type`}),(0,U.jsx)(`button`,{title:`Learn about rotation types`,onClick:()=>cn(e=>!e),style:{background:`transparent`,border:`1px solid var(--color-border)`,borderRadius:`50%`,width:`22px`,height:`22px`,cursor:`pointer`,color:`var(--color-text-secondary)`,fontSize:`12px`,display:`flex`,alignItems:`center`,justifyContent:`center`,flexShrink:0},children:`ℹ`})]}),sn&&(0,U.jsx)(`div`,{style:{marginBottom:`14px`,padding:`12px`,background:`var(--color-bg-primary)`,borderRadius:`8px`,border:`1px solid var(--color-border)`,fontSize:`13px`,color:`var(--color-text-secondary)`,lineHeight:`1.6`},children:(0,U.jsxs)(`ul`,{style:{margin:0,paddingLeft:`16px`},children:[(0,U.jsxs)(`li`,{style:{marginBottom:`6px`},children:[(0,U.jsx)(`strong`,{style:{color:`var(--color-text-primary)`},children:`Strict Round Robin`}),` — Each singer gets exactly one turn per round, cycling through in position order.`]}),(0,U.jsxs)(`li`,{style:{marginBottom:`6px`},children:[(0,U.jsx)(`strong`,{style:{color:`var(--color-text-primary)`},children:`Least Recently Sung`}),` — The singer who has waited the longest since their last song goes next.`]}),(0,U.jsxs)(`li`,{style:{marginBottom:`6px`},children:[(0,U.jsx)(`strong`,{style:{color:`var(--color-text-primary)`},children:`Signup Order`}),` — Singers perform in the order they joined the rotation list.`]}),(0,U.jsxs)(`li`,{style:{marginBottom:`6px`},children:[(0,U.jsx)(`strong`,{style:{color:`var(--color-text-primary)`},children:`Song Queue Only`}),` — Songs play in the order they were requested, ignoring singer fairness.`]}),(0,U.jsxs)(`li`,{style:{marginBottom:`6px`},children:[(0,U.jsx)(`strong`,{style:{color:`var(--color-text-primary)`},children:`Manual`}),` — You (the host) pick who goes next each time.`]}),(0,U.jsxs)(`li`,{children:[(0,U.jsx)(`strong`,{style:{color:`var(--color-text-primary)`},children:`Hybrid`}),` — Round-robin base with host override priority support.`]})]})}),(0,U.jsxs)(`select`,{className:`form-input`,value:nn,disabled:an,onChange:e=>Zr(e.target.value),style:{marginBottom:0},children:[(0,U.jsx)(`option`,{value:`strict_round_robin`,children:`Strict Round Robin`}),(0,U.jsx)(`option`,{value:`least_recently_sung`,children:`Least Recently Sung`}),(0,U.jsx)(`option`,{value:`signup_order`,children:`Signup Order`}),(0,U.jsx)(`option`,{value:`song_queue_only`,children:`Song Queue Only`}),(0,U.jsx)(`option`,{value:`manual`,children:`Manual`}),(0,U.jsx)(`option`,{value:`hybrid`,children:`Hybrid`})]}),an&&(0,U.jsx)(`p`,{style:{margin:`8px 0 0`,fontSize:`13px`,color:`var(--color-text-secondary)`},children:`Saving…`})]})]})]}),(0,U.jsx)(`button`,{className:`control-btn primary`,style:{width:`100%`,marginTop:`8px`,flexShrink:0},onClick:()=>xe(!1),children:`Done`})]})]}),wt&&(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{className:`modal-backdrop`,onClick:Ir}),(0,U.jsxs)(`div`,{className:`modal break-manager-modal`,children:[(0,U.jsxs)(`div`,{className:`modal-header`,children:[(0,U.jsx)(`h3`,{style:{margin:0},children:`🎼 Manage Break Music`}),(0,U.jsx)(`button`,{title:`Close`,style:{border:`none`,background:`transparent`,color:`var(--color-text-secondary)`,cursor:`pointer`,fontSize:20,width:36,height:36,borderRadius:8,flexShrink:0},onClick:Ir,children:`✕`})]}),(0,U.jsxs)(`div`,{className:`break-manager-body`,children:[(0,U.jsxs)(`div`,{className:`break-manager-toolbar`,children:[(0,U.jsx)(`label`,{className:`form-label`,style:{marginBottom:6},children:`Saved Playlists`}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:8,alignItems:`center`},children:[(0,U.jsxs)(`select`,{className:`form-input`,value:Wt,onChange:e=>Gt(e.target.value),style:{flex:1,minWidth:0,marginBottom:0,padding:`10px 12px`,fontSize:13},children:[(0,U.jsx)(`option`,{value:``,children:`Select a playlist`}),Bt.map(e=>(0,U.jsx)(`option`,{value:e.id,children:e.name},e.id))]}),(0,U.jsx)(`button`,{className:`control-btn`,type:`button`,title:`Load selected playlist for break playback`,onClick:()=>Wt&&ur(Number(Wt)),disabled:!Wt,style:{padding:`10px 12px`,minWidth:44,flexShrink:0},children:`📥`}),(0,U.jsx)(`button`,{className:`control-btn`,type:`button`,title:`Save playlist`,disabled:V.length===0,onClick:lr,style:{padding:`10px 12px`,flexShrink:0},children:`💾`}),(0,U.jsx)(`button`,{className:`control-btn`,type:`button`,title:`Shuffle playlist`,disabled:V.length<2,onClick:_r,style:{padding:`10px 12px`,flexShrink:0},children:`🔀`}),(0,U.jsx)(`button`,{className:`control-btn`,type:`button`,title:`Clear playlist`,disabled:V.length===0,onClick:hr,style:{padding:`10px 12px`,flexShrink:0},children:`🗑️`})]})]}),(0,U.jsxs)(`div`,{className:`break-manager-layout`,ref:Bn,children:[(0,U.jsxs)(`div`,{className:`break-manager-panel`,style:{flex:`0 0 ${Qt}%`},children:[(0,U.jsxs)(`div`,{className:`form-group`,style:{marginBottom:12},children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Search Break Music`}),(0,U.jsx)(`input`,{className:`search-input`,placeholder:`Search break tracks...`,value:Et,onChange:e=>Dt(e.target.value),style:{marginBottom:0}})]}),(0,U.jsx)(`div`,{className:`form-group`,style:{marginTop:0,marginBottom:12},children:(0,U.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,alignItems:`center`,gap:10},children:[(0,U.jsx)(`label`,{className:`form-label`,style:{marginBottom:0},children:`Search Table`}),(0,U.jsxs)(`div`,{style:{position:`relative`},ref:zn,children:[(0,U.jsx)(`button`,{className:`control-btn`,type:`button`,onClick:()=>Zt(e=>!e),style:{padding:`8px 10px`,fontSize:12},children:`🧰 Columns`}),Xt&&(0,U.jsx)(`div`,{className:`break-columns-popover`,children:[`song`,`artist`,`genre`,`length`,`path`].map(e=>(0,U.jsxs)(`label`,{style:{display:`inline-flex`,alignItems:`center`,gap:6,fontSize:13},children:[(0,U.jsx)(`input`,{type:`checkbox`,checked:It[e],onChange:()=>Tr(e)}),e[0].toUpperCase()+e.slice(1)]},e))})]})]})}),(0,U.jsxs)(`div`,{className:`break-manager-card`,style:{flex:1,overflow:`auto`},children:[(0,U.jsxs)(`div`,{style:{display:`grid`,gridTemplateColumns:Mr(),gap:8,padding:`8px 10px`,fontSize:12,borderBottom:`1px solid var(--color-border)`,color:`var(--color-text-secondary)`,fontWeight:600},children:[(0,U.jsx)(`span`,{style:{textAlign:`center`},children:(0,U.jsx)(`button`,{title:`Add all visible tracks to playlist`,onClick:gr,disabled:jr.length===0,style:{border:`none`,background:`transparent`,color:`var(--color-text-secondary)`,cursor:`pointer`,fontSize:14,padding:0},children:`➕ All`})}),Er(`song`)&&(0,U.jsxs)(`div`,{className:`break-table-header-cell`,children:[(0,U.jsxs)(`button`,{className:`break-table-header-sort`,onClick:()=>Ar(`song`),children:[`Song`,Jt.column===`song`?Jt.direction===`asc`?` ▲`:` ▼`:``]}),(0,U.jsx)(`div`,{className:`break-table-header-resizer`,onMouseDown:e=>kr(`song`,e)})]}),Er(`artist`)&&(0,U.jsxs)(`div`,{className:`break-table-header-cell`,children:[(0,U.jsxs)(`button`,{className:`break-table-header-sort`,onClick:()=>Ar(`artist`),children:[`Artist`,Jt.column===`artist`?Jt.direction===`asc`?` ▲`:` ▼`:``]}),(0,U.jsx)(`div`,{className:`break-table-header-resizer`,onMouseDown:e=>kr(`artist`,e)})]}),Er(`genre`)&&(0,U.jsxs)(`div`,{className:`break-table-header-cell`,children:[(0,U.jsxs)(`button`,{className:`break-table-header-sort`,onClick:()=>Ar(`genre`),children:[`Genre`,Jt.column===`genre`?Jt.direction===`asc`?` ▲`:` ▼`:``]}),(0,U.jsx)(`div`,{className:`break-table-header-resizer`,onMouseDown:e=>kr(`genre`,e)})]}),Er(`length`)&&(0,U.jsxs)(`div`,{className:`break-table-header-cell`,children:[(0,U.jsxs)(`button`,{className:`break-table-header-sort`,onClick:()=>Ar(`length`),children:[`Length`,Jt.column===`length`?Jt.direction===`asc`?` ▲`:` ▼`:``]}),(0,U.jsx)(`div`,{className:`break-table-header-resizer`,onMouseDown:e=>kr(`length`,e)})]}),Er(`path`)&&(0,U.jsxs)(`div`,{className:`break-table-header-cell`,children:[(0,U.jsxs)(`button`,{className:`break-table-header-sort`,onClick:()=>Ar(`path`),children:[`Path`,Jt.column===`path`?Jt.direction===`asc`?` ▲`:` ▼`:``]}),(0,U.jsx)(`div`,{className:`break-table-header-resizer`,onMouseDown:e=>kr(`path`,e)})]})]}),jr.map(e=>(0,U.jsxs)(`div`,{draggable:!0,onDragStart:t=>{t.dataTransfer.setData(`text/plain`,String(e.id)),Ft(null),Nt(e.id)},onDragEnd:()=>Nt(null),style:{display:`grid`,gridTemplateColumns:Mr(),gap:8,padding:`8px 10px`,fontSize:13,borderBottom:`1px solid rgba(255,255,255,0.06)`,alignItems:`center`,cursor:`grab`},children:[(0,U.jsx)(`button`,{title:`Add to playlist`,onClick:()=>pr(e),style:{border:`none`,background:`transparent`,color:`var(--color-text-primary)`,cursor:`pointer`,fontSize:16},children:`➕`}),Er(`song`)&&(0,U.jsx)(`span`,{children:e.title}),Er(`artist`)&&(0,U.jsx)(`span`,{children:e.artist||`—`}),Er(`genre`)&&(0,U.jsx)(`span`,{children:e.genre||`—`}),Er(`length`)&&(0,U.jsx)(`span`,{children:wr(e.duration_ms)}),Er(`path`)&&(0,U.jsx)(`span`,{title:e.file_path,style:{overflow:`hidden`,textOverflow:`ellipsis`,whiteSpace:`nowrap`},children:e.file_path})]},e.id)),jr.length===0&&(0,U.jsx)(`div`,{style:{padding:16,color:`var(--color-text-secondary)`},children:`No tracks found`})]})]}),(0,U.jsx)(`div`,{className:`break-manager-splitter`,onMouseDown:Fr}),(0,U.jsx)(`div`,{className:`break-manager-panel`,style:{flex:`1 1 ${100-Qt}%`},children:(0,U.jsxs)(`div`,{className:`break-manager-card`,onDragOver:e=>{Nr(e)&&e.preventDefault()},onDrop:e=>{if(e.preventDefault(),Pt!==null){let e=Rn.current;if(Pt<0||Pt>=e.length)return;let t=[...e],[n]=t.splice(Pt,1);t.push(n),fr(t),Ft(null);return}let t=Pr(e);if(!t)return;let n=B.find(e=>e.id===t);n&&pr(n),Nt(null)},style:{flex:1,overflow:`auto`},children:[Cr&&(0,U.jsxs)(`div`,{style:{padding:`8px 12px`,borderBottom:`1px solid var(--color-border)`,fontSize:12,color:`var(--color-text-secondary)`},children:[`Loaded playlist: `,(0,U.jsx)(`strong`,{style:{color:`var(--color-text-primary)`},children:Cr})]}),(0,U.jsxs)(`div`,{style:{padding:`10px 12px`,borderBottom:`1px solid var(--color-border)`,fontSize:13,color:`var(--color-text-secondary)`,display:`flex`,justifyContent:`space-between`,gap:12},children:[(0,U.jsxs)(`span`,{children:[`Playlist Tracks (`,V.length,`)`]}),(0,U.jsxs)(`span`,{children:[`Total `,wr(xr)]})]}),V.map((e,t)=>{let n=Sr>=0&&t===Sr;return(0,U.jsxs)(`div`,{className:`break-playlist-row ${Pt===t?`dragging`:``} ${n?`current`:``}`,draggable:!0,onDragStart:()=>{Nt(null),Ft(t)},onDragEnd:()=>Ft(null),onDragOver:e=>{Pt!==null&&e.preventDefault()},onDrop:e=>{if(e.preventDefault(),Pt!==null){yr(Pt,t),Ft(null);return}let n=Pr(e);if(!n)return;let r=B.find(e=>e.id===n);if(!r)return;let i=[...Rn.current];i.splice(t,0,r),fr(i),Nt(null)},children:[(0,U.jsx)(`span`,{title:`Drag to reorder playlist`,style:{color:`var(--color-text-secondary)`,cursor:`grab`,fontSize:16,textAlign:`center`},children:`☰`}),(0,U.jsxs)(`div`,{style:{minWidth:0},children:[(0,U.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:8},children:[(0,U.jsx)(`div`,{style:{fontWeight:600,fontSize:13,overflow:`hidden`,textOverflow:`ellipsis`,whiteSpace:`nowrap`},children:e.title}),n&&(0,U.jsx)(`span`,{style:{fontSize:11,border:`1px solid var(--color-border-focus)`,borderRadius:999,padding:`1px 8px`,color:`var(--color-accent-hover)`},children:`Now Playing`})]}),(0,U.jsxs)(`div`,{style:{fontSize:12,color:`var(--color-text-secondary)`},children:[e.artist||`Unknown Artist`,` • `,wr(e.duration_ms)]})]}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:4},children:[(0,U.jsx)(`button`,{title:`Move up`,disabled:t===0,onClick:()=>vr(t,-1),style:{border:`none`,background:`transparent`,color:`var(--color-text-primary)`,cursor:`pointer`},children:`⬆️`}),(0,U.jsx)(`button`,{title:`Move down`,disabled:t===V.length-1,onClick:()=>vr(t,1),style:{border:`none`,background:`transparent`,color:`var(--color-text-primary)`,cursor:`pointer`},children:`⬇️`}),(0,U.jsx)(`button`,{title:`Remove from playlist`,onClick:()=>mr(t),style:{border:`none`,background:`transparent`,color:`var(--color-danger)`,cursor:`pointer`},children:`🗑️`})]})]},`${e.id}-${t}`)}),V.length===0&&(0,U.jsx)(`div`,{style:{padding:14,color:`var(--color-text-secondary)`},children:`Drag tracks from the library table here.`})]})})]})]})]})]}),D!==null&&(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{className:`modal-backdrop`,onClick:()=>{O(null),w(``),E([]),ne(``),j(``),N(``),ae(``),A(`local`)}}),(0,U.jsxs)(`div`,{className:`modal`,children:[(0,U.jsxs)(`div`,{className:`modal-header`,children:[(0,U.jsx)(`h3`,{style:{margin:0},children:`🔄 Replace Song`}),(0,U.jsx)(`button`,{style:{background:`transparent`,border:`none`,color:`var(--color-text-secondary)`,fontSize:24,cursor:`pointer`,padding:`4px`,display:`flex`,alignItems:`center`,justifyContent:`center`,width:`32px`,height:`32px`,borderRadius:`8px`,transition:`all 0.3s ease`},onMouseEnter:e=>e.currentTarget.style.background=`var(--color-bg-hover)`,onMouseLeave:e=>e.currentTarget.style.background=`transparent`,onClick:()=>{O(null),w(``),E([]),ne(``),j(``),N(``),ae(``),A(`local`)},children:`✕`})]}),(0,U.jsxs)(`div`,{className:`search-mode-toggle`,children:[at&&(0,U.jsxs)(`button`,{className:`mode-button ${k===`local`?`active`:``}`,onClick:()=>A(`local`),children:[(0,U.jsx)(`img`,{src:`https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4da.svg`,alt:`Local Library`,className:`mode-icon`,style:{width:`20px`,height:`20px`,marginRight:`6px`}}),`Local Library`]}),st&&(0,U.jsxs)(`button`,{className:`mode-button ${k===`karaoke-nerds`?`active karaoke-nerds`:``}`,onClick:()=>A(`karaoke-nerds`),children:[(0,U.jsx)(`img`,{src:`https://karaokenerds.com/Content/Icons/favicon.ico`,alt:`Karaoke Nerds`,className:`mode-icon`,style:{width:`20px`,height:`20px`,marginRight:`6px`}}),`Karaoke Nerds`]}),(0,U.jsx)(`button`,{className:`mode-button ${k===`url`?`active`:``}`,onClick:()=>A(`url`),children:`🔗 URL`})]}),k===`url`?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Video URL`}),(0,U.jsx)(`input`,{className:`form-input`,placeholder:`Enter YouTube or video URL...`,value:te,onChange:e=>ne(e.target.value),autoFocus:!0,style:{width:`100%`,boxSizing:`border-box`,marginBottom:`16px`}})]}),(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Song Title`}),(0,U.jsx)(`input`,{className:`form-input`,placeholder:`Title (auto-filled from URL)`,value:re,onChange:e=>j(e.target.value),style:{width:`100%`,boxSizing:`border-box`,marginBottom:`16px`}})]}),(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Artist Name`}),(0,U.jsx)(`input`,{className:`form-input`,placeholder:`Enter artist name...`,value:M,onChange:e=>N(e.target.value),style:{width:`100%`,boxSizing:`border-box`,marginBottom:`16px`}})]}),(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Disc ID (Optional)`}),(0,U.jsx)(`input`,{className:`form-input`,placeholder:`Enter disc ID (e.g., SC123)...`,value:ie,onChange:e=>ae(e.target.value),style:{width:`100%`,boxSizing:`border-box`,marginBottom:`16px`}})]}),(0,U.jsx)(`button`,{className:`control-btn primary`,style:{width:`100%`,marginBottom:`16px`},onClick:()=>si(D,te,re,M),disabled:p||!te.trim()||!re.trim(),children:p?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`span`,{className:`loading-spinner`}),` Replacing...`]}):`Replace with URL`}),lt&&(0,U.jsx)(`button`,{className:`control-btn success`,style:{width:`100%`,marginBottom:`16px`},onClick:()=>li(te,re,M,void 0,ie),disabled:p||!te.trim()||!re.trim()||dt===te,children:dt===te?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`span`,{className:`loading-spinner`}),` Downloading...`]}):(0,U.jsx)(U.Fragment,{children:`📥 Download to Library`})})]}):(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`input`,{className:`search-input`,placeholder:k===`local`?`Search local library...`:`Search Karaoke Nerds...`,value:C,onChange:e=>w(e.target.value),autoFocus:!0,style:{width:`100%`,boxSizing:`border-box`}}),(0,U.jsx)(`div`,{className:`search-results`,style:{minHeight:`200px`,maxHeight:`400px`,marginBottom:`16px`},children:T.length===0?(0,U.jsx)(`div`,{style:{padding:`40px 20px`,textAlign:`center`,color:`var(--color-text-secondary)`,display:`flex`,flexDirection:`column`,alignItems:`center`,justifyContent:`center`,minHeight:`200px`},children:C?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{style:{fontSize:`24px`,marginBottom:`12px`,opacity:.5},children:`🔍`}),(0,U.jsx)(`div`,{style:{fontSize:`14px`},children:k===`local`?`No local results found`:`No Karaoke Nerds results found`}),(0,U.jsx)(`div`,{style:{fontSize:`12px`,marginTop:`4px`,opacity:.7},children:`Try a different search term`})]}):(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{style:{fontSize:`32px`,marginBottom:`12px`,opacity:.3},children:`🎵`}),(0,U.jsxs)(`div`,{style:{fontSize:`14px`},children:[`Start typing to search `,k===`local`?`local library`:`Karaoke Nerds`]})]})}):(0,U.jsx)(U.Fragment,{children:k===`local`?T.map(e=>(0,U.jsxs)(`div`,{className:`search-result`,onClick:()=>ei(D,e.id),children:[(0,U.jsxs)(`div`,{style:{flex:1,minWidth:0},children:[(0,U.jsx)(`div`,{style:{fontWeight:600,overflow:`hidden`,textOverflow:`ellipsis`,whiteSpace:`nowrap`},children:e.title||`Unknown`}),(0,U.jsxs)(`div`,{style:{fontSize:13,color:`var(--color-text-secondary)`,overflow:`hidden`,textOverflow:`ellipsis`,whiteSpace:`nowrap`},children:[e.artist||`Unknown`,e.disc_id&&(0,U.jsx)(`span`,{style:{marginLeft:8,fontSize:11,padding:`1px 6px`,background:`var(--color-bg-primary)`,borderRadius:`4px`,opacity:.8},children:e.disc_id})]})]}),(0,U.jsx)(`button`,{className:`control-btn primary`,style:{padding:`6px 14px`,fontSize:`13px`,minWidth:`70px`},onClick:t=>{t.stopPropagation(),ei(D,e.id)},children:`Select`})]},e.id)):T.map((e,t)=>(0,U.jsxs)(`div`,{className:`search-result`,onClick:()=>ti(D,e),children:[(0,U.jsxs)(`div`,{style:{flex:1,minWidth:0},children:[(0,U.jsx)(`div`,{style:{fontWeight:600,overflow:`hidden`,textOverflow:`ellipsis`,whiteSpace:`nowrap`},children:e.title||`Unknown`}),(0,U.jsxs)(`div`,{style:{fontSize:13,color:`var(--color-text-secondary)`,overflow:`hidden`,textOverflow:`ellipsis`,whiteSpace:`nowrap`},children:[e.artist||`Unknown`,e.brand&&(0,U.jsx)(`span`,{style:{marginLeft:8,fontSize:11,padding:`1px 6px`,background:`linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(168, 85, 247, 0.2))`,borderRadius:`4px`,color:`#a855f7`},children:e.brand})]})]}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:8,flexShrink:0},children:[lt&&(0,U.jsxs)(`button`,{className:`control-btn`,style:{padding:`6px 14px`,fontSize:`13px`,minWidth:`70px`,background:dt===e.url?`var(--color-bg-secondary)`:`linear-gradient(135deg, #10b981, #059669)`,color:`white`},onClick:t=>{t.stopPropagation(),li(e.url,e.title,e.artist,e.brand)},disabled:p||dt===e.url,title:`Download to local library`,children:[dt===e.url?`⏳`:`📥`,` Download`]}),(0,U.jsx)(`button`,{className:`control-btn`,style:{padding:`6px 14px`,fontSize:`13px`,minWidth:`70px`,background:`linear-gradient(135deg, #7c3aed, #a855f7)`},onClick:t=>{t.stopPropagation(),ti(D,e)},children:`Select`})]})]},e.url||t))})})]}),(0,U.jsx)(`button`,{className:`control-btn`,style:{width:`100%`,background:`transparent`,border:`2px solid var(--color-border)`},onClick:()=>{O(null),w(``),E([]),ne(``),j(``),N(``),ae(``),A(`local`)},children:`Cancel`})]})]}),He&&(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{className:`modal-backdrop`,onClick:()=>{Ue(!1),Ke(``),Je([]),Xe(``),Qe(``),et(``),nt(``),it(``),We(`local`)}}),(0,U.jsxs)(`div`,{className:`modal`,children:[(0,U.jsxs)(`div`,{className:`modal-header`,children:[(0,U.jsx)(`h3`,{style:{margin:0},children:`➕ Add to Queue`}),(0,U.jsx)(`button`,{style:{background:`transparent`,border:`none`,color:`var(--color-text-secondary)`,fontSize:24,cursor:`pointer`,padding:`4px`,display:`flex`,alignItems:`center`,justifyContent:`center`,width:`32px`,height:`32px`,borderRadius:`8px`,transition:`all 0.3s ease`},onMouseEnter:e=>e.currentTarget.style.background=`var(--color-bg-hover)`,onMouseLeave:e=>e.currentTarget.style.background=`transparent`,onClick:()=>{Ue(!1),Ke(``),Je([]),Xe(``),Qe(``),et(``),nt(``),it(``),We(`local`)},children:`✕`})]}),(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Singer Name (Optional)`}),(0,U.jsx)(`input`,{className:`form-input`,list:`singer-queue-names`,placeholder:`Enter singer name...`,value:Ye,onChange:e=>Xe(e.target.value),style:{width:`100%`,boxSizing:`border-box`}}),(0,U.jsx)(`datalist`,{id:`singer-queue-names`,children:ln?.queueOrder.map(e=>(0,U.jsx)(`option`,{value:e.displayName},e.singerId))})]}),(0,U.jsxs)(`div`,{className:`search-mode-toggle`,children:[at&&(0,U.jsxs)(`button`,{className:`mode-button ${R===`local`?`active`:``}`,onClick:()=>We(`local`),children:[(0,U.jsx)(`img`,{src:`https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4da.svg`,alt:`Local Library`,className:`mode-icon`,style:{width:`20px`,height:`20px`,marginRight:`6px`}}),`Local`]}),st&&(0,U.jsxs)(`button`,{className:`mode-button ${R===`external`?`active karaoke-nerds`:``}`,onClick:()=>We(`external`),children:[(0,U.jsx)(`img`,{src:`https://karaokenerds.com/Content/Icons/favicon.ico`,alt:`Karaoke Nerds`,className:`mode-icon`,style:{width:`20px`,height:`20px`,marginRight:`6px`}}),`External`]}),(0,U.jsx)(`button`,{className:`mode-button ${R===`url`?`active`:``}`,onClick:()=>We(`url`),children:`🔗 URL`})]}),R===`url`?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Video URL`}),(0,U.jsx)(`input`,{className:`form-input`,placeholder:`Enter YouTube or video URL...`,value:Ze,onChange:e=>Qe(e.target.value),autoFocus:!0,style:{width:`100%`,boxSizing:`border-box`,marginBottom:`16px`}})]}),(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Song Title`}),(0,U.jsx)(`input`,{className:`form-input`,placeholder:`Title (auto-filled from URL)`,value:$e,onChange:e=>et(e.target.value),style:{width:`100%`,boxSizing:`border-box`,marginBottom:`16px`}})]}),(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Artist Name`}),(0,U.jsx)(`input`,{className:`form-input`,placeholder:`Enter artist name...`,value:tt,onChange:e=>nt(e.target.value),style:{width:`100%`,boxSizing:`border-box`,marginBottom:`16px`}})]}),(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Disc ID (Optional)`}),(0,U.jsx)(`input`,{className:`form-input`,placeholder:`Enter disc ID (e.g., SC123)...`,value:rt,onChange:e=>it(e.target.value),style:{width:`100%`,boxSizing:`border-box`,marginBottom:`16px`}})]}),(0,U.jsx)(`button`,{className:`control-btn primary`,style:{width:`100%`,marginBottom:`16px`},onClick:ci,disabled:p||!Ze.trim()||!$e.trim(),children:p?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`span`,{className:`loading-spinner`}),` Adding...`]}):`Add to Queue`}),lt&&(0,U.jsx)(`button`,{className:`control-btn success`,style:{width:`100%`,marginBottom:`16px`},onClick:()=>li(Ze,$e,tt,void 0,rt),disabled:p||!Ze.trim()||!$e.trim()||dt===Ze,children:dt===Ze?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`span`,{className:`loading-spinner`}),` Downloading...`]}):(0,U.jsx)(U.Fragment,{children:`📥 Download to Library`})})]}):(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`input`,{className:`search-input`,placeholder:R===`local`?`Search local library...`:`Search Karaoke Nerds...`,value:Ge,onChange:e=>Ke(e.target.value),autoFocus:!0,style:{width:`100%`,boxSizing:`border-box`}}),(0,U.jsx)(`div`,{className:`search-results`,style:{minHeight:`200px`,maxHeight:`400px`,marginBottom:`16px`},children:qe.length===0?(0,U.jsx)(`div`,{style:{padding:`40px 20px`,textAlign:`center`,color:`var(--color-text-secondary)`,display:`flex`,flexDirection:`column`,alignItems:`center`,justifyContent:`center`,minHeight:`200px`},children:Ge?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{style:{fontSize:`24px`,marginBottom:`12px`,opacity:.5},children:`🔍`}),(0,U.jsx)(`div`,{style:{fontSize:`14px`},children:R===`local`?`No local results found`:`No external results found`}),(0,U.jsx)(`div`,{style:{fontSize:`12px`,marginTop:`4px`,opacity:.7},children:`Try a different search term`})]}):(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{style:{fontSize:`32px`,marginBottom:`12px`,opacity:.3},children:`🎵`}),(0,U.jsxs)(`div`,{style:{fontSize:`14px`},children:[`Start typing to search `,R===`local`?`local library`:`external library`]})]})}):(0,U.jsx)(U.Fragment,{children:R===`local`?qe.map(e=>(0,U.jsxs)(`div`,{className:`search-result`,onClick:()=>ii(e.id),children:[(0,U.jsxs)(`div`,{style:{flex:1,minWidth:0},children:[(0,U.jsx)(`div`,{style:{fontWeight:600,overflow:`hidden`,textOverflow:`ellipsis`,whiteSpace:`nowrap`},children:e.title||`Unknown`}),(0,U.jsxs)(`div`,{style:{fontSize:13,color:`var(--color-text-secondary)`,overflow:`hidden`,textOverflow:`ellipsis`,whiteSpace:`nowrap`},children:[e.artist||`Unknown`,e.disc_id&&(0,U.jsx)(`span`,{style:{marginLeft:8,fontSize:11,padding:`1px 6px`,background:`var(--color-bg-primary)`,borderRadius:`4px`,opacity:.8},children:e.disc_id})]})]}),(0,U.jsx)(`button`,{className:`control-btn primary`,style:{padding:`6px 14px`,fontSize:`13px`,minWidth:`70px`},onClick:t=>{t.stopPropagation(),ii(e.id)},disabled:p,children:p?`...`:`Add`})]},e.id)):qe.map((e,t)=>(0,U.jsxs)(`div`,{className:`search-result`,onClick:()=>ai(e),children:[(0,U.jsxs)(`div`,{style:{flex:1,minWidth:0},children:[(0,U.jsx)(`div`,{style:{fontWeight:600,overflow:`hidden`,textOverflow:`ellipsis`,whiteSpace:`nowrap`},children:e.title||`Unknown`}),(0,U.jsxs)(`div`,{style:{fontSize:13,color:`var(--color-text-secondary)`,overflow:`hidden`,textOverflow:`ellipsis`,whiteSpace:`nowrap`},children:[e.artist||`Unknown`,e.brand&&(0,U.jsx)(`span`,{style:{marginLeft:8,fontSize:11,padding:`1px 6px`,background:`linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(168, 85, 247, 0.2))`,borderRadius:`4px`,color:`#a855f7`},children:e.brand})]})]}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:8,flexShrink:0},children:[lt&&(0,U.jsx)(`button`,{className:`control-btn`,style:{padding:`6px 14px`,fontSize:`13px`,minWidth:`90px`,background:dt===e.url?`var(--color-bg-secondary)`:`linear-gradient(135deg, #10b981, #059669)`,color:`white`},onClick:t=>{t.stopPropagation(),li(e.url,e.title,e.artist,e.brand)},disabled:p||dt===e.url,title:`Download to local library`,children:dt===e.url?`⏳ Downloading...`:`📥 Download`}),(0,U.jsx)(`button`,{className:`control-btn`,style:{padding:`6px 14px`,fontSize:`13px`,minWidth:`70px`,background:`linear-gradient(135deg, #7c3aed, #a855f7)`},onClick:t=>{t.stopPropagation(),ai(e)},disabled:p,children:p?`...`:`Add`})]})]},e.url||t))})})]}),(0,U.jsx)(`button`,{className:`control-btn`,style:{width:`100%`,background:`transparent`,border:`2px solid var(--color-border)`},onClick:()=>{Ue(!1),Ke(``),Je([]),Xe(``),Qe(``),et(``),nt(``),it(``),We(`local`)},children:`Cancel`})]})]})]}):(0,U.jsxs)(`div`,{className:`card`,style:{maxWidth:400,margin:`100px auto`,overflow:`hidden`},children:[(0,U.jsx)(`h1`,{style:{textAlign:`center`,marginBottom:32},children:`🎤 Host Login`}),l?.passwordLoginEnabled!==!1&&(0,U.jsxs)(`form`,{onSubmit:Kn,children:[(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Username`}),(0,U.jsx)(`input`,{className:`form-input`,type:`text`,value:r,onChange:e=>i(e.target.value),placeholder:`Enter host username`,autoComplete:`username`,required:!0,style:{width:`100%`,boxSizing:`border-box`}})]}),(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Password`}),(0,U.jsx)(`input`,{className:`form-input`,type:`password`,value:a,onChange:e=>o(e.target.value),placeholder:`Enter host password`,autoComplete:`current-password`,required:!0,autoFocus:!0,style:{width:`100%`,boxSizing:`border-box`}})]}),s&&(0,U.jsx)(`div`,{className:`error-msg`,children:s}),(0,U.jsx)(`button`,{className:`control-btn primary`,type:`submit`,disabled:p,style:{width:`100%`,boxSizing:`border-box`},children:p?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`span`,{className:`loading-spinner`}),` Logging in...`]}):`Login`})]}),s&&l?.passwordLoginEnabled===!1&&(0,U.jsx)(`div`,{className:`error-msg`,children:s}),l?.passwordLoginEnabled===!1&&!l?.enabled&&(0,U.jsx)(`div`,{className:`error-msg`,style:{marginBottom:16},children:`Username/password login is disabled and SSO is not enabled.`}),l?.enabled&&(0,U.jsxs)(U.Fragment,{children:[l?.passwordLoginEnabled!==!1&&(0,U.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:12,margin:`20px 0`},children:[(0,U.jsx)(`div`,{style:{flex:1,height:1,background:`rgba(255,255,255,0.1)`}}),(0,U.jsx)(`span`,{style:{color:`var(--color-text-secondary)`,fontSize:13},children:`or`}),(0,U.jsx)(`div`,{style:{flex:1,height:1,background:`rgba(255,255,255,0.1)`}})]}),(0,U.jsx)(`a`,{href:`${Vn}/api/auth/oidc/login?returnTo=%2Fhost`,className:`control-btn`,style:{width:`100%`,boxSizing:`border-box`,display:`flex`,justifyContent:`center`,textDecoration:`none`,background:l.buttonColor,border:`none`},children:l.buttonText})]}),(0,U.jsx)(`p`,{style:{marginTop:20,fontSize:13,textAlign:`center`,color:`var(--color-text-secondary)`},children:`Use the credentials configured in Admin settings`})]})]})]})}var ur=e=>e.display_name?.trim()||e.username;function dr(){let e=Wn(),[t,n]=(0,x.useState)([]),[r,i]=(0,x.useState)(``),[a,o]=(0,x.useState)(``),[s,c]=(0,x.useState)(!1),[l,u]=(0,x.useState)(null),[d,f]=(0,x.useState)(``),[p,m]=(0,x.useState)(!1),[h,g]=(0,x.useState)(`/media`),[_,v]=(0,x.useState)([]),[y,b]=(0,x.useState)(``),[ee,S]=(0,x.useState)(`library`),[C,w]=(0,x.useState)([]),[T,E]=(0,x.useState)(``),[D,O]=(0,x.useState)(``),[k,A]=(0,x.useState)(`/media/playlists`),[te,ne]=(0,x.useState)(``),[re,j]=(0,x.useState)(``),[M,N]=(0,x.useState)(``),[ie,ae]=(0,x.useState)(null),[oe,se]=(0,x.useState)(!1),[ce,P]=(0,x.useState)(!1),[F,le]=(0,x.useState)(``),[I,ue]=(0,x.useState)(``),[de,fe]=(0,x.useState)(``),[pe,me]=(0,x.useState)(``),[he,ge]=(0,x.useState)(!1),[L,_e]=(0,x.useState)(``),[ve,ye]=(0,x.useState)(``),[be,xe]=(0,x.useState)(``),[Se,Ce]=(0,x.useState)(null),[we,Te]=(0,x.useState)(!1),[Ee,De]=(0,x.useState)(`/media/downloads`),[Oe,ke]=(0,x.useState)(!0),[Ae,je]=(0,x.useState)(`local`),[Me,Ne]=(0,x.useState)(!0),[Pe,Fe]=(0,x.useState)(!0),[Ie,Le]=(0,x.useState)(!1),[Re,ze]=(0,x.useState)(!0),[Be,Ve]=(0,x.useState)(!1),[He,Ue]=(0,x.useState)(!0),[R,We]=(0,x.useState)(!0),[Ge,Ke]=(0,x.useState)(!0),[qe,Je]=(0,x.useState)([]),[Ye,Xe]=(0,x.useState)(!0),[Ze,Qe]=(0,x.useState)(!1),[$e,et]=(0,x.useState)(``),[tt,nt]=(0,x.useState)(``),[rt,it]=(0,x.useState)(`user`),[at,ot]=(0,x.useState)(``),[st,ct]=(0,x.useState)(null),[lt,ut]=(0,x.useState)(`user`),[dt,ft]=(0,x.useState)(!0),[pt,mt]=(0,x.useState)(``),[ht,gt]=(0,x.useState)(``),[_t,vt]=(0,x.useState)(!1),[z,yt]=(0,x.useState)({enabled:!1,issuer:``,clientId:``,clientSecret:``,redirectUri:``,buttonText:`Login with SSO`,buttonColor:`#6366f1`,autoCreateUsers:!0,defaultRole:`user`,passwordLoginEnabled:!0}),[bt,xt]=(0,x.useState)(!1),[St,Ct]=(0,x.useState)(!1),[wt,Tt]=(0,x.useState)(``),[Et,Dt]=(0,x.useState)(`info`),B=(0,x.useMemo)(()=>({"x-session-token":e.sessionToken,"Content-Type":`application/json`}),[e.sessionToken]);async function Ot(){n(await W(`/api/libraries`))}async function V(){!e.sessionToken||!e.isLoggedIn||w(await W(`/api/break-music/folders`,{headers:B}))}async function kt(){!e.sessionToken||!e.isLoggedIn||u(await W(`/api/admin/stats`,{headers:B}))}async function At(t){t.preventDefault(),N(``),c(!0);try{let t=await W(`/api/auth/login`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({username:te,password:re})});t.ok&&t.sessionToken?(e.setSessionToken(t.sessionToken),localStorage.setItem(`sessionToken`,t.sessionToken),e.setIsLoggedIn(!0),e.setRole(t.role||`admin`),e.setIsDefaultPassword(t.isDefaultPassword||!1),e.setProfile({username:t.username||``,displayName:t.displayName||``,picture:t.picture||``}),t.isDefaultPassword&&f(`⚠️ You are using the default password. Please change it for security.`)):N(`Invalid username or password`)}catch{N(`Login failed. Please try again.`)}finally{c(!1)}}async function jt(t){if(t.preventDefault(),me(``),I!==de){me(`Passwords do not match`);return}if(I.length<8){me(`Password must be at least 8 characters long`);return}c(!0);try{await W(`/api/auth/change-password`,{method:`POST`,headers:B,body:JSON.stringify({currentPassword:F,newPassword:I})}),f(`Password changed successfully`),P(!1),le(``),ue(``),fe(``),e.setIsDefaultPassword(!1),setTimeout(()=>f(``),3e3)}catch(e){me(e?.message||`Failed to change password`)}finally{c(!1)}}async function Mt(e){if(e.preventDefault(),xe(``),L.length<3){xe(`Username must be at least 3 characters long`);return}c(!0);try{await W(`/api/auth/change-username`,{method:`POST`,headers:B,body:JSON.stringify({currentPassword:ve,newUsername:L})}),f(`Username changed successfully`),ge(!1),_e(``),ye(``),setTimeout(()=>f(``),3e3)}catch(e){xe(e?.message||`Failed to change username`)}finally{c(!1)}}async function Nt(t){if(!(!e.sessionToken||!e.isLoggedIn)){b(``);try{v(await W(`/api/browse?path=${encodeURIComponent(t)}`,{headers:B})||[]),g(t)}catch{b(`Unable to access this directory`),v([])}}}(0,x.useEffect)(()=>{document.documentElement.style.cssText=`
      --color-bg-primary: #0a0a0f;
      --color-bg-secondary: #16161d;
      --color-bg-card: #1d1d27;
      --color-bg-hover: #252533;
      --color-accent: #6366f1;
      --color-accent-hover: #7c7ff3;
      --color-success: #10b981;
      --color-warning: #f59e0b;
      --color-danger: #ef4444;
      --color-text-primary: #ffffff;
      --color-text-secondary: #a1a1aa;
      --color-text-muted: #71717a;
      --color-border: rgba(255, 255, 255, 0.08);
      --color-border-focus: rgba(99, 102, 241, 0.5);
    `,document.body.style.cssText=`
      background: linear-gradient(135deg, #0a0a0f 0%, #16161d 100%);
      color: #ffffff;
      margin: 0;
      padding: 0;
      min-height: 100vh;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    `,Ot();let t=localStorage.getItem(`sessionToken`);t&&(e.setSessionToken(t),W(`/api/auth/validate`,{headers:{"x-session-token":t}}).then(t=>{t.valid?(e.setIsLoggedIn(!0),e.setRole(t.role||`admin`),e.setProfile({username:t.username||``,displayName:t.displayName||``,picture:t.picture||``}),kt()):(e.setIsLoggedIn(!1),e.clearProfile(),localStorage.removeItem(`sessionToken`))}).catch(()=>{e.setIsLoggedIn(!1),e.clearProfile(),localStorage.removeItem(`sessionToken`)}));let n=new URLSearchParams(window.location.search).get(`oidc_error`);n&&(N(`SSO login failed: ${decodeURIComponent(n)}`),window.history.replaceState({},``,window.location.pathname)),W(`/api/auth/oidc/config`).then(e=>ae(e)).catch(()=>{});let r=()=>{se(!0)};return window.addEventListener(`showAccountManagement`,r),()=>{document.documentElement.style.cssText=``,document.body.style.cssText=``,window.removeEventListener(`showAccountManagement`,r)}},[]);async function Pt(){if(!e.sessionToken||!e.isLoggedIn)return alert(`Please login first`);if(!r.trim())return alert(`Library name is required`);if(!a.trim())return alert(`Library path is required`);c(!0);try{await W(`/api/libraries`,{method:`POST`,headers:B,body:JSON.stringify({name:r.trim(),path:a.trim()})}),await Ot(),i(``),o(``)}finally{c(!1)}}async function Ft(t){if(!e.sessionToken||!e.isLoggedIn)return alert(`Please login first`);if(confirm(`Remove this library?  (Tracks remain until Clear DB)`)){c(!0);try{await W(`/api/libraries/${t}`,{method:`DELETE`,headers:B}),await Ot()}finally{c(!1)}}}async function It(){if(!e.sessionToken||!e.isLoggedIn)return alert(`Please login first`);if(!T.trim())return alert(`Break music folder name is required`);if(!D.trim())return alert(`Break music folder path is required`);c(!0);try{await W(`/api/break-music/folders`,{method:`POST`,headers:B,body:JSON.stringify({name:T.trim(),path:D.trim()})}),E(``),O(``),await V()}finally{c(!1)}}async function Lt(t){if(!e.sessionToken||!e.isLoggedIn)return alert(`Please login first`);if(confirm(`Remove this break music folder?`)){c(!0);try{await W(`/api/break-music/folders/${t}`,{method:`DELETE`,headers:B}),await V()}finally{c(!1)}}}async function Rt(t){if(!e.sessionToken||!e.isLoggedIn)return alert(`Please login first`);c(!0),f(`Scanning break music folders…`);try{let e={};t&&(e.folderId=t),f(`✔ Break music scan complete (${(await W(`/api/break-music/scan`,{method:`POST`,headers:B,body:JSON.stringify(e)})).indexed??0} indexed)`),setTimeout(()=>f(``),4e3)}catch(e){f(`⚠️ Break music scan failed: ${e.message}`),setTimeout(()=>f(``),5e3)}finally{c(!1)}}async function zt(){if(!e.sessionToken||!e.isLoggedIn)return alert(`Please login first`);if(confirm(`This will clear only break music tracks from the database (folders remain). Continue?`)){c(!0);try{let e=await W(`/api/break-music/clear-library`,{method:`POST`,headers:B});f(`✔ Break music DB cleared (${e.before??0}→${e.after??0} tracks)`),setTimeout(()=>f(``),4e3)}catch(e){f(`⚠️ Failed to clear break music DB: ${e.message}`),setTimeout(()=>f(``),5e3)}finally{c(!1)}}}async function Bt(){if(!e.sessionToken||!e.isLoggedIn)return alert(`Please login first`);c(!0),f(`Scanning libraries…`);try{await W(`/api/scan`,{method:`POST`,headers:B,body:JSON.stringify({})})}finally{c(!1)}}async function Vt(t){if(!e.sessionToken||!e.isLoggedIn)return alert(`Please login first`);c(!0),f(`Scanning library #${t}…`);try{await W(`/api/scan`,{method:`POST`,headers:B,body:JSON.stringify({libraryId:t})})}finally{c(!1)}}async function Ht(){if(!e.sessionToken||!e.isLoggedIn)return alert(`Please login first`);if(confirm(`This will clear queue, tracks, and artists (libraries remain). Continue?`)){c(!0);try{let e=await W(`/api/admin/clear-db`,{method:`POST`,headers:B});f(`DB cleared (artists ${e.before.artists}→${e.after.artists}, tracks ${e.before.tracks}→${e.after.tracks}, queue ${e.before.queue}→${e.after.queue})`),await kt(),setTimeout(()=>f(``),4e3)}finally{c(!1)}}}let Ut=()=>{S(`library`),m(!0),g(a||`/media`),Nt(a||`/media`)},Wt=e=>{ee===`library`?o(e):ee===`download`?De(e):ee===`breakLibrary`?O(e):ee===`breakPlaylists`&&A(e),m(!1)},Gt=()=>{Nt(h.split(`/`).slice(0,-1).join(`/`)||`/`)};async function Kt(){if(!(!e.sessionToken||!e.isLoggedIn))try{Ce((await W(`/api/admin/ytdlp/version`,{headers:B})).version)}catch(e){console.error(`Failed to fetch yt-dlp version:`,e)}}async function qt(){if(!e.sessionToken||!e.isLoggedIn)return alert(`Please login first`);Te(!0),f(`Updating yt-dlp...`);try{let e=await W(`/api/admin/ytdlp/update`,{method:`POST`,headers:B});e.success?(f(`✔ ${e.message}${e.version?` (v${e.version})`:``}`),Ce(e.version||null)):f(`⚠️ ${e.message}`),setTimeout(()=>f(``),5e3)}catch(e){f(`⚠️ Failed to update yt-dlp: ${e.message}`),setTimeout(()=>f(``),5e3)}finally{Te(!1)}}async function Jt(){if(!(!e.sessionToken||!e.isLoggedIn))try{let e=await W(`/api/admin/settings`,{headers:B});De(e[`ytdlp.download_location`]||`/media/downloads`),ke(rr(e[`admin.background_tasks_enabled`])),je(e[`requests.acceptance`]||`local`),Ne(rr(e[`libraries.local_enabled`])),Fe(rr(e[`libraries.external_enabled`])),ze(rr(e[`ytdlp.allow_downloads`])),A(e[`break_music.playlists_folder`]||`/media/playlists`),e[`admin.log_level`]&&Dt(e[`admin.log_level`])}catch(e){console.error(`Failed to load settings:`,e)}}async function Yt(t,n){if(!(!e.sessionToken||!e.isLoggedIn))try{await W(`/api/admin/settings/${t}`,{method:`PUT`,headers:B,body:JSON.stringify({value:n})})}catch(e){throw console.error(`Failed to save setting ${t}:`,e),e}}async function Xt(){try{await Yt(`ytdlp.download_location`,Ee),f(`✔ Download location updated`),setTimeout(()=>f(``),3e3)}catch(e){f(`⚠️ Failed to update download location: ${e.message}`),setTimeout(()=>f(``),5e3)}}async function Zt(){try{await Yt(`break_music.playlists_folder`,k),f(`✔ Break music playlists folder updated`),setTimeout(()=>f(``),3e3)}catch(e){f(`⚠️ Failed to update break music playlists folder: ${e.message}`),setTimeout(()=>f(``),5e3)}}async function Qt(e){ke(e);try{await Yt(`admin.background_tasks_enabled`,e),f(`✔ Background tasks ${e?`enabled`:`disabled`}`),setTimeout(()=>f(``),3e3)}catch(t){f(`⚠️ Failed to update background tasks: ${t.message}`),setTimeout(()=>f(``),5e3),ke(!e)}}async function $t(e,t){if(e===`local`){Ne(t);try{await Yt(`libraries.local_enabled`,t),f(`✔ Local library ${t?`enabled`:`disabled`}`),setTimeout(()=>f(``),3e3)}catch(e){f(`⚠️ Failed to update local library: ${e.message}`),setTimeout(()=>f(``),5e3),Ne(!t)}}else{Fe(t);try{await Yt(`libraries.external_enabled`,t),f(`✔ External library ${t?`enabled`:`disabled`}`),setTimeout(()=>f(``),3e3)}catch(e){f(`⚠️ Failed to update external library: ${e.message}`),setTimeout(()=>f(``),5e3),Fe(!t)}}}async function en(e){ze(e);try{await Yt(`ytdlp.allow_downloads`,e),f(`✔ Downloads ${e?`enabled`:`disabled`}`),setTimeout(()=>f(``),3e3)}catch(t){f(`⚠️ Failed to update downloads setting: ${t.message}`),setTimeout(()=>f(``),5e3),ze(!e)}}async function tn(e){Dt(e);try{await Yt(`admin.log_level`,e),f(`✔ Log level set to ${e}`),setTimeout(()=>f(``),3e3)}catch(e){f(`⚠️ Failed to update log level: ${e.message}`),setTimeout(()=>f(``),5e3)}}let nn=()=>{S(`download`),Ve(!0),g(Ee||`/media/downloads`),Nt(Ee||`/media/downloads`)},rn=e=>{De(e),Ve(!1)},an=()=>{S(`breakLibrary`),m(!0),g(D||`/media`),Nt(D||`/media`)},on=()=>{S(`breakPlaylists`),m(!0),g(k||`/media/playlists`),Nt(k||`/media/playlists`)};async function sn(){if(!e.sessionToken||!e.isLoggedIn)return alert(`Please login first`);c(!0),f(`Scanning download location...`);try{let e=await W(`/api/admin/ytdlp/scan`,{method:`POST`,headers:B});e.success?(f(`✔ ${e.message}`),await kt()):f(`⚠️ ${e.message}`),setTimeout(()=>f(``),5e3)}catch(e){f(`⚠️ Failed to scan download location: ${e.message}`),setTimeout(()=>f(``),5e3)}finally{c(!1)}}async function cn(){if(!(!e.sessionToken||!e.isLoggedIn||!e.isAdmin))try{Je(await W(`/api/admin/users`,{headers:B}))}catch(e){console.error(`Failed to load users:`,e)}}async function ln(e){if(e.preventDefault(),ot(``),$e.trim().length<3){ot(`Username must be at least 3 characters`);return}if(tt.length<8){ot(`Password must be at least 8 characters`);return}try{await W(`/api/admin/users`,{method:`POST`,headers:B,body:JSON.stringify({username:$e.trim(),password:tt,role:rt})}),Qe(!1),et(``),nt(``),it(`user`),await cn()}catch(e){ot(e?.message||`Failed to create user`)}}async function un(e){if(e.preventDefault(),st){if(gt(``),pt&&pt.length<8){gt(`Password must be at least 8 characters`);return}try{let e={role:lt,is_active:dt};pt&&(e.password=pt),await W(`/api/admin/users/${st.id}`,{method:`PUT`,headers:B,body:JSON.stringify(e)}),ct(null),mt(``),await cn()}catch(e){gt(e?.message||`Failed to update user`)}}}async function dn(e){let t=ur(e);if(confirm(`Delete user "${t}"? This cannot be undone.`))try{await W(`/api/admin/users/${e.id}`,{method:`DELETE`,headers:B}),await cn()}catch(e){f(`⚠️ ${e?.message||`Failed to delete user`}`),setTimeout(()=>f(``),5e3)}}async function fn(){if(!(!e.sessionToken||!e.isLoggedIn||!e.isAdmin))try{yt({...await W(`/api/admin/settings/oidc`,{headers:B}),clientSecret:``}),xt(!1)}catch(e){console.error(`Failed to load OIDC settings:`,e)}}async function H(e){e.preventDefault(),Ct(!0),Tt(``);try{let e={...z};bt||delete e.clientSecret,await W(`/api/admin/settings/oidc`,{method:`PUT`,headers:B,body:JSON.stringify(e)}),Tt(`✔ OIDC settings saved`),xt(!1),ae(await W(`/api/auth/oidc/config`)),setTimeout(()=>Tt(``),3e3)}catch(e){Tt(`⚠️ ${e?.message||`Failed to save OIDC settings`}`),setTimeout(()=>Tt(``),5e3)}finally{Ct(!1)}}return(0,x.useEffect)(()=>{e.isLoggedIn&&e.isAdmin&&(Kt(),Jt(),cn(),fn(),V())},[e.isLoggedIn,e.isAdmin]),(0,U.jsxs)(`div`,{className:`admin-page`,children:[(0,U.jsx)(`style`,{children:`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* Animations */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideIn {
          from { transform: translateX(-10px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Base */
        .admin-page {
          min-height: 100vh;
          padding: 16px;
          padding-bottom: env(safe-area-inset-bottom, 16px);
          animation: fadeInUp 0.5s ease;
        }

        . container {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Header */
        .header {
          text-align: center;
          margin-bottom: 32px;
          animation: fadeInUp 0.6s ease;
        }

        .header-title {
          font-size: clamp(28px, 5vw, 40px);
          font-weight: 700;
          margin: 0 0 8px 0;
          background: linear-gradient(135deg, #6366f1 0%, #10b981 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em;
        }

        .header-subtitle {
          color: var(--color-text-secondary);
          font-size: clamp(14px, 2. 5vw, 16px);
          margin: 0;
        }

        /* Cards */
        .card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          animation: fadeInUp 0.6s ease backwards;
          overflow: hidden;
        }

        .card:nth-child(2) { animation-delay: 0.1s; }
        .card:nth-child(3) { animation-delay: 0.2s; }
        .card:nth-child(4) { animation-delay: 0.3s; }

        /* Banner */
        .banner {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.15));
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 16px;
          padding: 14px 20px;
          margin-bottom: 20px;
          font-weight: 500;
          animation: slideIn 0.3s ease;
        }

        . banner. warning {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.15));
          border-color: rgba(245, 158, 11, 0.3);
        }

        .banner.success {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(99, 102, 241, 0.15));
          border-color: rgba(16, 185, 129, 0.3);
        }

        /* Login Card */
        .login-card {
          max-width: 400px;
          margin: 100px auto;
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .login-title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        /* Forms */
        .form-group {
          margin-bottom: 20px;
        }

        . form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-secondary);
          margin-bottom: 8px;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 12px;
          color: var(--color-text-primary);
          font-size: 15px;
          transition: all 0.3s ease;
          outline: none;
          box-sizing: border-box;
        }

        .form-input:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        /* Buttons */
        .btn {
          padding: 12px 20px;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 12px;
          color: var(--color-text-primary);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0. 3s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn:hover:not(:disabled) {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn.primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          color: white;
        }

        .btn.success {
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          color: white;
        }

        .btn.danger {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border: none;
          color: white;
        }

        .btn.ghost {
          background: transparent;
          border-color: transparent;
        }

        .btn.ghost:hover:not(:disabled) {
          background: var(--color-bg-hover);
          border-color: var(--color-border);
        }

        /* Icon-only button — compact square with a descriptive title tooltip */
        .btn-icon {
          padding: 8px;
          min-width: 36px;
          min-height: 36px;
          font-size: 18px;
          line-height: 1;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 10px;
          color: var(--color-text-primary);
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .btn-icon:hover:not(:disabled) {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
        }

        .btn-icon:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-icon.danger {
          background: linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.15));
          border-color: rgba(239,68,68,0.4);
        }

        .btn-icon.danger:hover:not(:disabled) {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border-color: #ef4444;
          color: white;
        }

        .btn-icon.primary {
          background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15));
          border-color: rgba(99,102,241,0.4);
        }

        .btn-icon.primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-color: #6366f1;
          color: white;
        }

        .btn-icon.success {
          background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.15));
          border-color: rgba(16,185,129,0.4);
        }

        .btn-icon.success:hover:not(:disabled) {
          background: linear-gradient(135deg, #10b981, #059669);
          border-color: #10b981;
          color: white;
        }

        /* Stats Pills */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        . stat-pill {
          padding: 16px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: all 0.3s ease;
        }

        .stat-pill:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          transform: translateY(-2px);
        }

        .stat-icon {
          font-size: 24px;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--color-accent);
        }

        .stat-label {
          font-size: 12px;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Library List */
        .library-list {
          display: grid;
          gap: 12px;
        }

        . library-item {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 16px;
          transition: all 0.3s ease;
          animation: fadeInUp 0.4s ease backwards;
        }

        .library-item:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          transform: translateX(4px);
        }

        .library-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          gap: 12px;
        }

        .library-info {
          flex: 1;
          min-width: 0;
        }

        .library-name {
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 4px;
        }

        .library-path {
          font-size: 13px;
          color: var(--color-text-secondary);
          font-family: 'Monaco', 'Courier New', monospace;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .library-actions {
          display: flex;
          gap: 8px;
        }

        /* Modal */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          z-index: 999;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          padding: 24px;
          z-index: 1000;
          max-width: 800px;
          width: 90%;
          max-height: 85vh;
          overflow: hidden;
          box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          animation: scaleIn 0.3s ease;
        }

        @keyframes scaleIn {
          from {
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0;
          }
          to {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        . modal-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }

        /* Browser */
        .browser-path {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          margin-bottom: 16px;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 14px;
        }

        .breadcrumb {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        . breadcrumb-sep {
          opacity: 0.3;
        }

        .breadcrumb-part {
          cursor: pointer;
          color: var(--color-accent);
          transition: all 0.2s ease;
        }

        . breadcrumb-part:hover {
          color: var(--color-accent-hover);
          text-decoration: underline;
        }

        .browser-container {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 8px;
          height: 400px;
          overflow-y: auto;
          margin-bottom: 16px;
        }

        .folder-item {
          padding: 12px 16px;
          cursor: pointer;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }

        .folder-item:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
        }

        .folder-icon {
          font-size: 20px;
        }

        . folder-name {
          flex: 1;
          font-weight: 500;
        }

        /* Error Messages */
        .error-msg {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          padding: 12px 16px;
          color: #fca5a5;
          font-size: 14px;
          margin-bottom: 16px;
        }

        /* Loading */
        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--color-border);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 48px 24px;
          color: var(--color-text-secondary);
        }

        . empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        . empty-text {
          font-size: 16px;
        }

        . empty-subtext {
          font-size: 14px;
          margin-top: 8px;
          opacity: 0.7;
        }

        /* Collapsible Card Header */
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          user-select: none;
          margin-bottom: 20px;
        }

        .card-header h2 {
          margin: 0;
          font-size: 20px;
        }

        .card-toggle {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 6px 12px;
          color: var(--color-text-secondary);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .card-toggle:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          color: var(--color-text-primary);
        }

        .card-content {
          overflow: hidden;
          transition: max-height 0.3s ease, opacity 0.3s ease;
        }

        .card-content.collapsed {
          max-height: 0;
          opacity: 0;
          pointer-events: none;
        }

        .card-content.expanded {
          max-height: none;
          opacity: 1;
        }

        .disabled-overlay {
          position: relative;
          opacity: 0.4;
          pointer-events: none;
        }

        .disabled-overlay::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--color-bg-card);
          opacity: 0.7;
          pointer-events: none;
        }

        /* User info layout — allow date to wrap on small screens */
        .user-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px 8px;
          font-size: 13px;
          color: var(--color-text-secondary);
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .user-meta-date {
          /* Allow the date string to break onto its own line */
          white-space: nowrap;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .admin-page {
            padding: 12px;
          }

          . card {
            padding: 16px;
            border-radius: 16px;
          }

          . stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .library-header {
            flex-direction: column;
          }

          .library-actions {
            width: 100%;
            margin-top: 12px;
            justify-content: flex-start;
          }

          /* On mobile keep btn-icon buttons small — do NOT stretch them */
          .btn-icon {
            flex: 0 0 auto;
          }

          .modal {
            width: 95%;
            padding: 20px;
          }
        }

        @media (max-width: 480px) {
          . stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}),(0,U.jsxs)(`div`,{className:`container`,children:[d&&(0,U.jsx)(`div`,{className:`banner ${e.isDefaultPassword?`warning`:d.includes(`✔`)?`success`:``}`,children:d}),(0,U.jsxs)(`div`,{className:`header`,children:[(0,U.jsx)(`h1`,{className:`header-title`,children:`Admin Dashboard`}),(0,U.jsx)(`p`,{className:`header-subtitle`,children:`Manage your karaoke system settings and media libraries`})]}),e.isLoggedIn?e.isAdmin?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsxs)(`div`,{className:`card`,children:[(0,U.jsx)(`h2`,{style:{margin:`0 0 20px`,fontSize:20},children:`📊 System Statistics`}),(0,U.jsxs)(`div`,{className:`stats-grid`,children:[(0,U.jsxs)(`div`,{className:`stat-pill`,children:[(0,U.jsx)(`span`,{className:`stat-icon`,children:`🎤`}),(0,U.jsx)(`span`,{className:`stat-value`,children:l?.artists??`—`}),(0,U.jsx)(`span`,{className:`stat-label`,children:`Artists`})]}),(0,U.jsxs)(`div`,{className:`stat-pill`,children:[(0,U.jsx)(`span`,{className:`stat-icon`,children:`🎵`}),(0,U.jsx)(`span`,{className:`stat-value`,children:l?.tracks??`—`}),(0,U.jsx)(`span`,{className:`stat-label`,children:`Tracks`})]}),(0,U.jsxs)(`div`,{className:`stat-pill`,children:[(0,U.jsx)(`span`,{className:`stat-icon`,children:`📋`}),(0,U.jsx)(`span`,{className:`stat-value`,children:l?.queued??`—`}),(0,U.jsx)(`span`,{className:`stat-label`,children:`Queued`})]}),(0,U.jsxs)(`div`,{className:`stat-pill`,children:[(0,U.jsx)(`span`,{className:`stat-icon`,children:`⏰`}),(0,U.jsx)(`span`,{className:`stat-value`,style:{fontSize:14},children:l?.lastScan?.finishedAt?new Date(l.lastScan.finishedAt).toLocaleDateString():`Never`}),(0,U.jsx)(`span`,{className:`stat-label`,children:`Last Scan`})]})]}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:10,flexWrap:`wrap`,marginTop:20},children:[(0,U.jsx)(`button`,{className:`btn-icon primary`,onClick:Bt,disabled:s||!e.sessionToken||!e.isLoggedIn,title:`Scan all libraries`,"aria-label":`Scan all libraries`,children:`🔍`}),(0,U.jsx)(`button`,{className:`btn-icon danger`,onClick:Ht,disabled:s||!e.sessionToken||!e.isLoggedIn,title:`Clear database`,"aria-label":`Clear database`,children:`🗑️`}),(0,U.jsx)(`button`,{className:`btn-icon`,onClick:kt,disabled:!e.sessionToken||!e.isLoggedIn,title:`Refresh stats`,"aria-label":`Refresh stats`,children:`🔄`})]})]}),(0,U.jsxs)(`div`,{className:`card`,children:[(0,U.jsxs)(`div`,{className:`card-header`,onClick:()=>Ue(!He),children:[(0,U.jsx)(`h2`,{children:`📚 Media Libraries`}),(0,U.jsx)(`button`,{className:`card-toggle`,type:`button`,children:He?`▼ Collapse`:`▶ Expand`})]}),(0,U.jsxs)(`div`,{className:`card-content ${He?`expanded`:`collapsed`}`,children:[(0,U.jsxs)(`div`,{style:{background:`var(--color-bg-secondary)`,border:`1px solid var(--color-border)`,borderRadius:12,padding:16,marginBottom:20},children:[(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Library Name`}),(0,U.jsx)(`input`,{className:`form-input`,placeholder:`e.g., Main Collection`,value:r,onChange:e=>i(e.target.value)})]}),(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Folder Path`}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:8},children:[(0,U.jsx)(`input`,{className:`form-input`,placeholder:`e.g., /media/karaoke`,value:a,onChange:e=>o(e.target.value)}),(0,U.jsx)(`button`,{className:`btn-icon`,onClick:Ut,disabled:!e.sessionToken||!e.isLoggedIn,title:`Browse folders`,"aria-label":`Browse folders`,children:`📁`})]})]}),(0,U.jsx)(`button`,{className:`btn-icon success`,onClick:Pt,disabled:s||!e.sessionToken||!e.isLoggedIn||!r.trim()||!a.trim(),title:`Add library`,"aria-label":`Add library`,children:`➕`})]}),t.length>0?(0,U.jsx)(`div`,{className:`library-list`,children:t.map((t,n)=>(0,U.jsx)(`div`,{className:`library-item`,style:{animationDelay:`${n*.05}s`},children:(0,U.jsxs)(`div`,{className:`library-header`,children:[(0,U.jsxs)(`div`,{className:`library-info`,children:[(0,U.jsx)(`div`,{className:`library-name`,children:t.name}),(0,U.jsxs)(`div`,{className:`library-path`,children:[`📁 `,t.path]})]}),(0,U.jsxs)(`div`,{className:`library-actions`,children:[(0,U.jsx)(`button`,{className:`btn-icon primary`,onClick:()=>Vt(t.id),disabled:s||!e.sessionToken||!e.isLoggedIn,title:`Scan this library`,children:`🔍`}),(0,U.jsx)(`button`,{className:`btn-icon danger`,onClick:()=>Ft(t.id),disabled:s||!e.sessionToken||!e.isLoggedIn,title:`Remove library`,children:`🗑️`})]})]})},t.id))}):(0,U.jsxs)(`div`,{className:`empty-state`,children:[(0,U.jsx)(`div`,{className:`empty-icon`,children:`📁`}),(0,U.jsx)(`div`,{className:`empty-text`,children:`No libraries configured yet`}),(0,U.jsx)(`div`,{className:`empty-subtext`,children:`Add a media library above to get started`})]})]})]}),(0,U.jsxs)(`div`,{className:`card`,children:[(0,U.jsxs)(`div`,{className:`card-header`,onClick:()=>We(!R),children:[(0,U.jsx)(`h2`,{children:`🎼 Break Music`}),(0,U.jsx)(`button`,{className:`card-toggle`,type:`button`,children:R?`▼ Collapse`:`▶ Expand`})]}),(0,U.jsxs)(`div`,{className:`card-content ${R?`expanded`:`collapsed`}`,children:[(0,U.jsxs)(`div`,{style:{background:`var(--color-bg-secondary)`,border:`1px solid var(--color-border)`,borderRadius:12,padding:16,marginBottom:20},children:[(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Break Folder Name`}),(0,U.jsx)(`input`,{className:`form-input`,placeholder:`e.g., Lobby Music`,value:T,onChange:e=>E(e.target.value)})]}),(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Break Music Folder Path`}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:8},children:[(0,U.jsx)(`input`,{className:`form-input`,placeholder:`e.g., /media/break-music`,value:D,onChange:e=>O(e.target.value)}),(0,U.jsx)(`button`,{className:`btn-icon`,onClick:an,disabled:!e.sessionToken||!e.isLoggedIn,title:`Browse folders`,"aria-label":`Browse break music folders`,children:`📁`})]})]}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:10,flexWrap:`wrap`},children:[(0,U.jsx)(`button`,{className:`btn-icon success`,onClick:It,disabled:s||!T.trim()||!D.trim(),title:`Add break music folder`,children:`➕`}),(0,U.jsx)(`button`,{className:`btn-icon primary`,onClick:()=>Rt(),disabled:s,title:`Scan all break music folders`,children:`🔍`}),(0,U.jsx)(`button`,{className:`btn-icon danger`,onClick:zt,disabled:s,title:`Clear break music tracks from database`,children:`🧹`})]})]}),(0,U.jsxs)(`div`,{style:{background:`var(--color-bg-secondary)`,border:`1px solid var(--color-border)`,borderRadius:12,padding:16,marginBottom:16},children:[(0,U.jsx)(`h3`,{style:{margin:`0 0 12px`,fontSize:16},children:`💾 Saved Playlists Folder`}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:8},children:[(0,U.jsx)(`input`,{className:`form-input`,value:k,onChange:e=>A(e.target.value),placeholder:`/media/playlists`}),(0,U.jsx)(`button`,{className:`btn-icon`,onClick:on,disabled:!e.sessionToken||!e.isLoggedIn,title:`Browse playlist folders`,children:`📁`}),(0,U.jsx)(`button`,{className:`btn-icon primary`,onClick:Zt,disabled:s||!k.trim(),title:`Save playlists folder`,children:`💾`})]})]}),C.length>0?(0,U.jsx)(`div`,{className:`library-list`,children:C.map(e=>(0,U.jsx)(`div`,{className:`library-item`,children:(0,U.jsxs)(`div`,{className:`library-header`,children:[(0,U.jsxs)(`div`,{className:`library-info`,children:[(0,U.jsx)(`div`,{className:`library-name`,children:e.name}),(0,U.jsxs)(`div`,{className:`library-path`,children:[`📁 `,e.path]})]}),(0,U.jsxs)(`div`,{className:`library-actions`,children:[(0,U.jsx)(`button`,{className:`btn-icon primary`,onClick:()=>Rt(e.id),disabled:s,title:`Scan this folder`,children:`🔍`}),(0,U.jsx)(`button`,{className:`btn-icon danger`,onClick:()=>Lt(e.id),disabled:s,title:`Remove folder`,children:`🗑️`})]})]})},e.id))}):(0,U.jsxs)(`div`,{className:`empty-state`,children:[(0,U.jsx)(`div`,{className:`empty-icon`,children:`🎼`}),(0,U.jsx)(`div`,{className:`empty-text`,children:`No break music folders configured`})]})]})]}),(0,U.jsxs)(`div`,{className:`card`,children:[(0,U.jsxs)(`div`,{className:`card-header`,onClick:()=>Ke(!Ge),children:[(0,U.jsx)(`h2`,{children:`⚙️ System Settings`}),(0,U.jsx)(`button`,{className:`card-toggle`,type:`button`,children:Ge?`▼ Collapse`:`▶ Expand`})]}),(0,U.jsxs)(`div`,{className:`card-content ${Ge?`expanded`:`collapsed`}`,children:[(0,U.jsxs)(`div`,{style:{background:`var(--color-bg-secondary)`,border:`1px solid var(--color-border)`,borderRadius:12,padding:16,marginBottom:16},children:[(0,U.jsx)(`h3`,{style:{margin:`0 0 12px`,fontSize:16},children:`📚 Library Availability & Requests`}),(0,U.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:12},children:[(0,U.jsxs)(`label`,{style:{display:`flex`,alignItems:`center`,gap:8,cursor:`pointer`},children:[(0,U.jsx)(`input`,{type:`checkbox`,checked:!Me&&!Pe,onChange:e=>{e.target.checked?($t(`local`,!1),$t(`external`,!1)):$t(`local`,!0)},disabled:!e.sessionToken||!e.isLoggedIn,style:{width:18,height:18}}),(0,U.jsx)(`span`,{style:{fontSize:14},children:`Disabled (no guest requests)`})]}),(0,U.jsxs)(`label`,{style:{display:`flex`,alignItems:`center`,gap:8,cursor:`pointer`},children:[(0,U.jsx)(`input`,{type:`checkbox`,checked:Me,onChange:e=>$t(`local`,e.target.checked),disabled:!e.sessionToken||!e.isLoggedIn,style:{width:18,height:18}}),(0,U.jsx)(`span`,{style:{fontSize:14},children:`Enable Local Library`})]}),(0,U.jsxs)(`label`,{style:{display:`flex`,alignItems:`center`,gap:8,cursor:`pointer`},children:[(0,U.jsx)(`input`,{type:`checkbox`,checked:Pe,onChange:e=>$t(`external`,e.target.checked),disabled:!e.sessionToken||!e.isLoggedIn,style:{width:18,height:18}}),(0,U.jsx)(`span`,{style:{fontSize:14},children:`Enable External Library (Karaoke Nerds)`})]})]}),(0,U.jsx)(`p`,{style:{margin:`8px 0 0`,fontSize:13,color:`var(--color-text-muted)`},children:`Control which libraries are available for searching and requesting. When both are disabled, guests cannot request songs. Host can always add songs manually.`})]}),(0,U.jsxs)(`div`,{style:{background:`var(--color-bg-secondary)`,border:`1px solid var(--color-border)`,borderRadius:12,padding:16,marginBottom:16},children:[(0,U.jsx)(`h3`,{style:{margin:`0 0 12px`,fontSize:16},children:`📥 yt-dlp Integration`}),(0,U.jsxs)(`div`,{style:{marginBottom:16},children:[(0,U.jsxs)(`label`,{style:{display:`flex`,alignItems:`center`,gap:8,cursor:`pointer`},children:[(0,U.jsx)(`input`,{type:`checkbox`,checked:Re,onChange:e=>en(e.target.checked),disabled:!e.sessionToken||!e.isLoggedIn,style:{width:18,height:18}}),(0,U.jsx)(`span`,{style:{fontSize:14,fontWeight:500},children:`Allow Downloads`})]}),(0,U.jsx)(`p`,{style:{margin:`4px 0 0 26px`,fontSize:13,color:`var(--color-text-muted)`},children:`Enable downloading of external content using yt-dlp`})]}),(0,U.jsxs)(`div`,{className:Re?``:`disabled-overlay`,children:[(0,U.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:12,marginBottom:12},children:[(0,U.jsxs)(`span`,{style:{color:`var(--color-text-secondary)`,fontSize:14},children:[`Version: `,Se||`Checking...`]}),(0,U.jsx)(`button`,{className:`btn-icon primary`,onClick:qt,disabled:we||!e.sessionToken||!e.isLoggedIn||!Re,title:we?`Updating yt-dlp`:`Update yt-dlp`,"aria-label":we?`Updating yt-dlp`:`Update yt-dlp`,"aria-busy":we,children:we?(0,U.jsx)(U.Fragment,{children:(0,U.jsx)(`span`,{className:`loading-spinner`})}):(0,U.jsx)(U.Fragment,{children:`🔄`})})]}),(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Download Location`}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:8},children:[(0,U.jsx)(`input`,{className:`form-input`,placeholder:`/media/downloads`,value:Ee,onChange:e=>De(e.target.value),disabled:!e.sessionToken||!e.isLoggedIn||!Re}),(0,U.jsx)(`button`,{className:`btn-icon`,onClick:nn,disabled:!e.sessionToken||!e.isLoggedIn||!Re,title:`Browse folders`,"aria-label":`Browse download folders`,children:`📁`}),(0,U.jsx)(`button`,{className:`btn-icon primary`,onClick:sn,disabled:!e.sessionToken||!e.isLoggedIn||!Re,title:`Scan download location for new files and remove missing ones`,"aria-label":`Scan download location`,children:`🔍`}),(0,U.jsx)(`button`,{className:`btn-icon success`,onClick:Xt,disabled:!e.sessionToken||!e.isLoggedIn||!Re,title:`Save download location`,"aria-label":`Save download location`,children:`✓`})]})]})]})]}),(0,U.jsxs)(`div`,{style:{background:`var(--color-bg-secondary)`,border:`1px solid var(--color-border)`,borderRadius:12,padding:16,marginBottom:16},children:[(0,U.jsx)(`h3`,{style:{margin:`0 0 12px`,fontSize:16},children:`🔄 Background Tasks`}),(0,U.jsx)(`div`,{style:{display:`flex`,alignItems:`center`,gap:12},children:(0,U.jsxs)(`label`,{style:{display:`flex`,alignItems:`center`,gap:8,cursor:`pointer`},children:[(0,U.jsx)(`input`,{type:`checkbox`,checked:Oe,onChange:e=>Qt(e.target.checked),disabled:!e.sessionToken||!e.isLoggedIn,style:{width:18,height:18}}),(0,U.jsx)(`span`,{style:{fontSize:14},children:`Enable duration processing task`})]})}),(0,U.jsx)(`p`,{style:{margin:`8px 0 0`,fontSize:13,color:`var(--color-text-muted)`},children:`When enabled, the server will automatically process tracks with missing durations in the background.`})]}),(0,U.jsxs)(`div`,{style:{background:`var(--color-bg-secondary)`,border:`1px solid var(--color-border)`,borderRadius:12,padding:16},children:[(0,U.jsx)(`h3`,{style:{margin:`0 0 12px`,fontSize:16},children:`📋 Server Logging`}),(0,U.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:12,flexWrap:`wrap`},children:[(0,U.jsx)(`label`,{className:`form-label`,style:{margin:0,whiteSpace:`nowrap`},children:`Log Level`}),(0,U.jsxs)(`select`,{className:`form-input`,value:Et,onChange:e=>tn(e.target.value),disabled:!e.sessionToken||!e.isLoggedIn,style:{cursor:`pointer`,maxWidth:200},children:[(0,U.jsx)(`option`,{value:`error`,children:`error`}),(0,U.jsx)(`option`,{value:`warning`,children:`warning`}),(0,U.jsx)(`option`,{value:`info`,children:`info`}),(0,U.jsx)(`option`,{value:`verbose`,children:`verbose`})]})]})]})]})]}),(0,U.jsxs)(`div`,{className:`card`,children:[(0,U.jsxs)(`div`,{className:`card-header`,onClick:()=>Xe(!Ye),children:[(0,U.jsx)(`h2`,{children:`👥 User Manager`}),(0,U.jsx)(`button`,{className:`card-toggle`,type:`button`,children:Ye?`▼ Collapse`:`▶ Expand`})]}),(0,U.jsxs)(`div`,{className:`card-content ${Ye?`expanded`:`collapsed`}`,children:[(0,U.jsx)(`div`,{style:{marginBottom:16,display:`flex`,justifyContent:`flex-end`},children:(0,U.jsx)(`button`,{className:`btn-icon primary`,title:`Create new user`,"aria-label":`Create new user`,onClick:()=>{Qe(!0),ot(``)},children:`➕`})}),Ze&&(0,U.jsxs)(`div`,{style:{background:`var(--color-bg-secondary)`,border:`1px solid var(--color-border)`,borderRadius:12,padding:16,marginBottom:20},children:[(0,U.jsx)(`h3`,{style:{margin:`0 0 16px`,fontSize:16},children:`Create New User`}),(0,U.jsxs)(`form`,{onSubmit:ln,children:[(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Username`}),(0,U.jsx)(`input`,{className:`form-input`,type:`text`,value:$e,onChange:e=>et(e.target.value),required:!0,minLength:3})]}),(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Password`}),(0,U.jsx)(`input`,{className:`form-input`,type:`password`,value:tt,onChange:e=>nt(e.target.value),required:!0,minLength:8,placeholder:`At least 8 characters`})]}),(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Role`}),(0,U.jsxs)(`select`,{className:`form-input`,value:rt,onChange:e=>it(e.target.value),style:{cursor:`pointer`},children:[(0,U.jsx)(`option`,{value:`user`,children:`User`}),(0,U.jsx)(`option`,{value:`admin`,children:`Admin`})]})]}),at&&(0,U.jsx)(`div`,{className:`error-msg`,children:at}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:8},children:[(0,U.jsx)(`button`,{className:`btn primary`,type:`submit`,children:`Create`}),(0,U.jsx)(`button`,{className:`btn ghost`,type:`button`,onClick:()=>{Qe(!1),ot(``)},children:`Cancel`})]})]})]}),qe.length===0?(0,U.jsxs)(`div`,{className:`empty-state`,children:[(0,U.jsx)(`div`,{className:`empty-icon`,children:`👤`}),(0,U.jsx)(`div`,{className:`empty-text`,children:`No users yet`})]}):(0,U.jsx)(`div`,{className:`library-list`,children:qe.map(e=>(0,U.jsx)(`div`,{className:`library-item`,children:(0,U.jsxs)(`div`,{className:`library-header`,children:[(0,U.jsxs)(`div`,{className:`library-info`,children:[(0,U.jsxs)(`div`,{className:`library-name`,style:{display:`flex`,alignItems:`center`,gap:8,flexWrap:`wrap`},children:[ur(e),(0,U.jsx)(`span`,{style:{fontSize:11,padding:`2px 8px`,borderRadius:999,background:e.role===`admin`?`rgba(99,102,241,0.2)`:`rgba(161,161,170,0.2)`,color:e.role===`admin`?`#a5b4fc`:`#a1a1aa`,fontWeight:600},children:e.role}),!e.is_active&&(0,U.jsx)(`span`,{style:{fontSize:11,padding:`2px 8px`,borderRadius:999,background:`rgba(239,68,68,0.2)`,color:`#fca5a5`,fontWeight:600},children:`inactive`}),e.oidc_subject&&(0,U.jsx)(`span`,{style:{fontSize:11,padding:`2px 8px`,borderRadius:999,background:`rgba(16,185,129,0.2)`,color:`#6ee7b7`,fontWeight:600},children:`SSO`})]}),(0,U.jsxs)(`div`,{className:`user-meta`,children:[e.display_name&&e.display_name!==e.username&&(0,U.jsxs)(`span`,{children:[e.username,` •`]}),(0,U.jsxs)(`span`,{className:`user-meta-date`,children:[`Created: `,new Date(e.created_at).toLocaleDateString()]})]})]}),(0,U.jsxs)(`div`,{className:`library-actions`,children:[(0,U.jsx)(`button`,{className:`btn-icon`,title:`Edit user`,onClick:()=>{ct(e),ut(e.role),ft(e.is_active),mt(``),gt(``)},children:`✏️`}),(0,U.jsx)(`button`,{className:`btn-icon danger`,title:`Delete user`,onClick:()=>dn(e),children:`🗑️`})]})]})},e.id))})]})]}),(0,U.jsxs)(`div`,{className:`card`,children:[(0,U.jsxs)(`div`,{className:`card-header`,onClick:()=>vt(!_t),children:[(0,U.jsx)(`h2`,{children:`🔗 SSO / OIDC Settings`}),(0,U.jsx)(`button`,{className:`card-toggle`,type:`button`,children:_t?`▼ Collapse`:`▶ Expand`})]}),(0,U.jsxs)(`div`,{className:`card-content ${_t?`expanded`:`collapsed`}`,children:[wt&&(0,U.jsx)(`div`,{className:`banner ${wt.includes(`✔`)?`success`:``}`,style:{marginBottom:16},children:wt}),(0,U.jsxs)(`form`,{onSubmit:H,children:[(0,U.jsx)(`div`,{style:{display:`flex`,alignItems:`center`,gap:12,marginBottom:20},children:(0,U.jsxs)(`label`,{style:{display:`flex`,alignItems:`center`,gap:8,cursor:`pointer`,fontSize:15,fontWeight:600},children:[(0,U.jsx)(`input`,{type:`checkbox`,checked:z.enabled,onChange:e=>yt({...z,enabled:e.target.checked}),style:{width:18,height:18}}),`Enable OIDC / SSO Login`]})}),(0,U.jsxs)(`div`,{style:{opacity:z.enabled?1:.5,pointerEvents:z.enabled?`auto`:`none`},children:[(0,U.jsxs)(`div`,{style:{display:`grid`,gridTemplateColumns:`repeat(auto-fit, minmax(260px, 1fr))`,gap:16,marginBottom:16},children:[(0,U.jsxs)(`div`,{className:`form-group`,style:{margin:0},children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Issuer URL`}),(0,U.jsx)(`input`,{className:`form-input`,type:`url`,placeholder:`https://accounts.example.com`,value:z.issuer,onChange:e=>yt({...z,issuer:e.target.value})})]}),(0,U.jsxs)(`div`,{className:`form-group`,style:{margin:0},children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Client ID`}),(0,U.jsx)(`input`,{className:`form-input`,type:`text`,value:z.clientId,onChange:e=>yt({...z,clientId:e.target.value})})]}),(0,U.jsxs)(`div`,{className:`form-group`,style:{margin:0},children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Client Secret`}),(0,U.jsx)(`input`,{className:`form-input`,type:`password`,placeholder:bt?``:`Leave blank to keep existing secret`,value:z.clientSecret,onChange:e=>{yt({...z,clientSecret:e.target.value}),xt(!0)},autoComplete:`new-password`})]}),(0,U.jsxs)(`div`,{className:`form-group`,style:{margin:0},children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Redirect URI`}),(0,U.jsx)(`input`,{className:`form-input`,type:`url`,placeholder:`${Vn}/api/auth/oidc/callback`,value:z.redirectUri,onChange:e=>yt({...z,redirectUri:e.target.value})}),(0,U.jsxs)(`div`,{style:{fontSize:12,color:`var(--color-text-muted)`,marginTop:4},children:[`Suggested: `,Vn,`/api/auth/oidc/callback`]})]})]}),(0,U.jsx)(`h3`,{style:{fontSize:15,margin:`16px 0 12px`,color:`var(--color-text-secondary)`},children:`Login Button`}),(0,U.jsxs)(`div`,{style:{display:`grid`,gridTemplateColumns:`repeat(auto-fit, minmax(200px, 1fr))`,gap:16,marginBottom:16},children:[(0,U.jsxs)(`div`,{className:`form-group`,style:{margin:0},children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Button Text`}),(0,U.jsx)(`input`,{className:`form-input`,type:`text`,value:z.buttonText,onChange:e=>yt({...z,buttonText:e.target.value}),placeholder:`Login with SSO`})]}),(0,U.jsxs)(`div`,{className:`form-group`,style:{margin:0},children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Button Color`}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:8,alignItems:`center`},children:[(0,U.jsx)(`input`,{type:`color`,value:z.buttonColor,onChange:e=>yt({...z,buttonColor:e.target.value}),style:{width:44,height:40,borderRadius:8,border:`2px solid var(--color-border)`,cursor:`pointer`,padding:2,background:`var(--color-bg-secondary)`}}),(0,U.jsx)(`input`,{className:`form-input`,type:`text`,value:z.buttonColor,onChange:e=>yt({...z,buttonColor:e.target.value}),placeholder:`#6366f1`,style:{flex:1}})]})]})]}),(0,U.jsx)(`h3`,{style:{fontSize:15,margin:`16px 0 12px`,color:`var(--color-text-secondary)`},children:`Login Methods`}),(0,U.jsx)(`div`,{className:`form-group`,style:{marginBottom:20},children:(0,U.jsxs)(`label`,{style:{display:`flex`,alignItems:`center`,gap:8,cursor:`pointer`},children:[(0,U.jsx)(`input`,{type:`checkbox`,checked:z.passwordLoginEnabled,onChange:e=>yt({...z,passwordLoginEnabled:e.target.checked}),style:{width:16,height:16}}),(0,U.jsx)(`span`,{className:`form-label`,style:{margin:0},children:`Enable username/password login on Admin and Host pages`})]})}),(0,U.jsx)(`h3`,{style:{fontSize:15,margin:`16px 0 12px`,color:`var(--color-text-secondary)`},children:`User Provisioning`}),(0,U.jsxs)(`div`,{style:{display:`grid`,gridTemplateColumns:`repeat(auto-fit, minmax(200px, 1fr))`,gap:16,marginBottom:20},children:[(0,U.jsx)(`div`,{className:`form-group`,style:{margin:0},children:(0,U.jsxs)(`label`,{style:{display:`flex`,alignItems:`center`,gap:8,cursor:`pointer`},children:[(0,U.jsx)(`input`,{type:`checkbox`,checked:z.autoCreateUsers,onChange:e=>yt({...z,autoCreateUsers:e.target.checked}),style:{width:16,height:16}}),(0,U.jsx)(`span`,{className:`form-label`,style:{margin:0},children:`Auto-create new users`})]})}),(0,U.jsxs)(`div`,{className:`form-group`,style:{margin:0},children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Default role for new SSO users`}),(0,U.jsxs)(`select`,{className:`form-input`,value:z.defaultRole,onChange:e=>yt({...z,defaultRole:e.target.value}),style:{cursor:`pointer`},children:[(0,U.jsx)(`option`,{value:`user`,children:`User`}),(0,U.jsx)(`option`,{value:`admin`,children:`Admin`})]})]})]}),z.buttonText&&(0,U.jsxs)(`div`,{style:{marginBottom:16},children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Preview`}),(0,U.jsx)(`div`,{style:{padding:`12px 20px`,borderRadius:12,background:z.buttonColor,color:`white`,display:`inline-block`,fontWeight:600,fontSize:14},children:z.buttonText})]})]}),(0,U.jsx)(`button`,{className:`btn-icon primary`,type:`submit`,disabled:St,title:`Save OIDC settings`,"aria-label":`Save OIDC settings`,children:St?(0,U.jsx)(U.Fragment,{children:(0,U.jsx)(`span`,{className:`loading-spinner`})}):`💾`})]})]})]}),p&&(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{className:`modal-backdrop`,onClick:()=>m(!1)}),(0,U.jsxs)(`div`,{className:`modal`,children:[(0,U.jsxs)(`div`,{className:`modal-header`,children:[(0,U.jsx)(`h3`,{className:`modal-title`,children:`📁 Select Media Folder`}),(0,U.jsx)(`button`,{className:`btn ghost`,onClick:()=>m(!1),style:{padding:`4px 12px`},children:`✕`})]}),(0,U.jsxs)(`div`,{className:`browser-path`,children:[(0,U.jsx)(`span`,{children:`📍`}),(0,U.jsxs)(`div`,{className:`breadcrumb`,children:[(0,U.jsx)(`span`,{className:`breadcrumb-part`,onClick:()=>Nt(`/`),children:`/`}),h.split(`/`).filter(Boolean).map((e,t,n)=>{let r=`/`+n.slice(0,t+1).join(`/`);return(0,U.jsxs)(x.Fragment,{children:[(0,U.jsx)(`span`,{className:`breadcrumb-sep`,children:`/`}),(0,U.jsx)(`span`,{className:`breadcrumb-part`,onClick:()=>Nt(r),children:e})]},t)})]})]}),y&&(0,U.jsxs)(`div`,{className:`error-msg`,children:[`⚠️ `,y]}),(0,U.jsxs)(`div`,{className:`browser-container`,children:[h!==`/`&&(0,U.jsxs)(`div`,{className:`folder-item`,onClick:Gt,children:[(0,U.jsx)(`span`,{className:`folder-icon`,children:`⬆️`}),(0,U.jsx)(`span`,{className:`folder-name`,children:`..`}),(0,U.jsx)(`span`,{style:{opacity:.5,fontSize:13},children:`(parent directory)`})]}),_.filter(e=>e.isDirectory).map(e=>(0,U.jsxs)(`div`,{className:`folder-item`,onClick:()=>Nt(e.path),children:[(0,U.jsx)(`span`,{className:`folder-icon`,children:`📁`}),(0,U.jsx)(`span`,{className:`folder-name`,children:e.name})]},e.path)),_.filter(e=>e.isDirectory).length===0&&!y&&(0,U.jsxs)(`div`,{className:`empty-state`,style:{padding:40},children:[(0,U.jsx)(`div`,{className:`empty-icon`,style:{fontSize:48},children:`📂`}),(0,U.jsx)(`div`,{className:`empty-text`,style:{fontSize:14},children:`No subfolders in this directory`})]})]}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:12},children:[(0,U.jsx)(`input`,{className:`form-input`,value:h,readOnly:!0,style:{flex:1}}),(0,U.jsxs)(`button`,{className:`btn success`,onClick:()=>Wt(h),children:[(0,U.jsx)(`span`,{children:`✓`}),` Select This Folder`]}),(0,U.jsx)(`button`,{className:`btn ghost`,onClick:()=>m(!1),children:`Cancel`})]})]})]}),Be&&(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{className:`modal-backdrop`,onClick:()=>Ve(!1)}),(0,U.jsxs)(`div`,{className:`modal`,children:[(0,U.jsxs)(`div`,{className:`modal-header`,children:[(0,U.jsx)(`h3`,{className:`modal-title`,children:`📁 Select Download Folder`}),(0,U.jsx)(`button`,{className:`btn ghost`,onClick:()=>Ve(!1),style:{padding:`4px 12px`},children:`✕`})]}),(0,U.jsxs)(`div`,{className:`browser-path`,children:[(0,U.jsx)(`span`,{children:`📍`}),(0,U.jsxs)(`div`,{className:`breadcrumb`,children:[(0,U.jsx)(`span`,{className:`breadcrumb-part`,onClick:()=>Nt(`/`),children:`/`}),h.split(`/`).filter(Boolean).map((e,t,n)=>{let r=`/`+n.slice(0,t+1).join(`/`);return(0,U.jsxs)(x.Fragment,{children:[(0,U.jsx)(`span`,{className:`breadcrumb-sep`,children:`/`}),(0,U.jsx)(`span`,{className:`breadcrumb-part`,onClick:()=>Nt(r),children:e})]},t)})]})]}),y&&(0,U.jsxs)(`div`,{className:`error-msg`,children:[`⚠️ `,y]}),(0,U.jsxs)(`div`,{className:`browser-container`,children:[h!==`/`&&(0,U.jsxs)(`div`,{className:`folder-item`,onClick:Gt,children:[(0,U.jsx)(`span`,{className:`folder-icon`,children:`⬆️`}),(0,U.jsx)(`span`,{className:`folder-name`,children:`..`}),(0,U.jsx)(`span`,{style:{opacity:.5,fontSize:13},children:`(parent directory)`})]}),_.filter(e=>e.isDirectory).map(e=>(0,U.jsxs)(`div`,{className:`folder-item`,onClick:()=>Nt(e.path),children:[(0,U.jsx)(`span`,{className:`folder-icon`,children:`📁`}),(0,U.jsx)(`span`,{className:`folder-name`,children:e.name})]},e.path)),_.filter(e=>e.isDirectory).length===0&&!y&&(0,U.jsxs)(`div`,{className:`empty-state`,style:{padding:40},children:[(0,U.jsx)(`div`,{className:`empty-icon`,style:{fontSize:48},children:`📂`}),(0,U.jsx)(`div`,{className:`empty-text`,style:{fontSize:14},children:`No subfolders in this directory`})]})]}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:12},children:[(0,U.jsx)(`input`,{className:`form-input`,value:h,readOnly:!0,style:{flex:1}}),(0,U.jsxs)(`button`,{className:`btn success`,onClick:()=>rn(h),children:[(0,U.jsx)(`span`,{children:`✓`}),` Select This Folder`]}),(0,U.jsx)(`button`,{className:`btn ghost`,onClick:()=>Ve(!1),children:`Cancel`})]})]})]}),oe&&(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{className:`modal-backdrop`,onClick:()=>se(!1)}),(0,U.jsxs)(`div`,{className:`modal`,children:[(0,U.jsxs)(`div`,{className:`modal-header`,children:[(0,U.jsx)(`h3`,{className:`modal-title`,children:`🔐 Account Settings`}),(0,U.jsx)(`button`,{className:`btn ghost`,onClick:()=>se(!1),style:{padding:`4px 12px`},children:`✕`})]}),e.isDefaultPassword&&(0,U.jsx)(`div`,{className:`banner warning`,style:{marginBottom:16},children:`⚠️ You are using the default password. Please change it for security.`}),(0,U.jsx)(`p`,{style:{color:`var(--color-text-secondary)`,marginBottom:20,fontSize:14},children:`Change your username and password.`}),!he&&!ce&&(0,U.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,gap:12,marginBottom:20},children:[(0,U.jsxs)(`button`,{className:`btn`,style:{minWidth:180,justifyContent:`center`,flex:1},onClick:()=>ge(!0),children:[(0,U.jsx)(`span`,{children:`👤`}),` Change Username`]}),(0,U.jsxs)(`button`,{className:`btn`,style:{minWidth:180,justifyContent:`center`,flex:1},onClick:()=>P(!0),children:[(0,U.jsx)(`span`,{children:`🔒`}),` Change Password`]})]}),he&&(0,U.jsx)(`div`,{style:{marginBottom:20},children:(0,U.jsxs)(`form`,{onSubmit:Mt,style:{display:`flex`,flexDirection:`column`,gap:12,background:`var(--color-bg-secondary)`,padding:16,borderRadius:12,border:`1px solid var(--color-border)`},children:[(0,U.jsxs)(`div`,{className:`form-group`,style:{marginBottom:0},children:[(0,U.jsx)(`label`,{className:`form-label`,children:`New Username`}),(0,U.jsx)(`input`,{className:`form-input`,type:`text`,value:L,onChange:e=>_e(e.target.value),placeholder:`Enter new username (min 3 characters)`,autoComplete:`username`,required:!0,minLength:3})]}),(0,U.jsxs)(`div`,{className:`form-group`,style:{marginBottom:0},children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Current Password (to confirm)`}),(0,U.jsx)(`input`,{className:`form-input`,type:`password`,value:ve,onChange:e=>ye(e.target.value),placeholder:`Enter current password`,autoComplete:`current-password`,required:!0})]}),be&&(0,U.jsx)(`div`,{className:`error-msg`,style:{marginBottom:0},children:be}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:8},children:[(0,U.jsxs)(`button`,{className:`btn success`,type:`submit`,disabled:s,children:[(0,U.jsx)(`span`,{children:`✓`}),` Change Username`]}),(0,U.jsx)(`button`,{type:`button`,className:`btn ghost`,onClick:()=>{ge(!1),_e(``),ye(``),xe(``)},children:`Cancel`})]})]})}),ce&&(0,U.jsxs)(`form`,{onSubmit:jt,style:{display:`flex`,flexDirection:`column`,gap:12,background:`var(--color-bg-secondary)`,padding:16,borderRadius:12,border:`1px solid var(--color-border)`},children:[(0,U.jsxs)(`div`,{className:`form-group`,style:{marginBottom:0},children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Current Password`}),(0,U.jsx)(`input`,{className:`form-input`,type:`password`,value:F,onChange:e=>le(e.target.value),placeholder:`Enter current password`,autoComplete:`current-password`,required:!0})]}),(0,U.jsxs)(`div`,{className:`form-group`,style:{marginBottom:0},children:[(0,U.jsx)(`label`,{className:`form-label`,children:`New Password`}),(0,U.jsx)(`input`,{className:`form-input`,type:`password`,value:I,onChange:e=>ue(e.target.value),placeholder:`Enter new password (min 8 characters)`,autoComplete:`new-password`,required:!0,minLength:8})]}),(0,U.jsxs)(`div`,{className:`form-group`,style:{marginBottom:0},children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Confirm New Password`}),(0,U.jsx)(`input`,{className:`form-input`,type:`password`,value:de,onChange:e=>fe(e.target.value),placeholder:`Confirm new password`,autoComplete:`new-password`,required:!0})]}),pe&&(0,U.jsx)(`div`,{className:`error-msg`,style:{marginBottom:0},children:pe}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:8},children:[(0,U.jsxs)(`button`,{className:`btn success`,type:`submit`,disabled:s,children:[(0,U.jsx)(`span`,{children:`✓`}),` Change Password`]}),(0,U.jsx)(`button`,{type:`button`,className:`btn ghost`,onClick:()=>{P(!1),le(``),ue(``),fe(``),me(``)},children:`Cancel`})]})]})]})]}),st&&(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{className:`modal-backdrop`,onClick:()=>ct(null)}),(0,U.jsxs)(`div`,{className:`modal`,style:{maxWidth:480},children:[(0,U.jsxs)(`div`,{className:`modal-header`,children:[(0,U.jsxs)(`h3`,{className:`modal-title`,children:[`✏️ Edit User: `,ur(st)]}),(0,U.jsx)(`button`,{className:`btn ghost`,onClick:()=>ct(null),style:{padding:`4px 12px`},children:`✕`})]}),(0,U.jsxs)(`form`,{onSubmit:un,children:[(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Role`}),(0,U.jsxs)(`select`,{className:`form-input`,value:lt,onChange:e=>ut(e.target.value),style:{cursor:`pointer`},children:[(0,U.jsx)(`option`,{value:`user`,children:`User`}),(0,U.jsx)(`option`,{value:`admin`,children:`Admin`})]})]}),(0,U.jsx)(`div`,{className:`form-group`,children:(0,U.jsxs)(`label`,{style:{display:`flex`,alignItems:`center`,gap:8,cursor:`pointer`},children:[(0,U.jsx)(`input`,{type:`checkbox`,checked:dt,onChange:e=>ft(e.target.checked),style:{width:16,height:16}}),(0,U.jsx)(`span`,{className:`form-label`,style:{margin:0},children:`Active`})]})}),(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`New Password (leave blank to keep current)`}),(0,U.jsx)(`input`,{className:`form-input`,type:`password`,value:pt,onChange:e=>mt(e.target.value),placeholder:`New password (optional)`,autoComplete:`new-password`})]}),ht&&(0,U.jsx)(`div`,{className:`error-msg`,children:ht}),(0,U.jsxs)(`div`,{style:{display:`flex`,gap:8},children:[(0,U.jsx)(`button`,{className:`btn primary`,type:`submit`,children:`Save Changes`}),(0,U.jsx)(`button`,{className:`btn ghost`,type:`button`,onClick:()=>ct(null),children:`Cancel`})]})]})]})]})]}):(0,U.jsxs)(`div`,{className:`card`,style:{maxWidth:480,margin:`80px auto`,textAlign:`center`},children:[(0,U.jsx)(`div`,{style:{fontSize:64,marginBottom:16},children:`🚫`}),(0,U.jsx)(`h2`,{style:{margin:`0 0 12px`,fontSize:22},children:`Access Denied`}),(0,U.jsx)(`p`,{style:{color:`var(--color-text-secondary)`,marginBottom:24},children:`Your account does not have administrator privileges.`}),(0,U.jsxs)(`button`,{className:`btn danger`,onClick:e.handleLogout,children:[(0,U.jsx)(`span`,{children:`🚪`}),` Logout`]})]}):(0,U.jsxs)(`div`,{className:`card login-card`,children:[(0,U.jsx)(`div`,{className:`login-header`,children:(0,U.jsx)(`h2`,{className:`login-title`,children:`🔐 Admin Login`})}),ie?.passwordLoginEnabled!==!1&&(0,U.jsxs)(`form`,{onSubmit:At,children:[(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Username`}),(0,U.jsx)(`input`,{className:`form-input`,type:`text`,value:te,onChange:e=>ne(e.target.value),autoComplete:`username`,required:!0})]}),(0,U.jsxs)(`div`,{className:`form-group`,children:[(0,U.jsx)(`label`,{className:`form-label`,children:`Password`}),(0,U.jsx)(`input`,{className:`form-input`,type:`password`,value:re,onChange:e=>j(e.target.value),placeholder:`Enter admin password`,autoComplete:`current-password`,required:!0})]}),M&&(0,U.jsx)(`div`,{className:`error-msg`,children:M}),(0,U.jsx)(`button`,{className:`btn primary`,type:`submit`,disabled:s,style:{width:`100%`},children:s?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`span`,{className:`loading-spinner`}),` Logging in...`]}):`Login`})]}),ie?.passwordLoginEnabled===!1&&!ie?.enabled&&(0,U.jsx)(`div`,{className:`error-msg`,style:{marginBottom:16},children:`Username/password login is disabled and SSO is not enabled.`}),M&&ie?.passwordLoginEnabled===!1&&(0,U.jsx)(`div`,{className:`error-msg`,style:{marginBottom:16},children:M}),ie?.enabled&&(0,U.jsxs)(U.Fragment,{children:[ie?.passwordLoginEnabled!==!1&&(0,U.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:12,margin:`20px 0`},children:[(0,U.jsx)(`div`,{style:{flex:1,height:1,background:`rgba(255,255,255,0.1)`}}),(0,U.jsx)(`span`,{style:{color:`var(--color-text-secondary)`,fontSize:13},children:`or`}),(0,U.jsx)(`div`,{style:{flex:1,height:1,background:`rgba(255,255,255,0.1)`}})]}),(0,U.jsx)(`a`,{href:`${Vn}/api/auth/oidc/login?returnTo=%2Fadmin`,className:`btn`,style:{width:`100%`,display:`flex`,justifyContent:`center`,background:ie.buttonColor,border:`none`,color:`white`,textDecoration:`none`,boxSizing:`border-box`},children:ie.buttonText})]})]})]})]})}var fr=`#111827`;function pr(){let e=et(),t=Wn(),[n,r]=(0,x.useState)(!1),[i,a]=(0,x.useState)(!1);(0,x.useEffect)(()=>{document.title={"/":`Request - Web Karaoke`,"/requests":`Request - Web Karaoke`,"/player":`Player - Web Karaoke`,"/host":`Host - Web Karaoke`,"/admin":`Admin - Web Karaoke`}[e.pathname]||`Web Karaoke`},[e.pathname]),(0,x.useEffect)(()=>{if(e.pathname!==`/admin`)return;let n=new URLSearchParams(e.search),r=n.get(`oidc_session`),i=n.get(`oidc_error`);if(r){t.setSessionToken(r),localStorage.setItem(`sessionToken`,r);let e=window.location.pathname;window.history.replaceState({},``,e)}else if(i){let e=window.location.pathname;window.history.replaceState({},``,e)}},[e.pathname,e.search]);let o=e.pathname===`/host`||e.pathname===`/admin`,s=e.pathname===`/admin`||e.pathname===`/host`,c=t.profile.displayName||t.profile.username||`Account`,l=c.trim().charAt(0).toUpperCase()||`👤`;return(0,x.useEffect)(()=>{a(!1)},[t.profile.picture]),(0,U.jsxs)(`nav`,{style:{display:`flex`,alignItems:`center`,justifyContent:`space-between`,padding:`12px 20px`,borderBottom:`1px solid rgba(255, 255, 255, 0.1)`,background:`linear-gradient(135deg, #0a0a0f 0%, #16161d 100%)`,position:`sticky`,top:0,zIndex:100,boxShadow:`0 2px 8px rgba(0, 0, 0, 0.3)`},children:[(0,U.jsxs)(`div`,{style:{display:`flex`,gap:16,alignItems:`center`},children:[(0,U.jsx)(_n,{to:`/player`,style:{color:e.pathname===`/player`?`#6366f1`:`#a1a1aa`,textDecoration:`none`,fontWeight:500,transition:`color 0.3s ease`},children:`Player`}),(0,U.jsx)(_n,{to:`/requests`,style:{color:e.pathname===`/requests`||e.pathname===`/`?`#6366f1`:`#a1a1aa`,textDecoration:`none`,fontWeight:500,transition:`color 0.3s ease`},children:`Request`}),(0,U.jsx)(_n,{to:`/host`,style:{color:e.pathname===`/host`?`#6366f1`:`#a1a1aa`,textDecoration:`none`,fontWeight:500,transition:`color 0.3s ease`},children:`Host`}),(0,U.jsx)(_n,{to:`/admin`,style:{color:e.pathname===`/admin`?`#6366f1`:`#a1a1aa`,textDecoration:`none`,fontWeight:500,transition:`color 0.3s ease`},children:`Admin`})]}),o&&t.isLoggedIn&&(0,U.jsxs)(`div`,{style:{position:`relative`},children:[(0,U.jsx)(`button`,{onClick:()=>r(!n),style:{width:40,height:40,borderRadius:`50%`,background:t.profile.picture&&!i?fr:`linear-gradient(135deg, #6366f1, #8b5cf6)`,border:`none`,color:`white`,fontSize:18,cursor:`pointer`,display:`flex`,alignItems:`center`,justifyContent:`center`,transition:`all 0.3s ease`,boxShadow:`none`},title:c,children:t.profile.picture&&!i?(0,U.jsx)(`img`,{src:t.profile.picture,alt:c,referrerPolicy:`no-referrer`,onError:()=>a(!0),style:{width:`100%`,height:`100%`,objectFit:`cover`,borderRadius:`50%`}}):l}),n&&(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`div`,{style:{position:`fixed`,top:0,left:0,right:0,bottom:0,zIndex:98},onClick:()=>r(!1)}),(0,U.jsxs)(`div`,{style:{position:`absolute`,top:`100%`,right:0,marginTop:8,background:`#1d1d27`,border:`1px solid rgba(255, 255, 255, 0.1)`,borderRadius:12,padding:8,minWidth:180,boxShadow:`0 4px 20px rgba(0, 0, 0, 0.5)`,zIndex:99},children:[(0,U.jsxs)(`div`,{style:{padding:`10px 12px`,color:`#ffffff`,fontSize:13,lineHeight:1.4},children:[(0,U.jsx)(`div`,{style:{fontWeight:600},children:c}),t.profile.displayName&&t.profile.username&&t.profile.displayName!==t.profile.username&&(0,U.jsx)(`div`,{style:{color:`#a1a1aa`},children:t.profile.username})]}),(0,U.jsx)(`div`,{style:{height:1,background:`rgba(255, 255, 255, 0.1)`,margin:`6px 0`}}),s&&(0,U.jsxs)(U.Fragment,{children:[(0,U.jsxs)(`button`,{onClick:()=>{r(!1);let e=new CustomEvent(`showAccountManagement`);window.dispatchEvent(e)},style:{width:`100%`,padding:`10px 12px`,background:`transparent`,border:`none`,color:`#ffffff`,textAlign:`left`,cursor:`pointer`,borderRadius:8,display:`flex`,alignItems:`center`,gap:8,fontSize:14,fontWeight:500,transition:`background 0.2s ease`},onMouseEnter:e=>e.currentTarget.style.background=`rgba(99, 102, 241, 0.1)`,onMouseLeave:e=>e.currentTarget.style.background=`transparent`,children:[(0,U.jsx)(`span`,{children:`🔐`}),` Account Settings`]}),(0,U.jsx)(`div`,{style:{height:1,background:`rgba(255, 255, 255, 0.1)`,margin:`6px 0`}})]}),(0,U.jsxs)(`button`,{onClick:()=>{r(!1),t.handleLogout()},style:{width:`100%`,padding:`10px 12px`,background:`transparent`,border:`none`,color:`#ef4444`,textAlign:`left`,cursor:`pointer`,borderRadius:8,display:`flex`,alignItems:`center`,gap:8,fontSize:14,fontWeight:500,transition:`background 0.2s ease`},onMouseEnter:e=>e.currentTarget.style.background=`rgba(239, 68, 68, 0.1)`,onMouseLeave:e=>e.currentTarget.style.background=`transparent`,children:[(0,U.jsx)(`span`,{children:`🚪`}),` Logout`]})]})]})]})]})}function mr(){return(0,U.jsx)(mn,{children:(0,U.jsxs)(Gn,{children:[(0,U.jsx)(pr,{}),(0,U.jsxs)(Ot,{children:[(0,U.jsx)(Dt,{path:`/`,element:(0,U.jsx)(nr,{})}),(0,U.jsx)(Dt,{path:`/player`,element:(0,U.jsx)(Zn,{})}),(0,U.jsx)(Dt,{path:`/requests`,element:(0,U.jsx)(nr,{})}),(0,U.jsx)(Dt,{path:`/host`,element:(0,U.jsx)(lr,{})}),(0,U.jsx)(Dt,{path:`/admin`,element:(0,U.jsx)(dr,{})})]})]})})}(0,Ln.createRoot)(document.getElementById(`root`)).render((0,U.jsx)(mr,{}));