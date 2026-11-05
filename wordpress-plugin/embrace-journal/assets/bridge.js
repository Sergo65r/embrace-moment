/* Public projects never call the owner save endpoint. */
(async () => {
  const c=window.EmbraceWP,M=window.MagazineModel;
  const originalCreate=M.create, seed=M.validate(c.document || originalCreate(c.base,20));
  M.create=(theme,count)=>{
    if(theme!==c.base)return originalCreate(theme,count);
    const value=M.clone(seed);value.id=M.id();
    while(value.pages.length<count)value.pages.push(M.page(theme,value.pages.length,'blank'));
    return M.validate(value);
  };
  window.saveEmbraceTemplate=async document=>{
    const response=await fetch(c.endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-WP-Nonce':c.nonce},body:JSON.stringify({document,revision:c.revision})});
    const result=await response.json();
    if(!response.ok)throw Error(result.message||'Не удалось сохранить шаблон');
    c.revision=result.revision;
  };
  if(c.author)await MagazineEditor.author(seed);
  else {
    await MagazineEditor.mount(c.base,Math.max(c.pages,seed.pages.length));
    document.querySelector('.ed-top>a').href=c.detail;
  }
})().catch(error=>{document.querySelector('#app').textContent='Не удалось открыть журнал: '+error.message;});
