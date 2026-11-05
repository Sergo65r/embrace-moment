const assert=require('node:assert/strict');
const M=require('../wordpress-plugin/embrace-journal/assets/editor-model.js');
const doc=M.create('birthday',20),e=doc.pages[0].elements.find(e=>e.type==='text');
for(const size of [1,36.25,88.32,250,1200]){e.size=size;e.autoFit=true;const restored=M.validate(JSON.parse(JSON.stringify(doc)));assert.equal(restored.pages[0].elements[0].size,size);assert.equal(restored.pages[0].elements[0].autoFit,true);}
for(const size of [0,1201,NaN]){e.size=size;assert.throws(()=>M.validate(doc));}
e.size=32;e.autoFit='yes';assert.throws(()=>M.validate(doc));
console.log('PASS: fitted text sizes and mode survive project round-trip; invalid values rejected.');
