const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('wordpress-plugin/embrace-journal/assets/editor.js','utf8');
const block=source.slice(source.indexOf('let viewportFrame=0'),source.indexOf('  function syncPanelLayout'));
const classes=new Set(),properties={},listeners={};
const editor={style:{setProperty:(k,v)=>properties[k]=v},classList:{toggle:(k,on)=>on?classes.add(k):classes.delete(k)}};
const label={classList:{add:()=>{}}},input={matches:()=>true,closest:()=>label};
const area={scrollTop:0,clientHeight:400};
let mobile=true;
const viewport={height:640,offsetTop:0,addEventListener:(k,f)=>listeners[k]=f};
const context={window:{visualViewport:viewport,addEventListener:()=>{}},document:{activeElement:input,querySelectorAll:()=>[],addEventListener:()=>{}},innerHeight:640,
 matchMedia:()=>({matches:mobile}),$:s=>s==='.editor'?editor:s==='.ed-workspace'?area:null,
 syncPanelLayout:()=>{},requestAnimationFrame:f=>{f();return 1},cancelAnimationFrame:()=>{},element:()=>({y:650,h:60}),scale:.5};
vm.createContext(context);vm.runInContext(block,context);
context.viewportLayout();assert(classes.has('input-focused'));assert.equal(properties['--ed-height'],'640px');
viewport.height=330;viewport.offsetTop=140;area.clientHeight=163;context.viewportLayout();
assert(classes.has('keyboard-open'));assert.equal(properties['--ed-height'],'330px');assert.equal(properties['--ed-visual-top'],'140px');assert.equal(area.scrollTop,270.5);
area.scrollTop=77;viewport.offsetTop=170;context.viewportLayout();assert.equal(area.scrollTop,77,'viewport scrolling must not fight manual canvas scrolling');assert.equal(properties['--ed-visual-top'],'170px');
context.document.activeElement={matches:()=>false};context.viewportLayout();assert(!classes.has('input-focused'));
mobile=false;context.viewportLayout();assert.equal(properties['--ed-visual-top'],'0px');assert.equal(properties['--ed-height'],'640px');
console.log('PASS: keyboard height, iOS visual offset, selected text recentering, manual scroll, blur and desktop reset.');
