const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {zip, jpegDensity, crc32} = require('../wordpress-plugin/embrace-journal/assets/export-files.js');

async function run() {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const source = Uint8Array.from([255,216,255,218,0,2,11,12,255,217]);
  const withDensity = jpegDensity(source, 300);
  assert.deepEqual([...withDensity.slice(2,20)], [255,224,0,16,74,70,73,70,0,1,1,1,1,44,1,44,0,0]);
  assert.deepEqual(withDensity.slice(20), source.slice(2));
  const updated = jpegDensity(withDensity, 600);
  assert.equal(updated.length, withDensity.length);
  assert.deepEqual([...updated.slice(14,18)], [2,88,2,88]);
  assert.deepEqual(updated.slice(20), source.slice(2));
  assert.deepEqual([...withDensity.slice(14,18)], [1,44,1,44]);
  assert.throws(() => jpegDensity(source, 72));
  assert.throws(() => jpegDensity(Uint8Array.of(0,1), 300));

  // An independent ZIP reader verifies offsets, CRC, Unicode and exact payloads.
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'embrace-export-test-'));
  const output = path.join(temp, 'pages.zip');
  try {
    fs.writeFileSync(output, Buffer.from(await zip([
      {name:'page-001.jpg', data:updated},
      {name:'страница-002.jpg', data:Uint8Array.from([0,255,17,42])}
    ]).arrayBuffer()));
    const check = spawnSync('python', ['-c', `
import sys,zipfile
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.namelist()==['page-001.jpg','страница-002.jpg']
 assert z.testzip() is None
 assert all(i.compress_type==zipfile.ZIP_STORED for i in z.infolist())
 assert z.read('page-001.jpg')==bytes([255,216,255,224,0,16,74,70,73,70,0,1,1,1,2,88,2,88,0,0,255,218,0,2,11,12,255,217])
 assert z.read('страница-002.jpg')==bytes([0,255,17,42])
`, output], {encoding:'utf8'});
    assert.equal(check.status, 0, check.error?.message || check.stderr);
  } finally {
    if (fs.existsSync(output)) fs.unlinkSync(output);
    fs.rmdirSync(temp);
  }
  console.log('PASS: JPEG density preserves image payload; ZIP CRC, order, Unicode and unchanged bytes.');
}
run().catch(e => {console.error(e); process.exit(1);});
