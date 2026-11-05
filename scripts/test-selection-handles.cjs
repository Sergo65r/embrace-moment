const assert=require('node:assert/strict'),M=require('../wordpress-plugin/embrace-journal/assets/editor-model.js');
const bounds={left:20,top:20,right:340,bottom:440},origin={x:20,y:20};
let cases=0;
for(const rotation of [0,30,90,175])for(const [x,y] of [[-180,150],[550,150],[100,-160],[100,800],[-180,-160]]){
 const e={x,y,w:250,h:200,rotation};
 const p=M.selectionHandles(e,.5,origin,bounds);assert.equal(p.length,4);
 for(const h of p){assert(h.x>=20&&h.x<=340);assert(h.y>=20&&h.y<=440);assert(Number.isFinite(h.actualX+h.actualY));}
 for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)assert(Math.hypot(p[i].x-p[j].x,p[i].y-p[j].y)>20,'off-page handles must stay distinct');
 cases++;
}
const e={x:100,y:100,w:200,h:200,rotation:0};const p=M.selectionHandles(e,.5,origin,bounds);
assert.deepEqual(p.map(v=>[v.x,v.y]),[[70,70],[170,70],[70,170],[170,170]]);
console.log(`PASS: ${cases} off-page/rotated selections retain four reachable distinct handles; interior corners unchanged.`);
