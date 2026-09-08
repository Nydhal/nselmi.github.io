/* Compact inverse test, sharing the explorer's renderer, palette and rule editor. */
let targetPalette=null;
function testCurrentDrawing(){
  $('drawingTest').hidden=!$('drawingTest').hidden;
  if(!$('drawingTest').hidden)useCurrentDrawing();
}
function useCurrentDrawing(){
  try {
    const world=currentWorld();if(world.geometry.tessellation!=='triangular-strip')throw Error('Choose the triangle grid first.');
    const drawing=CellularTarget.normalize({rows:CAWorld.run(world.dynamics,world.observation.rowCount).rows,phase:world.geometry.phase,boundary:world.dynamics.boundary});
    targetPalette=null;$('targetRows').value=JSON.stringify(drawing,null,2);testTargetDrawing();
  }catch(error){$('targetNotice').textContent=error.message;$('targetApply').disabled=true;}
}
async function importTargetFile(input){
  try {
    const file=input.files[0];if(!file)return;if(file.size>15000000)throw Error('Drawing file exceeds 15 MB.');
    const text=await file.text();let drawing,palette=null;
    if(text.trimStart().startsWith('<')){const parsed=TriangleSVG.parse(text);drawing=parsed.drawing;palette=parsed.palette;}
    else {
      const value=JSON.parse(text);
      if(value.schema==='ca-world-v1'){
        const world=await CAWorld.verify(value);if(world.geometry.tessellation!=='triangular-strip')throw Error('Choose a triangular world.');
        drawing={rows:CAWorld.run(world.dynamics,world.observation.rowCount).rows,phase:world.geometry.phase,boundary:world.dynamics.boundary};palette=world.appearance.palette;
      }else drawing=value;
    }
    drawing=CellularTarget.normalize(drawing);targetPalette=palette;$('targetRows').value=JSON.stringify(drawing,null,2);testTargetDrawing();
  }catch(error){$('targetNotice').textContent=error.message;$('targetApply').disabled=true;}
  input.value='';
}
function testTargetDrawing(){
  try {
    const drawing=CellularTarget.normalize(JSON.parse($('targetRows').value)),fitted=CellularTarget.fit(drawing,$('targetKeepRules').checked?[...rules]:null);
    let witnesses=[],message;
    if(fitted.conflicts.length){const conflict=fitted.conflicts[0];witnesses=conflict.occurrences;message=`Cannot generate this drawing in this direction: ${conflict.input} requires ${witnesses.map(item=>item.output).join(' and ')}. Highlighted outputs: ${witnesses.map(item=>`row ${item.row}, column ${item.column}`).join('; ')} (counted from zero).`;}
    else if(fitted.background){witnesses=[fitted.background.occurrence];message='Cannot generate this drawing with quiescent background: seven background cells would have to create a face.';}
    else if(!fitted.compatible){const mismatch=fitted.mismatches[0];witnesses=[mismatch.occurrence];message=`A different table can generate these rows, but the current assignment ${mismatch.input} → ${mismatch.existing} conflicts with ${mismatch.occurrence.output}.`;}
    else message=`Exact replay for these ${drawing.rows.length} rows: ${fitted.rules.length} assigned transitions. Unseen inputs remain undefined. Spatial coherence and impossibility are separate questions.`;
    const palette={...getColors(),...targetPalette};
    const preview=render(drawing.rows,'canvas-container',palette,{skipWhite:false,borderMode:'edges',borderColor:$('borderColor').value,borderWidth:Number($('borderWidth').value),wrap:drawing.boundary==='periodic',gridMode:'triangles',phase:drawing.phase});svg=preview.svgEl;
    witnesses.forEach((witness,index)=>{
      const color=index?'#147daf':'#da257a',width=drawing.rows[0].length;
      const mark=(row,column)=>{const cell=svg.node().querySelector(`polygon[data-row="${row}"][data-col="${column}"]`);if(cell){cell.setAttribute('stroke',color);cell.setAttribute('stroke-width','2');}};
      mark(witness.row,witness.column);
      for(let offset=-3;offset<=3;offset++){let column=witness.column+offset;if(drawing.boundary==='periodic')column=((column%width)+width)%width;mark(witness.row-1,column);}
    });
    $('targetNotice').textContent=message;$('targetApply').disabled=!fitted.rules;
    $('stats').textContent='Target preview · Generate restores the current construction.';
    return {drawing,fitted,palette};
  }catch(error){$('targetNotice').textContent=error.message;$('targetApply').disabled=true;return null;}
}
async function applyTargetRules(){
  try {
    const checked=testTargetDrawing();if(!checked?.fitted.rules)return;
    const {drawing,fitted,palette}=checked,world=currentWorld();
    world.dynamics.rules=fitted.rules;world.dynamics.seed=drawing.rows[0];world.dynamics.width=drawing.rows[0].length;world.dynamics.boundary=drawing.boundary;world.dynamics.diagnosticPropagation='output-K';
    world.geometry.tessellation='triangular-strip';world.geometry.coordinates=CAWorld.coordinates;world.geometry.verticalUnit=17;world.geometry.phase=drawing.phase;
    world.appearance.palette=Object.fromEntries(Object.entries(palette).map(([state,color])=>[state,color.slice(0,7)+'ff']));world.appearance.canvasBackground=world.appearance.palette.W;
    world.observation.rowCount=drawing.rows.length;world.metadata={name:'Triangle drawing',note:'Exact finite row replay; no spatial interpretation certified.'};
    loadWorld(await CAWorld.seal(CAWorld.validate(world)));$('preset').selectedIndex=-1;$('worldVariant').hidden=true;$('drawingTest').hidden=true;
  }catch(error){$('targetNotice').textContent=error.message;}
}
