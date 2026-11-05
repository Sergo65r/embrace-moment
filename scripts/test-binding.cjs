const assert=require('node:assert/strict'),M=require('../wordpress-plugin/embrace-journal/assets/editor-model.js');
assert.deepEqual(Array.from({length:6},(_,i)=>M.bindingSide(i)),['left','right','left','right','left','right']);
const left=M.text('Важно',5,100,50,40),right={...left,x:550},safe={...left,x:100};
assert.equal(M.bindingRisk(left,0),true);assert.equal(M.bindingRisk(left,1),false);
assert.equal(M.bindingRisk(right,0),false);assert.equal(M.bindingRisk(right,1),true);
assert.equal(M.bindingRisk(safe,0),false);assert.equal(M.bindingRisk(safe,1),false);
assert.equal(M.bindingRisk({...left,hidden:true},0),false);
assert.equal(M.bindingRisk({...left,text:' '},0),false);
assert.equal(M.bindingRisk({...left,y:-100},0),false);
assert.equal(M.bindingRisk({...left,x:M.BINDING_X},0),false);
assert.equal(M.bindingRisk({...left,x:35,w:100,h:100,rotation:45},0),true);
assert.equal(M.bindingRisk({...left,x:100,y:100,w:100,h:100,rotation:45},0),false);
assert.equal(M.bindingRisk({...safe,x:40},0,12),false);assert.equal(M.bindingRisk({...safe,x:40},0,20),true);
// Reordering must change the bound edge based on its new position, not the page id.
const pages=[{id:'cover',elements:[safe]},{id:'a',elements:[right]},{id:'b',elements:[left]}];
assert.equal(M.bindingRisk(pages[1].elements[0],1),true);[pages[1],pages[2]]=[pages[2],pages[1]];
assert.equal(M.bindingRisk(pages[1].elements[0],1),false);assert.equal(M.bindingRisk(pages[2].elements[0],2),false);
assert.equal(M.bindingRisk(M.photo(0,0,M.W,M.H),0),true);assert.equal(M.bindingRisk(M.photo(0,0,M.W,M.H),1),true);
console.log('PASS: alternating sides; rotated overlap; hidden/empty/off-page; edge tangency; configurable width; reordering; full-page photos.');
