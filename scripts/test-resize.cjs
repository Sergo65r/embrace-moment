const assert=require('node:assert/strict');
const M=require('../wordpress-plugin/embrace-journal/assets/editor-model.js');
function anchor(e,corner){const sx=corner.includes('w')?1:-1,sy=corner.includes('n')?1:-1,a=e.rotation*Math.PI/180;return [e.x+e.w/2+Math.cos(a)*sx*e.w/2-Math.sin(a)*sy*e.h/2,e.y+e.h/2+Math.sin(a)*sx*e.w/2+Math.cos(a)*sy*e.h/2];}
let cases=0;
for(const rotation of [0,30,-90,175])for(const corner of ['nw','ne','sw','se'])for(const [dx,dy] of [[40,65],[-80,55],[2000,-2000]]){
 const start={x:120,y:180,w:240,h:300,rotation},next={...start,...M.resizeCorner(start,corner,dx,dy)};
 const before=anchor(start,corner),after=anchor(next,corner);
 assert.ok(before.every((v,i)=>Math.abs(v-after[i])<1e-8),'opposite corner must stay anchored');
 assert.ok(next.w>=24&&next.h>=24&&next.w<=M.W*2&&next.h<=M.H*2);
 assert.ok(Math.abs(next.x)<=M.W+1e-8&&Math.abs(next.y)<=M.H+1e-8);
 cases++;
}
for(const corner of ['nw','ne','sw','se']){const start={x:100,y:100,w:200,h:300,rotation:0};const r=M.resizeCorner(start,corner,corner.includes('w')?-20:20,corner.includes('n')?-30:30);assert.equal(r.w,220);assert.equal(r.h,330);}
console.log(`PASS: ${cases} rotated, minimum-size and boundary resize cases; all four corners enlarge correctly.`);
