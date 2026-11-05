const assert = require('node:assert/strict');
const fs = require('node:fs');
const M = require('../wordpress-plugin/embrace-journal/assets/editor-model.js');
async function run(){
  for(const theme of Object.keys(M.themes))for(const count of [20,24,28,32,36])assert.equal(M.validate(M.create(theme,count)).pages.length,count);
  const base=process.argv[2]||'http://localhost:8881';
  const detail=await (await fetch(base+'/journal-birthday/')).text();
  assert.match(detail,/data-editor-url=/);
  for(const id of [58,59,60,61]){
    const res=await fetch(base+'/?embrace_journal='+id);assert.equal(res.status,200);
    const html=await res.text();const config=JSON.parse(html.match(/window.EmbraceWP=(.*?);<\/script>/s)[1]);
    assert.equal(config.author,false);assert.equal(config.nonce,'');M.validate(config.document);
    assert.equal((await fetch(base+'/?embrace_journal='+id+'&ej_owner=1')).status,403);
    assert.equal((await fetch(base+'/wp-json/embrace-editor/v1/template/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({document:config.document,revision:config.revision})})).status,401);
  }
  const d=M.create('birthday',20);d.pages[0].elements[0].x=-20;M.validate(d);
  d.pages[0].elements[0].color='red; background:url(x)';assert.throws(()=>M.validate(d));
  const project=process.argv[3];if(project){const saved=M.validate(JSON.parse(fs.readFileSync(project,'utf8')));assert.equal(saved.pages[0].elements.find(e=>e.text==='Анна').text,'Анна');assert.equal(Object.keys(saved.assets).length,1);assert.equal(saved.pages[0].elements.find(e=>e.type==='photo').filter,'grayscale');}
  console.log('PASS: 20 template combinations; 4 live documents; anonymous owner/save denied; validation; downloaded photo/text/filter project.');
}run().catch(e=>{console.error(e);process.exit(1);});
