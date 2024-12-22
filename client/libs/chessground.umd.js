"use strict";var Chessground=(()=>{var be=Object.defineProperty;var Io=Object.getOwnPropertyDescriptor;var jo=Object.getOwnPropertyNames;var Uo=Object.prototype.hasOwnProperty;var ve=Math.pow;var Zo=(e,o)=>{for(var r in o)be(e,r,{get:o[r],enumerable:!0})},Qo=(e,o,r,t)=>{if(o&&typeof o=="object"||typeof o=="function")for(let n of jo(o))!Uo.call(e,n)&&n!==r&&be(e,n,{get:()=>o[n],enumerable:!(t=Io(o,n))||t.enumerable});return e};var Xo=e=>Qo(be({},"__esModule",{value:!0}),e);var Fr={};Zo(Fr,{Chessground:()=>$o,initModule:()=>Gr});var We=["white","black"];var W=["a","b","c","d","e","f","g","h"],$=["1","2","3","4","5","6","7","8"];var ze=[...$].reverse(),re=Array.prototype.concat(...W.map(e=>$.map(o=>e+o))),w=e=>re[8*e[0]+e[1]],g=e=>[e.charCodeAt(0)-97,e.charCodeAt(1)-49];var te=re.map(g);function $e(e){let o,r=()=>(o===void 0&&(o=e()),o);return r.clear=()=>{o=void 0},r}var Ie=()=>{let e;return{start(){e=performance.now()},cancel(){e=void 0},stop(){if(!e)return 0;let o=performance.now()-e;return e=void 0,o}}},ne=e=>e==="white"?"black":"white",L=(e,o)=>{let r=e[0]-o[0],t=e[1]-o[1];return r*r+t*t},U=(e,o)=>e.role===o.role&&e.color===o.color,G=e=>(o,r)=>[(r?o[0]:7-o[0])*e.width/8,(r?7-o[1]:o[1])*e.height/8],k=(e,o)=>{e.style.transform=`translate(${o[0]}px,${o[1]}px)`},ye=(e,o,r=1)=>{e.style.transform=`translate(${o[0]}px,${o[1]}px) scale(${r})`},Z=(e,o)=>{e.style.visibility=o?"visible":"hidden"},R=e=>{var o;if(e.clientX||e.clientX===0)return[e.clientX,e.clientY];if((o=e.targetTouches)!=null&&o[0])return[e.targetTouches[0].clientX,e.targetTouches[0].clientY]},ie=e=>e.button===2,C=(e,o)=>{let r=document.createElement(e);return o&&(r.className=o),r};function ae(e,o,r){let t=g(e);return o||(t[0]=7-t[0],t[1]=7-t[1]),[r.left+r.width*t[0]/8+r.width/16,r.top+r.height*(7-t[1])/8+r.height/16]}var F=(e,o)=>Math.abs(e-o),Yo=e=>(o,r,t,n)=>F(o,t)<2&&(e==="white"?n===r+1||r<=1&&n===r+2&&o===t:n===r-1||r>=6&&n===r-2&&o===t),Se=(e,o,r,t)=>{let n=F(e,r),i=F(o,t);return n===1&&i===2||n===2&&i===1},je=(e,o,r,t)=>F(e,r)===F(o,t),Ue=(e,o,r,t)=>e===r||o===t,we=(e,o,r,t)=>je(e,o,r,t)||Ue(e,o,r,t),Jo=(e,o,r)=>(t,n,i,a)=>F(t,i)<2&&F(n,a)<2||r&&n===a&&n===(e==="white"?0:7)&&(t===4&&(i===2&&o.includes(0)||i===6&&o.includes(7))||o.includes(i));function _o(e,o){let r=o==="white"?"1":"8",t=[];for(let[n,i]of e)n[1]===r&&i.color===o&&i.role==="rook"&&t.push(g(n)[0]);return t}function Pe(e,o,r){let t=e.get(o);if(!t)return[];let n=g(o),i=t.role,a=i==="pawn"?Yo(t.color):i==="knight"?Se:i==="bishop"?je:i==="rook"?Ue:i==="queen"?we:Jo(t.color,_o(e,t.color),r);return te.filter(c=>(n[0]!==c[0]||n[1]!==c[1])&&a(n[0],n[1],c[0],c[1])).map(w)}function M(e,...o){e&&setTimeout(()=>e(...o),1)}function Ze(e){e.orientation=ne(e.orientation),e.animation.current=e.draggable.current=e.selected=void 0}function Qe(e,o){for(let[r,t]of o)t?e.pieces.set(r,t):e.pieces.delete(r)}function Xe(e,o){if(e.check=void 0,o===!0&&(o=e.turnColor),o)for(let[r,t]of e.pieces)t.role==="king"&&t.color===o&&(e.check=r)}function er(e,o,r,t){E(e),e.premovable.current=[o,r],M(e.premovable.events.set,o,r,t)}function D(e){e.premovable.current&&(e.premovable.current=void 0,M(e.premovable.events.unset))}function or(e,o,r){D(e),e.predroppable.current={role:o,key:r},M(e.predroppable.events.set,o,r)}function E(e){let o=e.predroppable;o.current&&(o.current=void 0,M(o.events.unset))}function rr(e,o,r){if(!e.autoCastle)return!1;let t=e.pieces.get(o);if(!t||t.role!=="king")return!1;let n=g(o),i=g(r);if(n[1]!==0&&n[1]!==7||n[1]!==i[1])return!1;n[0]===4&&!e.pieces.has(r)&&(i[0]===6?r=w([7,i[1]]):i[0]===2&&(r=w([0,i[1]])));let a=e.pieces.get(r);return!a||a.color!==t.color||a.role!=="rook"?!1:(e.pieces.delete(o),e.pieces.delete(r),n[0]<i[0]?(e.pieces.set(w([6,i[1]]),t),e.pieces.set(w([5,i[1]]),a)):(e.pieces.set(w([2,i[1]]),t),e.pieces.set(w([3,i[1]]),a)),!0)}function Me(e,o,r){let t=e.pieces.get(o),n=e.pieces.get(r);if(o===r||!t)return!1;let i=n&&n.color!==t.color?n:void 0;return r===e.selected&&P(e),M(e.events.move,o,r,i),rr(e,o,r)||(e.pieces.set(r,t),e.pieces.delete(o)),e.lastMove=[o,r],e.check=void 0,M(e.events.change),i||!0}function ce(e,o,r,t){if(e.pieces.has(r))if(t)e.pieces.delete(r);else return!1;return M(e.events.dropNewPiece,o,r),e.pieces.set(r,o),e.lastMove=[r],e.check=void 0,M(e.events.change),e.movable.dests=void 0,e.turnColor=ne(e.turnColor),!0}function Ye(e,o,r){let t=Me(e,o,r);return t&&(e.movable.dests=void 0,e.turnColor=ne(e.turnColor),e.animation.current=void 0),t}function xe(e,o,r){if(le(e,o,r)){let t=Ye(e,o,r);if(t){let n=e.hold.stop();P(e);let i={premove:!1,ctrlKey:e.stats.ctrlKey,holdTime:n};return t!==!0&&(i.captured=t),M(e.movable.events.after,o,r,i),!0}}else if(nr(e,o,r))return er(e,o,r,{ctrlKey:e.stats.ctrlKey}),P(e),!0;return P(e),!1}function se(e,o,r,t){let n=e.pieces.get(o);n&&(tr(e,o,r)||t)?(e.pieces.delete(o),ce(e,n,r,t),M(e.movable.events.afterNewPiece,n.role,r,{premove:!1,predrop:!1})):n&&ir(e,o,r)?or(e,n.role,r):(D(e),E(e)),e.pieces.delete(o),P(e)}function X(e,o,r){if(M(e.events.select,o),e.selected){if(e.selected===o&&!e.draggable.enabled){P(e),e.hold.cancel();return}else if((e.selectable.enabled||r)&&e.selected!==o&&xe(e,e.selected,o)){e.stats.dragged=!1;return}}(e.selectable.enabled||e.draggable.enabled)&&(Je(e,o)||ke(e,o))&&(Ke(e,o),e.hold.start())}function Ke(e,o){e.selected=o,ke(e,o)?e.premovable.customDests||(e.premovable.dests=Pe(e.pieces,o,e.premovable.castle)):e.premovable.dests=void 0}function P(e){e.selected=void 0,e.premovable.dests=void 0,e.hold.cancel()}function Je(e,o){let r=e.pieces.get(o);return!!r&&(e.movable.color==="both"||e.movable.color===r.color&&e.turnColor===r.color)}var le=(e,o,r)=>{var t,n;return o!==r&&Je(e,o)&&(e.movable.free||!!((n=(t=e.movable.dests)==null?void 0:t.get(o))!=null&&n.includes(r)))};function tr(e,o,r){let t=e.pieces.get(o);return!!t&&(o===r||!e.pieces.has(r))&&(e.movable.color==="both"||e.movable.color===t.color&&e.turnColor===t.color)}function ke(e,o){let r=e.pieces.get(o);return!!r&&e.premovable.enabled&&e.movable.color===r.color&&e.turnColor!==r.color}function nr(e,o,r){var n,i;let t=(i=(n=e.premovable.customDests)==null?void 0:n.get(o))!=null?i:Pe(e.pieces,o,e.premovable.castle);return o!==r&&ke(e,o)&&t.includes(r)}function ir(e,o,r){let t=e.pieces.get(o),n=e.pieces.get(r);return!!t&&(!n||n.color!==e.movable.color)&&e.predroppable.enabled&&(t.role!=="pawn"||r[1]!=="1"&&r[1]!=="8")&&e.movable.color===t.color&&e.turnColor!==t.color}function _e(e,o){let r=e.pieces.get(o);return!!r&&e.draggable.enabled&&(e.movable.color==="both"||e.movable.color===r.color&&(e.turnColor===r.color||e.premovable.enabled))}function eo(e){let o=e.premovable.current;if(!o)return!1;let r=o[0],t=o[1],n=!1;if(le(e,r,t)){let i=Ye(e,r,t);if(i){let a={premove:!0};i!==!0&&(a.captured=i),M(e.movable.events.after,r,t,a),n=!0}}return D(e),n}function oo(e,o){let r=e.predroppable.current,t=!1;if(!r)return!1;if(o(r)){let n={role:r.role,color:e.movable.color};ce(e,n,r.key)&&(M(e.movable.events.afterNewPiece,r.role,r.key,{premove:!1,predrop:!0}),t=!0)}return E(e),t}function Y(e){D(e),E(e),P(e)}function Ce(e){e.movable.color=e.movable.dests=e.animation.current=void 0,Y(e)}function A(e,o,r){let t=Math.floor(8*(e[0]-r.left)/r.width);o||(t=7-t);let n=7-Math.floor(8*(e[1]-r.top)/r.height);return o||(n=7-n),t>=0&&t<8&&n>=0&&n<8?w([t,n]):void 0}function ro(e,o,r,t){let n=g(e),i=te.filter(s=>we(n[0],n[1],s[0],s[1])||Se(n[0],n[1],s[0],s[1])),c=i.map(s=>ae(w(s),r,t)).map(s=>L(o,s)),[,l]=c.reduce((s,u,d)=>s[0]<u?s:[u,d],[c[0],0]);return w(i[l])}var v=e=>e.orientation==="white";var Ee="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",ar={p:"pawn",r:"rook",n:"knight",b:"bishop",q:"queen",k:"king"},cr={pawn:"p",rook:"r",knight:"n",bishop:"b",queen:"q",king:"k"};function de(e){e==="start"&&(e=Ee);let o=new Map,r=7,t=0;for(let n of e)switch(n){case" ":case"[":return o;case"/":if(--r,r<0)return o;t=0;break;case"~":{let i=o.get(w([t-1,r]));i&&(i.promoted=!0);break}default:{let i=n.charCodeAt(0);if(i<57)t+=i-48;else{let a=n.toLowerCase();o.set(w([t,r]),{role:ar[a],color:n===a?"black":"white"}),++t}}}return o}function to(e){return ze.map(o=>W.map(r=>{let t=e.get(r+o);if(t){let n=cr[t.role];return t.color==="white"&&(n=n.toUpperCase()),t.promoted&&(n+="~"),n}else return"1"}).join("")).join("/").replace(/1{2,}/g,o=>o.length.toString())}function Ae(e,o){o.animation&&(Ne(e.animation,o.animation),(e.animation.duration||0)<70&&(e.animation.enabled=!1))}function ue(e,o){var r,t,n;if((r=o.movable)!=null&&r.dests&&(e.movable.dests=void 0),(t=o.drawable)!=null&&t.autoShapes&&(e.drawable.autoShapes=[]),Ne(e,o),o.fen&&(e.pieces=de(o.fen),e.drawable.shapes=((n=o.drawable)==null?void 0:n.shapes)||[]),"check"in o&&Xe(e,o.check||!1),"lastMove"in o&&!o.lastMove?e.lastMove=void 0:o.lastMove&&(e.lastMove=o.lastMove),e.selected&&Ke(e,e.selected),Ae(e,o),!e.movable.rookCastle&&e.movable.dests){let i=e.movable.color==="white"?"1":"8",a="e"+i,c=e.movable.dests.get(a),l=e.pieces.get(a);if(!c||!l||l.role!=="king")return;e.movable.dests.set(a,c.filter(s=>!(s==="a"+i&&c.includes("c"+i))&&!(s==="h"+i&&c.includes("g"+i))))}}function Ne(e,o){for(let r in o)Object.prototype.hasOwnProperty.call(o,r)&&(Object.prototype.hasOwnProperty.call(e,r)&&no(e[r])&&no(o[r])?Ne(e[r],o[r]):e[r]=o[r])}function no(e){if(typeof e!="object"||e===null)return!1;let o=Object.getPrototypeOf(e);return o===Object.prototype||o===null}var O=(e,o)=>o.animation.enabled?ur(e,o):B(e,o);function B(e,o){let r=e(o);return o.dom.redraw(),r}var He=(e,o)=>({key:e,pos:g(e),piece:o}),lr=(e,o)=>o.sort((r,t)=>L(e.pos,r.pos)-L(e.pos,t.pos))[0];function dr(e,o){let r=new Map,t=[],n=new Map,i=[],a=[],c=new Map,l,s,u;for(let[d,h]of e)c.set(d,He(d,h));for(let d of re)l=o.pieces.get(d),s=c.get(d),l?s?U(l,s.piece)||(i.push(s),a.push(He(d,l))):a.push(He(d,l)):s&&i.push(s);for(let d of a)s=lr(d,i.filter(h=>U(d.piece,h.piece))),s&&(u=[s.pos[0]-d.pos[0],s.pos[1]-d.pos[1]],r.set(d.key,u.concat(u)),t.push(s.key));for(let d of i)t.includes(d.key)||n.set(d.key,d.piece);return{anims:r,fadings:n}}function io(e,o){let r=e.animation.current;if(r===void 0){e.dom.destroyed||e.dom.redrawNow();return}let t=1-(o-r.start)*r.frequency;if(t<=0)e.animation.current=void 0,e.dom.redrawNow();else{let n=pr(t);for(let i of r.plan.anims.values())i[2]=i[0]*n,i[3]=i[1]*n;e.dom.redrawNow(!0),requestAnimationFrame((i=performance.now())=>io(e,i))}}function ur(e,o){let r=new Map(o.pieces),t=e(o),n=dr(r,o);if(n.anims.size||n.fadings.size){let i=o.animation.current&&o.animation.current.start;o.animation.current={start:performance.now(),frequency:1/o.animation.duration,plan:n},i||io(o,performance.now())}else o.dom.redraw();return t}var pr=e=>e<.5?4*e*e*e:(e-1)*(2*e-2)*(2*e-2)+1;var fr=["green","red","blue","yellow"];function ao(e,o){if(o.touches&&o.touches.length>1)return;o.stopPropagation(),o.preventDefault(),o.ctrlKey?P(e):Y(e);let r=R(o),t=A(r,v(e),e.dom.bounds());t&&(e.drawable.current={orig:t,pos:r,brush:gr(o),snapToValidMove:e.drawable.defaultSnapToValidMove},co(e))}function co(e){requestAnimationFrame(()=>{let o=e.drawable.current;if(o){let r=A(o.pos,v(e),e.dom.bounds());r||(o.snapToValidMove=!1);let t=o.snapToValidMove?ro(o.orig,o.pos,v(e),e.dom.bounds()):r;t!==o.mouseSq&&(o.mouseSq=t,o.dest=t!==o.orig?t:void 0,e.dom.redrawNow()),co(e)}})}function so(e,o){e.drawable.current&&(e.drawable.current.pos=R(o))}function lo(e){let o=e.drawable.current;o&&(o.mouseSq&&mr(e.drawable,o),Te(e))}function Te(e){e.drawable.current&&(e.drawable.current=void 0,e.dom.redraw())}function uo(e){e.drawable.shapes.length&&(e.drawable.shapes=[],e.dom.redraw(),po(e.drawable))}function gr(e){var t;let o=(e.shiftKey||e.ctrlKey)&&ie(e),r=e.altKey||e.metaKey||((t=e.getModifierState)==null?void 0:t.call(e,"AltGraph"));return fr[(o?1:0)+(r?2:0)]}function mr(e,o){let r=n=>n.orig===o.orig&&n.dest===o.dest,t=e.shapes.find(r);t&&(e.shapes=e.shapes.filter(n=>!r(n))),(!t||t.brush!==o.brush)&&e.shapes.push({orig:o.orig,dest:o.dest,brush:o.brush}),po(e)}function po(e){e.onChange&&e.onChange(e.shapes)}function fo(e,o){if(!(e.trustAllEvents||o.isTrusted)||o.buttons!==void 0&&o.buttons>1||o.touches&&o.touches.length>1)return;let r=e.dom.bounds(),t=R(o),n=A(t,v(e),r);if(!n)return;let i=e.pieces.get(n),a=e.selected;if(!a&&e.drawable.enabled&&(e.drawable.eraseOnClick||!i||i.color!==e.turnColor)&&uo(e),o.cancelable!==!1&&(!o.touches||e.blockTouchScroll||i||a||br(e,t)))o.preventDefault();else if(o.touches)return;let c=!!e.premovable.current,l=!!e.predroppable.current;e.stats.ctrlKey=o.ctrlKey,e.selected&&le(e,e.selected,n)?O(d=>X(d,n),e):X(e,n);let s=e.selected===n,u=vo(e,n);if(i&&u&&s&&_e(e,n)){e.draggable.current={orig:n,piece:i,origPos:t,pos:t,started:e.draggable.autoDistance&&e.stats.dragged,element:u,previouslySelected:a,originTarget:o.target,keyHasChanged:!1},u.cgDragging=!0,u.classList.add("dragging");let d=e.dom.elements.ghost;d&&(d.className=`ghost ${i.color} ${i.role}`,k(d,G(r)(g(n),v(e))),Z(d,!0)),qe(e)}else c&&D(e),l&&E(e);e.dom.redraw()}function br(e,o){let r=v(e),t=e.dom.bounds(),n=Math.pow(t.width/8,2);for(let i of e.pieces.keys()){let a=ae(i,r,t);if(L(a,o)<=n)return!0}return!1}function go(e,o,r,t){let n="a0";e.pieces.set(n,o),e.dom.redraw();let i=R(r);e.draggable.current={orig:n,piece:o,origPos:i,pos:i,started:!0,element:()=>vo(e,n),originTarget:r.target,newPiece:!0,force:!!t,keyHasChanged:!1},qe(e)}function qe(e){requestAnimationFrame(()=>{var t;let o=e.draggable.current;if(!o)return;(t=e.animation.current)!=null&&t.plan.anims.has(o.orig)&&(e.animation.current=void 0);let r=e.pieces.get(o.orig);if(!r||!U(r,o.piece))z(e);else if(!o.started&&L(o.pos,o.origPos)>=Math.pow(e.draggable.distance,2)&&(o.started=!0),o.started){if(typeof o.element=="function"){let i=o.element();if(!i)return;i.cgDragging=!0,i.classList.add("dragging"),o.element=i}let n=e.dom.bounds();k(o.element,[o.pos[0]-n.left-n.width/16,o.pos[1]-n.top-n.height/16]),o.keyHasChanged||(o.keyHasChanged=o.orig!==A(o.pos,v(e),n))}qe(e)})}function mo(e,o){e.draggable.current&&(!o.touches||o.touches.length<2)&&(e.draggable.current.pos=R(o))}function ho(e,o){let r=e.draggable.current;if(!r)return;if(o.type==="touchend"&&o.cancelable!==!1&&o.preventDefault(),o.type==="touchend"&&r.originTarget!==o.target&&!r.newPiece){e.draggable.current=void 0;return}D(e),E(e);let t=R(o)||r.pos,n=A(t,v(e),e.dom.bounds());n&&r.started&&r.orig!==n?r.newPiece?se(e,r.orig,n,r.force):(e.stats.ctrlKey=o.ctrlKey,xe(e,r.orig,n)&&(e.stats.dragged=!0)):r.newPiece?e.pieces.delete(r.orig):e.draggable.deleteOnDropOff&&!n&&(e.pieces.delete(r.orig),M(e.events.change)),(r.orig===r.previouslySelected||r.keyHasChanged)&&(r.orig===n||!n)?P(e):e.selectable.enabled||P(e),bo(e),e.draggable.current=void 0,e.dom.redraw()}function z(e){let o=e.draggable.current;o&&(o.newPiece&&e.pieces.delete(o.orig),e.draggable.current=void 0,P(e),bo(e),e.dom.redraw())}function bo(e){let o=e.dom.elements;o.ghost&&Z(o.ghost,!1)}function vo(e,o){let r=e.dom.elements.board.firstChild;for(;r;){if(r.cgKey===o&&r.tagName==="PIECE")return r;r=r.nextSibling}}function So(e,o){e.exploding={stage:1,keys:o},e.dom.redraw(),setTimeout(()=>{yo(e,2),setTimeout(()=>yo(e,void 0),120)},120)}function yo(e,o){e.exploding&&(o?e.exploding.stage=o:e.exploding=void 0,e.dom.redraw())}function wo(e,o){function r(){Ze(e),o()}return{set(t){t.orientation&&t.orientation!==e.orientation&&r(),Ae(e,t),(t.fen?O:B)(n=>ue(n,t),e)},state:e,getFen:()=>to(e.pieces),toggleOrientation:r,setPieces(t){O(n=>Qe(n,t),e)},selectSquare(t,n){t?O(i=>X(i,t,n),e):e.selected&&(P(e),e.dom.redraw())},move(t,n){O(i=>Me(i,t,n),e)},newPiece(t,n){O(i=>ce(i,t,n),e)},playPremove(){if(e.premovable.current){if(O(eo,e))return!0;e.dom.redraw()}return!1},playPredrop(t){if(e.predroppable.current){let n=oo(e,t);return e.dom.redraw(),n}return!1},cancelPremove(){B(D,e)},cancelPredrop(){B(E,e)},cancelMove(){B(t=>{Y(t),z(t)},e)},stop(){B(t=>{Ce(t),z(t)},e)},explode(t){So(e,t)},setAutoShapes(t){B(n=>n.drawable.autoShapes=t,e)},setShapes(t){B(n=>n.drawable.shapes=t,e)},getKeyAtDomPos(t){return A(t,v(e),e.dom.bounds())},redrawAll:o,dragNewPiece(t,n,i){go(e,t,n,i)},destroy(){Ce(e),e.dom.unbind&&e.dom.unbind(),e.dom.destroyed=!0}}}function Po(){return{pieces:de(Ee),orientation:"white",turnColor:"white",coordinates:!0,coordinatesOnSquares:!1,ranksPosition:"right",autoCastle:!0,viewOnly:!1,disableContextMenu:!1,addPieceZIndex:!1,blockTouchScroll:!1,pieceKey:!1,trustAllEvents:!1,highlight:{lastMove:!0,check:!0},animation:{enabled:!0,duration:200},movable:{free:!0,color:"both",showDests:!0,events:{},rookCastle:!0},premovable:{enabled:!0,showDests:!0,castle:!0,events:{}},predroppable:{enabled:!1,events:{}},draggable:{enabled:!0,distance:3,autoDistance:!0,showGhost:!0,deleteOnDropOff:!1},dropmode:{active:!1},selectable:{enabled:!0},stats:{dragged:!("ontouchstart"in window)},events:{},drawable:{enabled:!0,visible:!0,defaultSnapToValidMove:!0,eraseOnClick:!0,shapes:[],autoShapes:[],brushes:{green:{key:"g",color:"#15781B",opacity:1,lineWidth:10},red:{key:"r",color:"#882020",opacity:1,lineWidth:10},blue:{key:"b",color:"#003088",opacity:1,lineWidth:10},yellow:{key:"y",color:"#e68f00",opacity:1,lineWidth:10},paleBlue:{key:"pb",color:"#003088",opacity:.4,lineWidth:15},paleGreen:{key:"pg",color:"#15781B",opacity:.4,lineWidth:15},paleRed:{key:"pr",color:"#882020",opacity:.4,lineWidth:15},paleGrey:{key:"pgr",color:"#4a4a4a",opacity:.35,lineWidth:15},purple:{key:"purple",color:"#68217a",opacity:.65,lineWidth:10},pink:{key:"pink",color:"#ee2080",opacity:.5,lineWidth:10},white:{key:"white",color:"white",opacity:1,lineWidth:10}},prevSvgHash:""},hold:Ie()}}var Mo={hilitePrimary:{key:"hilitePrimary",color:"#3291ff",opacity:1,lineWidth:1},hiliteWhite:{key:"hiliteWhite",color:"#ffffff",opacity:1,lineWidth:1}};function ko(){let e=y("defs"),o=S(y("filter"),{id:"cg-filter-blur"});return o.appendChild(S(y("feGaussianBlur"),{stdDeviation:"0.019"})),e.appendChild(o),e}function Co(e,o,r){var h;let t=e.drawable,n=t.current,i=n&&n.mouseSq?n:void 0,a=new Map,c=e.dom.bounds(),l=t.autoShapes.filter(m=>!m.piece);for(let m of t.shapes.concat(l).concat(i?[i]:[])){if(!m.dest)continue;let f=(h=a.get(m.dest))!=null?h:new Set,p=ge(fe(g(m.orig),e.orientation),c),N=ge(fe(g(m.dest),e.orientation),c);f.add(Oe(p,N)),a.set(m.dest,f)}let s=t.shapes.concat(l).map(m=>({shape:m,current:!1,hash:xo(m,Re(m.dest,a),!1,c)}));i&&s.push({shape:i,current:!0,hash:xo(i,Re(i.dest,a),!0,c)});let u=s.map(m=>m.hash).join(";");if(u===e.drawable.prevSvgHash)return;e.drawable.prevSvgHash=u;let d=o.querySelector("defs");yr(t,s,d),Sr(s,o.querySelector("g"),r.querySelector("g"),m=>Mr(e,m,t.brushes,a,c))}function yr(e,o,r){var c;let t=new Map,n;for(let l of o.filter(s=>s.shape.dest&&s.shape.brush))n=Do(e.brushes[l.shape.brush],l.shape.modifiers),(c=l.shape.modifiers)!=null&&c.hilite&&t.set(pe(n).key,pe(n)),t.set(n.key,n);let i=new Set,a=r.firstElementChild;for(;a;)i.add(a.getAttribute("cgKey")),a=a.nextElementSibling;for(let[l,s]of t.entries())i.has(l)||r.appendChild(kr(s))}function Sr(e,o,r,t){let n=new Map;for(let i of e)n.set(i.hash,!1);for(let i of[o,r]){let a=[],c=i.firstElementChild,l;for(;c;)l=c.getAttribute("cgHash"),n.has(l)?n.set(l,!0):a.push(c),c=c.nextElementSibling;for(let s of a)i.removeChild(s)}for(let i of e.filter(a=>!n.get(a.hash)))for(let a of t(i))a.isCustom?r.appendChild(a.el):o.appendChild(a.el)}function xo({orig:e,dest:o,brush:r,piece:t,modifiers:n,customSvg:i,label:a},c,l,s){var u,d;return[s.width,s.height,l,e,o,r,c&&"-",t&&wr(t),n&&Pr(n),i&&`custom-${Ko(i.html)},${(d=(u=i.center)==null?void 0:u[0])!=null?d:"o"}`,a&&`label-${Ko(a.text)}`].filter(h=>h).join(",")}function wr(e){return[e.color,e.role,e.scale].filter(o=>o).join(",")}function Pr(e){return[e.lineWidth,e.hilite&&"*"].filter(o=>o).join(",")}function Ko(e){let o=0;for(let r=0;r<e.length;r++)o=(o<<5)-o+e.charCodeAt(r)>>>0;return o.toString()}function Mr(e,{shape:o,current:r,hash:t},n,i,a){var h,m;let c=ge(fe(g(o.orig),e.orientation),a),l=o.dest?ge(fe(g(o.dest),e.orientation),a):c,s=o.brush&&Do(n[o.brush],o.modifiers),u=i.get(o.dest),d=[];if(s){let f=S(y("g"),{cgHash:t});d.push({el:f}),c[0]!==l[0]||c[1]!==l[1]?f.appendChild(Kr(o,s,c,l,r,Re(o.dest,i))):f.appendChild(xr(n[o.brush],c,r,a))}if(o.label){let f=o.label;(h=f.fill)!=null||(f.fill=o.brush&&n[o.brush].color);let p=o.brush?void 0:"tr";d.push({el:Cr(f,t,c,l,u,p),isCustom:!0})}if(o.customSvg){let f=(m=o.customSvg.center)!=null?m:"orig",[p,N]=f==="label"?Ao(c,l,u).map(x=>x-.5):f==="dest"?l:c,K=S(y("g"),{transform:`translate(${p},${N})`,cgHash:t});K.innerHTML=`<svg width="1" height="1" viewBox="0 0 100 100">${o.customSvg.html}</svg>`,d.push({el:K,isCustom:!0})}return d}function xr(e,o,r,t){let n=Dr(),i=(t.width+t.height)/(4*Math.max(t.width,t.height));return S(y("circle"),{stroke:e.color,"stroke-width":n[r?0:1],fill:"none",opacity:Eo(e,r),cx:o[0],cy:o[1],r:i-n[1]/2})}function pe(e){return["#ffffff","#fff","white"].includes(e.color)?Mo.hilitePrimary:Mo.hiliteWhite}function Kr(e,o,r,t,n,i){var s;function a(u){var K;let d=Ar(i&&!n),h=t[0]-r[0],m=t[1]-r[1],f=Math.atan2(m,h),p=Math.cos(f)*d,N=Math.sin(f)*d;return S(y("line"),{stroke:u?pe(o).color:o.color,"stroke-width":Er(o,n)+(u?.04:0),"stroke-linecap":"round","marker-end":`url(#arrowhead-${u?pe(o).key:o.key})`,opacity:(K=e.modifiers)!=null&&K.hilite?1:Eo(o,n),x1:r[0],y1:r[1],x2:t[0]-p,y2:t[1]-N})}if(!((s=e.modifiers)!=null&&s.hilite))return a(!1);let c=y("g"),l=S(y("g"),{filter:"url(#cg-filter-blur)"});return l.appendChild(Nr(r,t)),l.appendChild(a(!0)),c.appendChild(l),c.appendChild(a(!1)),c}function kr(e){let o=S(y("marker"),{id:"arrowhead-"+e.key,orient:"auto",overflow:"visible",markerWidth:4,markerHeight:4,refX:e.key.startsWith("hilite")?1.86:2.05,refY:2});return o.appendChild(S(y("path"),{d:"M0,0 V4 L3,2 Z",fill:e.color})),o.setAttribute("cgKey",e.key),o}function Cr(e,o,r,t,n,i){var h;let c=.4*ve(.75,e.text.length),l=Ao(r,t,n),s=i==="tr"?.4:0,u=S(y("g"),{transform:`translate(${l[0]+s},${l[1]-s})`,cgHash:o});u.appendChild(S(y("circle"),{r:.4/2,"fill-opacity":i?1:.8,"stroke-opacity":i?1:.7,"stroke-width":.03,fill:(h=e.fill)!=null?h:"#666",stroke:"white"}));let d=S(y("text"),{"font-size":c,"font-family":"Noto Sans","text-anchor":"middle",fill:"white",y:.13*ve(.75,e.text.length)});return d.innerHTML=e.text,u.appendChild(d),u}function fe(e,o){return o==="white"?e:[7-e[0],7-e[1]]}function Re(e,o){return(e&&o.has(e)&&o.get(e).size>1)===!0}function y(e){return document.createElementNS("http://www.w3.org/2000/svg",e)}function S(e,o){for(let r in o)Object.prototype.hasOwnProperty.call(o,r)&&e.setAttribute(r,o[r]);return e}function Do(e,o){return o?{color:e.color,opacity:Math.round(e.opacity*10)/10,lineWidth:Math.round(o.lineWidth||e.lineWidth),key:[e.key,o.lineWidth].filter(r=>r).join("")}:e}function Dr(){return[3/64,4/64]}function Er(e,o){return(e.lineWidth||10)*(o?.85:1)/64}function Eo(e,o){return(e.opacity||1)*(o?.9:1)}function Ar(e){return(e?20:10)/64}function ge(e,o){let r=Math.min(1,o.width/o.height),t=Math.min(1,o.height/o.width);return[(e[0]-3.5)*r,(3.5-e[1])*t]}function Nr(e,o){let r={from:[Math.floor(Math.min(e[0],o[0])),Math.floor(Math.min(e[1],o[1]))],to:[Math.ceil(Math.max(e[0],o[0])),Math.ceil(Math.max(e[1],o[1]))]};return S(y("rect"),{x:r.from[0],y:r.from[1],width:r.to[0]-r.from[0],height:r.to[1]-r.from[1],fill:"none",stroke:"none"})}function Oe(e,o,r=!0){let t=Math.atan2(o[1]-e[1],o[0]-e[0])+Math.PI;return r?(Math.round(t*8/Math.PI)+16)%16:t}function Hr(e,o){return Math.sqrt([e[0]-o[0],e[1]-o[1]].reduce((r,t)=>r+t*t,0))}function Ao(e,o,r){let t=Hr(e,o),n=Oe(e,o,!1);if(r&&(t-=33/64,r.size>1)){t-=10/64;let i=Oe(e,o);(r.has((i+1)%16)||r.has((i+15)%16))&&i&1&&(t-=.4)}return[e[0]-Math.cos(n)*t,e[1]-Math.sin(n)*t].map(i=>i+.5)}function No(e,o){e.innerHTML="",e.classList.add("cg-wrap");for(let l of We)e.classList.toggle("orientation-"+l,o.orientation===l);e.classList.toggle("manipulable",!o.viewOnly);let r=C("cg-container");e.appendChild(r);let t=C("cg-board");r.appendChild(t);let n,i,a;if(o.drawable.visible&&(n=S(y("svg"),{class:"cg-shapes",viewBox:"-4 -4 8 8",preserveAspectRatio:"xMidYMid slice"}),n.appendChild(ko()),n.appendChild(y("g")),i=S(y("svg"),{class:"cg-custom-svgs",viewBox:"-3.5 -3.5 8 8",preserveAspectRatio:"xMidYMid slice"}),i.appendChild(y("g")),a=C("cg-auto-pieces"),r.appendChild(n),r.appendChild(i),r.appendChild(a)),o.coordinates){let l=o.orientation==="black"?" black":"",s=o.ranksPosition==="left"?" left":"";if(o.coordinatesOnSquares){let u=o.orientation==="white"?d=>d+1:d=>8-d;W.forEach((d,h)=>r.appendChild(Be($.map(m=>d+m),"squares rank"+u(h)+l+s)))}else r.appendChild(Be($,"ranks"+l+s)),r.appendChild(Be(W,"files"+l))}let c;return o.draggable.enabled&&o.draggable.showGhost&&(c=C("piece","ghost"),Z(c,!1),r.appendChild(c)),{board:t,container:r,wrap:e,ghost:c,svg:n,customSvg:i,autoPieces:a}}function Be(e,o){let r=C("coords",o),t;for(let n of e)t=C("coord"),t.textContent=n,r.appendChild(t);return r}function Ho(e,o){if(!e.dropmode.active)return;D(e),E(e);let r=e.dropmode.piece;if(r){e.pieces.set("a0",r);let t=R(o),n=t&&A(t,v(e),e.dom.bounds());n&&se(e,"a0",n)}e.dom.redraw()}function qo(e,o){let r=e.dom.elements.board;if("ResizeObserver"in window&&new ResizeObserver(o).observe(e.dom.elements.wrap),(e.disableContextMenu||e.drawable.enabled)&&r.addEventListener("contextmenu",n=>n.preventDefault()),e.viewOnly)return;let t=qr(e);r.addEventListener("touchstart",t,{passive:!1}),r.addEventListener("mousedown",t,{passive:!1})}function Ro(e,o){let r=[];if("ResizeObserver"in window||r.push(J(document.body,"chessground.resize",o)),!e.viewOnly){let t=To(e,mo,so),n=To(e,ho,lo);for(let a of["touchmove","mousemove"])r.push(J(document,a,t));for(let a of["touchend","mouseup"])r.push(J(document,a,n));let i=()=>e.dom.bounds.clear();r.push(J(document,"scroll",i,{capture:!0,passive:!0})),r.push(J(window,"resize",i,{passive:!0}))}return()=>r.forEach(t=>t())}function J(e,o,r,t){return e.addEventListener(o,r,t),()=>e.removeEventListener(o,r,t)}var qr=e=>o=>{e.draggable.current?z(e):e.drawable.current?Te(e):o.shiftKey||ie(o)?e.drawable.enabled&&ao(e,o):e.viewOnly||(e.dropmode.active?Ho(e,o):fo(e,o))},To=(e,o,r)=>t=>{e.drawable.current?e.drawable.enabled&&r(e,t):e.viewOnly||o(e,t)};function Bo(e){let o=v(e),r=G(e.dom.bounds()),t=e.dom.elements.board,n=e.pieces,i=e.animation.current,a=i?i.plan.anims:new Map,c=i?i.plan.fadings:new Map,l=e.draggable.current,s=Or(e),u=new Set,d=new Set,h=new Map,m=new Map,f,p,N,K,x,I,me,H,he,ee;for(p=t.firstChild;p;){if(f=p.cgKey,Lo(p))if(N=n.get(f),x=a.get(f),I=c.get(f),K=p.cgPiece,p.cgDragging&&(!l||l.orig!==f)&&(p.classList.remove("dragging"),k(p,r(g(f),o)),p.cgDragging=!1),!I&&p.cgFading&&(p.cgFading=!1,p.classList.remove("fading")),N){if(x&&p.cgAnimating&&K===_(N)){let b=g(f);b[0]+=x[2],b[1]+=x[3],p.classList.add("anim"),k(p,r(b,o))}else p.cgAnimating&&(p.cgAnimating=!1,p.classList.remove("anim"),k(p,r(g(f),o)),e.addPieceZIndex&&(p.style.zIndex=Ve(g(f),o)));K===_(N)&&(!I||!p.cgFading)?u.add(f):I&&K===_(I)?(p.classList.add("fading"),p.cgFading=!0):Le(h,K,p)}else Le(h,K,p);else if(Go(p)){let b=p.className;s.get(f)===b?d.add(f):Le(m,b,p)}p=p.nextSibling}for(let[b,j]of s)if(!d.has(b)){he=m.get(j),ee=he&&he.pop();let T=r(g(b),o);if(ee)ee.cgKey=b,k(ee,T);else{let q=C("square",j);q.cgKey=b,k(q,T),t.insertBefore(q,t.firstChild)}}for(let[b,j]of n)if(x=a.get(b),!u.has(b))if(me=h.get(_(j)),H=me&&me.pop(),H){H.cgKey=b,H.cgFading&&(H.classList.remove("fading"),H.cgFading=!1);let T=g(b);e.addPieceZIndex&&(H.style.zIndex=Ve(T,o)),x&&(H.cgAnimating=!0,H.classList.add("anim"),T[0]+=x[2],T[1]+=x[3]),k(H,r(T,o))}else{let T=_(j),q=C("piece",T),oe=g(b);q.cgPiece=T,q.cgKey=b,x&&(q.cgAnimating=!0,oe[0]+=x[2],oe[1]+=x[3]),k(q,r(oe,o)),e.addPieceZIndex&&(q.style.zIndex=Ve(oe,o)),t.appendChild(q)}for(let b of h.values())Oo(e,b);for(let b of m.values())Oo(e,b)}function Vo(e){let o=v(e),r=G(e.dom.bounds()),t=e.dom.elements.board.firstChild;for(;t;)(Lo(t)&&!t.cgAnimating||Go(t))&&k(t,r(g(t.cgKey),o)),t=t.nextSibling}function Ge(e){var a,c;let o=e.dom.elements.wrap.getBoundingClientRect(),r=e.dom.elements.container,t=o.height/o.width,n=Math.floor(o.width*window.devicePixelRatio/8)*8/window.devicePixelRatio,i=n*t;r.style.width=n+"px",r.style.height=i+"px",e.dom.bounds.clear(),(a=e.addDimensionsCssVarsTo)==null||a.style.setProperty("---cg-width",n+"px"),(c=e.addDimensionsCssVarsTo)==null||c.style.setProperty("---cg-height",i+"px")}var Lo=e=>e.tagName==="PIECE",Go=e=>e.tagName==="SQUARE";function Oo(e,o){for(let r of o)e.dom.elements.board.removeChild(r)}function Ve(e,o){let t=e[1];return`${o?10-t:3+t}`}var _=e=>`${e.color} ${e.role}`;function Or(e){var n,i,a;let o=new Map;if(e.lastMove&&e.highlight.lastMove)for(let c of e.lastMove)V(o,c,"last-move");if(e.check&&e.highlight.check&&V(o,e.check,"check"),e.selected&&(V(o,e.selected,"selected"),e.movable.showDests)){let c=(n=e.movable.dests)==null?void 0:n.get(e.selected);if(c)for(let s of c)V(o,s,"move-dest"+(e.pieces.has(s)?" oc":""));let l=(a=(i=e.premovable.customDests)==null?void 0:i.get(e.selected))!=null?a:e.premovable.dests;if(l)for(let s of l)V(o,s,"premove-dest"+(e.pieces.has(s)?" oc":""))}let r=e.premovable.current;if(r)for(let c of r)V(o,c,"current-premove");else e.predroppable.current&&V(o,e.predroppable.current.key,"current-premove");let t=e.exploding;if(t)for(let c of t.keys)V(o,c,"exploding"+t.stage);return e.highlight.custom&&e.highlight.custom.forEach((c,l)=>{V(o,l,c)}),o}function V(e,o,r){let t=e.get(o);t?e.set(o,`${t} ${r}`):e.set(o,r)}function Le(e,o,r){let t=e.get(o);t?t.push(r):e.set(o,[r])}function Wo(e,o,r){let t=new Map,n=[];for(let c of e)t.set(c.hash,!1);let i=o.firstElementChild,a;for(;i;)a=i.getAttribute("cgHash"),t.has(a)?t.set(a,!0):n.push(i),i=i.nextElementSibling;for(let c of n)o.removeChild(c);for(let c of e)t.get(c.hash)||o.appendChild(r(c))}function Fo(e,o){let t=e.drawable.autoShapes.filter(n=>n.piece).map(n=>({shape:n,hash:Vr(n),current:!1}));Wo(t,o,n=>Br(e,n,e.dom.bounds()))}function zo(e){var n;let o=v(e),r=G(e.dom.bounds()),t=(n=e.dom.elements.autoPieces)==null?void 0:n.firstChild;for(;t;)ye(t,r(g(t.cgKey),o),t.cgScale),t=t.nextSibling}function Br(e,{shape:o,hash:r},t){var s,u,d;let n=o.orig,i=(s=o.piece)==null?void 0:s.role,a=(u=o.piece)==null?void 0:u.color,c=(d=o.piece)==null?void 0:d.scale,l=C("piece",`${i} ${a}`);return l.setAttribute("cgHash",r),l.cgKey=n,l.cgScale=c,ye(l,G(t)(g(n),v(e)),c),l}var Vr=e=>{var o,r,t;return[e.orig,(o=e.piece)==null?void 0:o.role,(r=e.piece)==null?void 0:r.color,(t=e.piece)==null?void 0:t.scale].join(",")};function Gr({el:e,config:o}){return $o(e,o)}function $o(e,o){let r=Po();ue(r,o||{});function t(){let n="dom"in r?r.dom.unbind:void 0,i=No(e,r),a=$e(()=>i.board.getBoundingClientRect()),c=u=>{Bo(s),i.autoPieces&&Fo(s,i.autoPieces),!u&&i.svg&&Co(s,i.svg,i.customSvg)},l=()=>{Ge(s),Vo(s),i.autoPieces&&zo(s)},s=r;return s.dom={elements:i,bounds:a,redraw:Wr(c),redrawNow:c,unbind:n},s.drawable.prevSvgHash="",Ge(s),c(!1),qo(s,l),n||(s.dom.unbind=Ro(s,l)),s.events.insert&&s.events.insert(i),s}return wo(t(),t)}function Wr(e){let o=!1;return()=>{o||(o=!0,requestAnimationFrame(()=>{e(),o=!1}))}}return Xo(Fr);})();
