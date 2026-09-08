const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const W=require('./ca-world.js');
async function main(){
  const data=JSON.parse(fs.readFileSync(__dirname+'/catalogue/index.json'));
  for(const e of data.entries){const w=await W.verify(e.world);assert.deepEqual(W.run(w.dynamics,w.observation.rowCount).rows,e.rows);assert.deepEqual(await W.verify(JSON.parse(JSON.stringify(w))),w);
    const c=w.metadata?.orbitCertificate;if(c){const rows=W.run(w.dynamics,c.checkedRows).rows;assert.equal(await W.hash(rows),c.gridSha256);assert.equal(rows[c.firstRepeatedFrom],rows[c.firstRepeatedAt]);assert.equal(new Set(rows.slice(0,c.firstRepeatedAt)).size,c.firstRepeatedAt);assert.ok(rows.every(r=>!r.includes('K')));}
  }
  assert.equal(data.entries.filter(e=>e.name.startsWith('Kitaoka')).length,1);
  const terrace=data.entries.find(e=>e.name==='Slotted terraces').world;
  const changed=structuredClone(terrace);changed.dynamics.diagnosticPropagation='output-K';
  assert.notDeepEqual(W.run(changed.dynamics,42).rows,W.run(terrace.dynamics,42).rows);
  changed.dynamics.boundary='fixed-W';assert.notDeepEqual(W.run(changed.dynamics,42).rows,W.run(terrace.dynamics,42).rows);
  for(const change of [w=>w.dynamics.width++,w=>w.dynamics.seed='',w=>w.dynamics.rules.push(w.dynamics.rules[0]),w=>w.dynamics.rules[0][1]='<script>',w=>w.geometry.phase=2,w=>w.geometry.seam='mobius',w=>w.observation.rowCount=99999,w=>w.appearance.palette.R='#ff000080',w=>w.appearance.borderWidth=NaN]){const bad=structuredClone(terrace);change(bad);assert.throws(()=>W.validate(bad));}
  const tampered=structuredClone(terrace);tampered.appearance.palette.R='#ff0000ff';await assert.rejects(()=>W.verify(tampered),/checksum/);
  const recolored=await W.seal(tampered);assert.equal(recolored.ids.dynamics,terrace.ids.dynamics);assert.equal(recolored.ids.geometry,terrace.ids.geometry);assert.notEqual(recolored.ids.appearance,terrace.ids.appearance);
  const phased=structuredClone(terrace);phased.geometry.phase=1;await W.seal(phased);assert.equal(phased.ids.dynamics,terrace.ids.dynamics);assert.notEqual(phased.ids.geometry,terrace.ids.geometry);
  const square=structuredClone(terrace);square.geometry.tessellation='square-grid';square.geometry.coordinates='unit squares at (c,r)';square.geometry.verticalUnit=10;square.appearance.borders='none';square.appearance.borderWidth=0;square.appearance.skipWhite=false;square.observation.renderer='explorer-svg-v1';await W.verify(await W.seal(square));
  assert.deepEqual(W.run({seed:'R',width:1,rules:[['RRRRRRR','G'],['GGGGGGG','R']],boundary:'periodic'},3).rows,['R','G','R']);
  const html=fs.readFileSync(__dirname+'/impossible-fractal-ca.html','utf8');for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
  // Exercise the actual editor adapter and file callbacks with controlled inputs.
  const controls=new Map(),get=id=>{if(!controls.has(id))controls.set(id,{value:'',checked:false,textContent:'',hidden:false});return controls.get(id);};
  let upload,downloaded;
  const context=vm.createContext({CAWorld:W,structuredClone,Number,Map,Set,JSON,Error,URLSearchParams,
    $:get,rules:new Map(),baseKeys:new Set(),document:{createElement(){upload={click(){}};return upload;}},
    getColors:()=>Object.fromEntries([...'WRGBK'].map(s=>[s,get('color'+s).value])),
    setColors:colors=>{for(const s of 'WRGBK')get('color'+s).value=colors[s];},
    updateRuleStatus(){},generate:()=>true,download:content=>{downloaded=JSON.parse(content);}});
  vm.runInContext(fs.readFileSync(__dirname+'/ca-world-controls.js','utf8'),context);
  for(const e of data.entries){
    context.fixture=e.world;vm.runInContext('loadWorld(fixture)',context);
    await vm.runInContext('exportWorld()',context);
    await W.verify(downloaded);assert.deepEqual(downloaded.dynamics,e.world.dynamics);
    assert.deepEqual(W.run(downloaded.dynamics,downloaded.observation.rowCount).rows,e.rows);
    assert.equal(downloaded.geometry.phase,e.world.geometry.phase);assert.deepEqual(downloaded.appearance.palette,e.world.appearance.palette);
    vm.runInContext('importWorld()',context);upload.files=[{size:100,text:async()=>JSON.stringify(downloaded)}];await upload.onchange();
    assert.equal(get('initString').value,downloaded.dynamics.seed);
  }
  context.fixture=square;vm.runInContext('loadWorld(fixture)',context);await vm.runInContext('exportWorld()',context);await W.verify(downloaded);
  assert.equal(downloaded.geometry.tessellation,'square-grid');assert.equal(downloaded.appearance.borderWidth,0);assert.equal(downloaded.appearance.skipWhite,false);
  const before=get('initString').value;vm.runInContext('importWorld()',context);upload.files=[{size:2,text:async()=>'{}'}];await upload.onchange();assert.equal(get('initString').value,before);assert.match(get('worldNotice').textContent,/Import failed/);
  const paletteContext=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(__dirname+'/ca-palettes.js','utf8'),paletteContext);
  assert.equal(paletteContext.window.CA_PALETTES.length,23);
  for(const p of paletteContext.window.CA_PALETTES){const w=structuredClone(terrace);w.appearance.palette=Object.fromEntries([...'WRGBK'].map(s=>[s,p[s]+'ff']));w.appearance.canvasBackground=p.W+'ff';await W.verify(await W.seal(w));assert.equal(w.ids.dynamics,terrace.ids.dynamics);}
  console.log(`${data.entries.length} worlds: independent grid fixtures, import/export, identity layers, K semantics, boundaries, invalid imports, and script syntax pass.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
