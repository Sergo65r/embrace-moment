const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),M=require('../wordpress-plugin/embrace-journal/assets/editor-model.js');
const source=fs.readFileSync('wordpress-plugin/embrace-journal/assets/editor.js','utf8');
const block=source.slice(source.indexOf('  function gestureHit('),source.indexOf('  function editedInput('));
let stack=[],checkpoints=0,saves=0,fits=0,opens=0;
const area={scrollTop:100,scrollLeft:50},layer={scrollTop:0},node={style:{},querySelector:()=>null};
let e={id:'item',type:'text',x:100,y:100,w:200,h:200,rotation:30};
const c={M,active:true,gesture:null,selected:'item',inputSession:null,scale:.5,GESTURE_CENTER:1100,
 document:{elementsFromPoint:()=>stack},$:s=>s==='.ed-gesture-layer'?layer:s==='.ed-workspace'?area:s==='.ed-element.selected'?node:null,
 page:()=>({elements:[e]}),checkpoint:()=>checkpoints++,fitTextToFrame:()=>{fits++;return true},style:()=>'',
 snapMove:(e,x,y)=>({x,y,guides:{}}),showGuides:()=>{},clearGuides:()=>{},updateBindingWarning:()=>{},updateSelectionControls:()=>{},
 paper:()=>{},panel:()=>{},render:()=>{},schedule:()=>saves++,openPanel:()=>opens++,closePanel:()=>{}};
vm.createContext(c);vm.runInContext(block,c);
const target=corner=>({dataset:{element:'item',resize:corner},matches:()=>!!corner,closest:()=>corner?null:target()});
const event=(x,y,type='touchmove',count=1)=>({type,touches:Array.from({length:count},(_,i)=>({identifier:i+1,clientX:x,clientY:y})),changedTouches:[{identifier:1,clientX:x,clientY:y}]});
for(const corner of ['nw','ne','sw','se']){
 e={...e,x:100,y:100,w:200,h:200,locked:false};stack=[target(corner)];const before={...e},n=checkpoints;
 c.beginCanvasTouch(event(100,100,'touchstart'));assert.equal(c.gesture.resize,corner);c.scale=.25;
 c.moveCanvasTouch(event(120,130));const expected=M.resizeCorner(before,corner,40,60);
 for(const k of ['x','y','w','h'])assert.equal(e[k],expected[k]);
 c.moveCanvasTouch(event(125,135));assert.equal(checkpoints,n+1);c.finishCanvasTouch(event(125,135,'touchend'));assert.equal(c.gesture,null);c.scale=.5;
}
assert.equal(saves,4);assert.equal(fits,8);
e.locked=true;stack=[target()];const before={...e};c.beginCanvasTouch(event(100,100,'touchstart'));c.moveCanvasTouch(event(90,80));c.finishCanvasTouch(event(90,80,'touchend'));assert.deepEqual(e,before);assert.equal(area.scrollTop,120);assert.equal(saves,4);
e.locked=false;stack=[target()];c.beginCanvasTouch(event(100,100,'touchstart'));c.moveCanvasTouch(event(110,120));c.beginCanvasTouch(event(110,120,'touchstart',2));assert.equal(c.gesture,null);assert.equal(saves,5);const frozen={...e};c.moveCanvasTouch(event(140,160));assert.deepEqual(e,frozen);
stack=[];c.beginCanvasTouch(event(100,100,'touchstart'));assert.equal(c.gesture.kind,'canvas-pan');c.moveCanvasTouch(event(100,80));c.finishCanvasTouch(event(100,80,'touchcancel'));assert.equal(c.gesture,null);assert.equal(saves,5);assert.equal(layer.scrollTop,1100);
console.log('PASS: touch catcher routes all four rotated corners; freezes scale; one undo checkpoint; text fit; locked layers; canvas pan; multitouch/cancel; scroll recenter.');
