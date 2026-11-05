/* Binary export helpers. ZIP stores JPEG bytes unchanged (no recompression). */
(function(root){
  'use strict';
  function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
  function header(size){const bytes=new Uint8Array(size);return {bytes,view:new DataView(bytes.buffer)};}
  function zip(entries){
    const parts=[],directory=[];let offset=0,centralSize=0;
    for(const entry of entries){
      const name=new TextEncoder().encode(entry.name),data=entry.data,crc=crc32(data);
      if(data.length>0xffffffff||offset+data.length+name.length+30>0xffffffff)throw Error('Архив слишком большой');
      const local=header(30),v=local.view;v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);
      parts.push(local.bytes,name,data);
      const central=header(46),c=central.view;c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,33,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);
      directory.push(central.bytes,name);centralSize+=46+name.length;offset+=30+name.length+data.length;
    }
    if(entries.length>65535||offset+centralSize>0xffffffff)throw Error('Архив слишком большой');
    const end=header(22),v=end.view;v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
    return new Blob([...parts,...directory,end.bytes],{type:'application/zip'});
  }
  function jpegDensity(source,dpi){
    if(![300,600].includes(dpi)||source[0]!==255||source[1]!==216)throw Error('Некорректный JPEG');
    const bytes=source.slice();
    // Canvas encoders normally emit JFIF. Update only resolution metadata.
    for(let pos=2;pos+4<bytes.length;){
      if(bytes[pos]!==255)break;const marker=bytes[pos+1];if(marker===218||marker===217)break;
      const size=(bytes[pos+2]<<8)|bytes[pos+3];if(size<2||pos+size+2>bytes.length)break;
      if(marker===224&&size>=16&&bytes[pos+4]===74&&bytes[pos+5]===70&&bytes[pos+6]===73&&bytes[pos+7]===70&&bytes[pos+8]===0){bytes[pos+11]=1;bytes[pos+12]=dpi>>8;bytes[pos+13]=dpi&255;bytes[pos+14]=dpi>>8;bytes[pos+15]=dpi&255;return bytes;}
      pos+=size+2;
    }
    const jfif=new Uint8Array([255,224,0,16,74,70,73,70,0,1,1,1,dpi>>8,dpi&255,dpi>>8,dpi&255,0,0]);
    const result=new Uint8Array(bytes.length+jfif.length);result.set(bytes.subarray(0,2));result.set(jfif,2);result.set(bytes.subarray(2),20);return result;
  }
  const api={zip,jpegDensity,crc32};if(typeof module==='object'&&module.exports)module.exports=api;else root.EmbraceExportFiles=api;
})(typeof window==='undefined'?globalThis:window);
