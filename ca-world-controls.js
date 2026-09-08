let loadedWorld=null;
function currentWorld() {
  const seed=$('initString').value.toUpperCase().trim(),square=$('gridMode').value==='squares';
  const w={schema:'ca-world-v1',
    dynamics:{schema:'ca-dynamics-v1',states:[...'WRGB'],diagnostic:'K',offsets:[-3,-2,-1,0,1,2,3],rules:[...rules].sort((a,b)=>a[0]<b[0]?-1:1),seed,width:seed.length,boundary:$('wrapAround').checked?'periodic':'fixed-W',update:'synchronous',missing:'output-K',diagnosticPropagation:$('diagnosticMode').value},
    geometry:{schema:'ca-geometry-v1',tessellation:square?'square-grid':'triangular-strip',phase:Number($('phase').value),coordinates:square?'unit squares at (c,r)':CAWorld.coordinates,horizontalUnit:10,verticalUnit:square?10:17,seam:'unjoined-planar-view'},
    appearance:{schema:'ca-appearance-v1',colorSpace:'srgb',palette:Object.fromEntries(Object.entries(getColors()).map(([k,v])=>[k,v+'ff'])),canvasBackground:$('colorW').value+'ff',borders:$('borderMode').value,borderColor:$('borderColor').value+'ff',borderWidth:Number($('borderWidth').value),skipWhite:$('skipWhite').checked},
    observation:{schema:'ca-observation-v1',firstGeneration:0,rowCount:Number($('numRows').value),renderer:'explorer-svg-v1',crop:'full-domain'},
    metadata:{name:loadedWorld?.metadata?.name||(typeof PRESETS!=='undefined'?PRESETS[Number($('preset').value)]?.name:null)||'Explorer configuration',note:'Exported settings; original image evidence applies only to its recorded configuration and horizon.'}};
  return CAWorld.validate(w);
}
function loadWorld(w) {
  // Validate before changing any editor state. Uploaded records also verify hashes.
  w=CAWorld.validate(w);const d=w.dynamics,g=w.geometry,a=w.appearance;
  loadedWorld=w;rules=new Map(d.rules);baseKeys=new Set(rules.keys());
  $('initString').value=d.seed;$('numRows').value=w.observation.rowCount;
  $('wrapAround').checked=d.boundary==='periodic';$('diagnosticMode').value=d.diagnosticPropagation;
  $('phase').value=g.phase;$('gridMode').value=g.tessellation==='square-grid'?'squares':'triangles';
  $('skipWhite').checked=a.skipWhite??true;$('borderMode').value=a.borders==='different-state-and-support-boundary'?'edges':a.borders;
  $('borderColor').value=a.borderColor.slice(0,7);$('borderWidth').value=a.borderWidth;
  setColors(Object.fromEntries(Object.entries(a.palette).map(([s,c])=>[s,c.slice(0,7)])));
  const paletteIndex=typeof COLOR_PRESETS==='undefined'?-1:COLOR_PRESETS.findIndex(p=>[...'WRGBK'].every(s=>p[s]===a.palette[s].slice(0,7)));$('colorPreset').value=paletteIndex<0?'custom':String(paletteIndex);
  updateRuleStatus();generate();
}
function updateWorldNotice() {
  $('worldNotice').textContent='';
  const firstK=result?.rows.findIndex(row=>row.includes('K'))??-1;
  if(firstK>=0){const col=result.rows[firstK].indexOf('K');$('worldNotice').textContent=`Undefined rule at row ${firstK}, column ${col}.`;}
}
async function exportWorld() {
  try {if(!generate())return;const w=await CAWorld.seal(currentWorld());download(JSON.stringify(w,null,2),'ca-world-'+w.ids.appearance.slice(0,12)+'.json','application/json');}
  catch(e){$('worldNotice').textContent=e.message;}
}
function importWorld() {
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
  input.onchange=async()=>{const file=input.files[0];if(!file)return;try{if(file.size>5000000)throw Error('World file exceeds 5 MB.');const w=await CAWorld.verify(JSON.parse(await file.text()));loadWorld(w);$('preset').selectedIndex=-1;$('worldVariant').hidden=true;}catch(e){$('worldNotice').textContent='Import failed: '+e.message;}};
  input.click();
}

async function mirrorCurrentWorld(){
  try {const world=await CellularTarget.mirrorWorld(currentWorld());loadWorld(world);$('preset').selectedIndex=-1;$('worldVariant').hidden=true;$('worldNotice').textContent+=' Mirrored seed, rule inputs and triangle orientation.';}
  catch(error){$('worldNotice').textContent=error.message;}
}
async function receiveDrawingWorld(){
  try {const content=sessionStorage.getItem('ca-world-transfer');if(!content)throw Error('No drawing world available in this tab.');const world=await CAWorld.verify(JSON.parse(content));loadWorld(world);$('preset').selectedIndex=-1;$('worldVariant').hidden=true;sessionStorage.removeItem('ca-world-transfer');}
  catch(error){$('worldNotice').textContent=error.message;}
}
