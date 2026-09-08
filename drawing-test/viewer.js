'use strict';
const element=identifier=>document.getElementById(identifier),template=window.LETTERFORM_WORLDS[0].world;
let drawing,palette=structuredClone(template.appearance.palette),reference=null,fitResult=null,highlights=[];
function download(text,name,type){const address=URL.createObjectURL(new Blob([text],{type})),anchor=document.createElement('a');anchor.href=address;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(address),1000);}
function points(row,column){return (row+column+drawing.phase)%2?[[column,row],[column+1,row+1],[column+2,row]]:[[column,row+1],[column+1,row],[column+2,row+1]];}
function render(){
  const canvas=element('canvas'),context=canvas.getContext('2d'),scale=Math.min(18,4096/(drawing.rows[0].length+1),4096/(drawing.rows.length*1.7));canvas.width=Math.ceil((drawing.rows[0].length+1)*scale);canvas.height=Math.ceil(drawing.rows.length*scale*1.7);canvas.dataset.scale=scale;
  context.fillStyle=palette.W;context.fillRect(0,0,canvas.width,canvas.height);
  function trace(row,column){context.beginPath();points(row,column).forEach(([horizontal,vertical],index)=>index?context.lineTo(horizontal*scale,vertical*scale*1.7):context.moveTo(horizontal*scale,vertical*scale*1.7));context.closePath();}
  drawing.rows.forEach((text,row)=>[...text].forEach((state,column)=>{trace(row,column);context.fillStyle=palette[state];context.fill();if(element('grid').checked){context.strokeStyle='#56657066';context.lineWidth=.6;context.stroke();}}));
  for(const [index,witness]of highlights.entries()){
    const hue=index===0?'#da257a':'#147daf';context.strokeStyle=hue;context.lineWidth=2.4;
    for(let offset=-3;offset<=3;offset++){let column=witness.column+offset;if(drawing.boundary==='periodic')column=((column%drawing.rows[0].length)+drawing.rows[0].length)%drawing.rows[0].length;if(column<0||column>=drawing.rows[0].length)continue;trace(witness.row-1,column);context.stroke();}
    trace(witness.row,witness.column);context.fillStyle=index===0?'#da257a77':'#147daf77';context.fill();context.stroke();
  }
}
function synchronize(){element('columns').value=drawing.rows[0].length;element('rowCount').value=drawing.rows.length;element('phase').value=drawing.phase;element('boundary').value=drawing.boundary;element('rowText').value=JSON.stringify(drawing,null,2);element('keepRules').disabled=!reference;if(!reference)element('keepRules').checked=false;}
function test(prefix=''){
  highlights=[];fitResult=CellularTarget.fit(drawing,element('keepRules').checked?reference:null);let message;
  if(fitResult.conflicts.length){const witness=fitResult.conflicts[0];highlights=witness.occurrences;message=`Not realizable in this orientation: ${witness.input} requires different outputs (${witness.occurrences.map(item=>item.output).join(' and ')}). Highlighted outputs: ${witness.occurrences.map(item=>`row ${item.row}, column ${item.column}`).join('; ')} (counted from zero).`;}
  else if(fitResult.background){highlights=[fitResult.background.occurrence];message='Not realizable with quiescent background: seven background cells would have to create a face.';}
  else if(!fitResult.compatible){const mismatch=fitResult.mismatches[0];highlights=[mismatch.occurrence];message=`A different rule table can reproduce this drawing, but the loaded assignment ${mismatch.input} → ${mismatch.existing} disagrees with ${mismatch.occurrence.output} at row ${mismatch.occurrence.row}, column ${mismatch.occurrence.column} (counted from zero).`;}
  else message=`Exact replay is possible for these ${drawing.rows.length} rows with ${fitResult.rules.length} assigned rules. Unseen inputs remain undefined. This tests row generation; it does not certify a possible or impossible three-dimensional object.`;
  if(drawing.boundary==='periodic'&&drawing.rows[0].length%2)message+=' Odd width gives periodic indices but not an ordinary triangular cylinder seam.';
  element('status').textContent=prefix+message;element('openExplorer').disabled=element('exportWorld').disabled=!fitResult.rules;render();
}
function setDrawing(value,loadedReference=null){drawing=CellularTarget.normalize(value);reference=loadedReference;synchronize();test();}
async function importValue(value){
  if(value?.schema==='ca-world-v1'){const world=await CAWorld.verify(value);if(world.geometry.tessellation!=='triangular-strip')throw Error('Only triangular worlds can be tested here.');const next=CellularTarget.normalize({rows:CAWorld.run(world.dynamics,world.observation.rowCount).rows,phase:world.geometry.phase,boundary:world.dynamics.boundary});palette=structuredClone(world.appearance.palette);setDrawing(next,world.dynamics.rules);}
  else setDrawing(value);
}
function attempt(action){return async()=>{try{await action();}catch(error){element('status').textContent=error.message;}};}
element('loadExample').onclick=attempt(async()=>{if(element('example').value==='letterforms')await importValue(template);else{const response=await fetch('two-cubes.json');if(!response.ok)throw Error('Example unavailable.');palette=structuredClone(template.appearance.palette);setDrawing({rows:await response.json(),phase:0,boundary:'fixed-W'});}});
element('blank').onclick=attempt(()=>{const width=Number(element('columns').value),height=Number(element('rowCount').value);if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||width>1000||height<1||height>512||width*height>200000)throw Error('Use up to 1,000 columns, 512 rows and 200,000 cells.');setDrawing({rows:Array(height).fill('W'.repeat(width)),phase:Number(element('phase').value),boundary:element('boundary').value});});
element('applyRows').onclick=attempt(()=>setDrawing(JSON.parse(element('rowText').value)));
element('file').onchange=attempt(async()=>{const file=element('file').files[0];if(!file)return;if(file.size>15000000)throw Error('Drawing file exceeds 15 MB.');const text=await file.text();if(text.trimStart().startsWith('<')){const parsed=TriangleSVG.parse(text);palette={...palette,...parsed.palette};setDrawing(parsed.drawing);}else await importValue(JSON.parse(text));element('file').value='';});
element('phase').onchange=()=>{drawing.phase=Number(element('phase').value);synchronize();test();};element('boundary').onchange=()=>{drawing.boundary=element('boundary').value;synchronize();test();};element('keepRules').onchange=()=>test();element('grid').onchange=render;element('test').onclick=()=>test();
element('mirror').onclick=attempt(()=>{drawing=CellularTarget.mirrorDrawing(drawing);synchronize();test('Drawing reflected. Loaded rule assignments remain unchanged. ');});
element('rotate').onclick=attempt(()=>{if(drawing.boundary==='periodic')throw Error('Choose fixed background to rotate a finite drawing. A periodic strip needs an explicit fundamental-domain transformation.');drawing=CellularTarget.rotateDrawing(drawing);synchronize();test('New direction: the first occupied row is the seed; two background rows follow the shape. ');});
let painting=false;
function paint(event){
  const canvas=element('canvas'),bounds=canvas.getBoundingClientRect(),scale=Number(canvas.dataset.scale),horizontal=(event.clientX-bounds.left)*canvas.width/bounds.width/scale,vertical=(event.clientY-bounds.top)*canvas.height/bounds.height/(scale*1.7),row=Math.floor(vertical);
  if(row<0||row>=drawing.rows.length)return;
  for(let column=Math.floor(horizontal)-1;column<=Math.floor(horizontal);column++){
    if(column<0||column>=drawing.rows[0].length)continue;
    const vertices=points(row,column),crosses=vertices.map((point,index)=>{const next=vertices[(index+1)%3];return (next[0]-point[0])*(vertical-point[1])-(next[1]-point[1])*(horizontal-point[0]);});
    if(crosses.every(value=>value>=-1e-8)||crosses.every(value=>value<=1e-8)){const text=drawing.rows[row],state=element('brush').value;drawing.rows[row]=text.slice(0,column)+state+text.slice(column+1);synchronize();test();break;}
  }
}
element('canvas').onpointerdown=event=>{painting=true;element('canvas').setPointerCapture(event.pointerId);paint(event);};element('canvas').onpointermove=event=>{if(painting)paint(event);};element('canvas').onpointerup=element('canvas').onpointercancel=()=>{painting=false;};
async function resultWorld(){
  test();if(!fitResult.rules)throw Error('Resolve the highlighted constraint before exporting a world.');const world=structuredClone(template);world.dynamics.rules=fitResult.rules;world.dynamics.seed=drawing.rows[0];world.dynamics.width=drawing.rows[0].length;world.dynamics.boundary=drawing.boundary;world.dynamics.diagnosticPropagation='output-K';world.geometry.phase=drawing.phase;world.appearance.palette=structuredClone(palette);world.appearance.canvasBackground=palette.W;world.observation.rowCount=drawing.rows.length;world.metadata={name:'Triangle drawing',note:'Exact finite row replay; no geometric interpretation certified.'};return CAWorld.seal(CAWorld.validate(world));
}
element('openExplorer').onclick=attempt(async()=>{const world=await resultWorld();sessionStorage.setItem('ca-world-transfer',JSON.stringify(world));location.href='../impossible-fractal-ca.html?drawing=local';});
element('exportWorld').onclick=attempt(async()=>download(JSON.stringify(await resultWorld(),null,2),'triangle-world.json','application/json'));
element('exportDrawing').onclick=()=>download(JSON.stringify(drawing,null,2),'triangle-drawing.json','application/json');element('exportSVG').onclick=attempt(()=>download(TriangleSVG.serialize(drawing,palette),'triangle-drawing.svg','image/svg+xml'));
attempt(async()=>{await importValue(template);if(new URLSearchParams(location.search).get('drawing')==='local'){const content=sessionStorage.getItem('ca-drawing-transfer');if(!content)throw Error('No drawing transferred in this tab.');await importValue(JSON.parse(content));sessionStorage.removeItem('ca-drawing-transfer');}})();
