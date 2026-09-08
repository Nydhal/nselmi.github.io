/* Exact drawing constraints for the existing four-state, seven-input model. */
(function(root){
  'use strict';
  function normalize(value){
    const input=Array.isArray(value)?{rows:value}:value;
    if(!input||!Array.isArray(input.rows))throw Error('Provide a JSON array of rows, or an object with rows.');
    const rows=input.rows.map(row=>Array.isArray(row)?row.join(''):row);
    if(!rows.length||rows.length>512||typeof rows[0]!=='string'||!rows[0].length||rows[0].length>1000||rows.length*rows[0].length>200000)throw Error('Use 1–1000 columns and 1–512 rows, up to 200,000 cells.');
    if(rows.some(row=>typeof row!=='string'||row.length!==rows[0].length||!/^[WRGB]+$/.test(row)))throw Error('Every row must have equal length and contain only WRGB states. Resolve undefined or unknown cells first.');
    const phase=input.phase??0,boundary=input.boundary??'fixed-W';
    if(![0,1].includes(phase)||!['fixed-W','periodic'].includes(boundary))throw Error('Choose a supported phase and boundary.');
    return {rows,phase,boundary};
  }
  function neighborhood(row,column,boundary){
    let word='';for(let offset=-3;offset<=3;offset++){const index=column+offset;word+=boundary==='periodic'?row[((index%row.length)+row.length)%row.length]:row[index]??'W';}return word;
  }
  function fit(value,prescribed=null){
    const drawing=normalize(value),observed=new Map(),conflicts=[],conflicted=new Set(),mismatches=[];
    const reference=prescribed===null?null:new Map(prescribed);let background=null;
    for(let row=1;row<drawing.rows.length;row++)for(let column=0;column<drawing.rows[0].length;column++){
      const input=neighborhood(drawing.rows[row-1],column,drawing.boundary),output=drawing.rows[row][column],occurrence={row,column,output};
      const first=observed.get(input);
      if(first&&first.output!==output&&!conflicted.has(input)){conflicted.add(input);conflicts.push({input,occurrences:[first,occurrence]});}
      if(!first)observed.set(input,occurrence);
      if(input==='WWWWWWW'&&output!=='W'&&!background)background={input,occurrence};
      if(reference?.has(input)&&reference.get(input)!==output&&mismatches.length<20)mismatches.push({input,occurrence,existing:reference.get(input)});
    }
    if(reference?.has('WWWWWWW')&&reference.get('WWWWWWW')!=='W')throw Error('The reference table must preserve white background.');
    const consistent=!conflicts.length&&!background,compatible=!mismatches.length;
    const rules=consistent&&compatible?new Map(reference??[]):null;
    if(rules){for(const [input,occurrence]of observed)rules.set(input,occurrence.output);rules.set('WWWWWWW','W');}
    return {consistent,compatible,conflicts,background,mismatches,observedCount:observed.size,rules:rules?[...rules].sort((left,right)=>left[0].localeCompare(right[0])):null};
  }
  function mirrorDrawing(value){const drawing=normalize(value);return {...drawing,rows:drawing.rows.map(row=>[...row].reverse().join('')),phase:drawing.phase^((drawing.rows[0].length-1)%2)};}
  async function mirrorWorld(value){
    const world=root.CAWorld.validate(value),width=world.dynamics.width;
    world.dynamics.seed=[...world.dynamics.seed].reverse().join('');
    world.dynamics.rules=world.dynamics.rules.map(([input,output])=>[[...input].reverse().join(''),output]).sort((left,right)=>left[0].localeCompare(right[0]));
    if(world.geometry.tessellation==='triangular-strip')world.geometry.phase^=(width-1)%2;
    world.metadata={name:(world.metadata?.name??'Construction')+' / mirrored',derivedFrom:value.ids?.appearance,
      note:'Seed, ordered rule inputs, and triangle phase reflected together.'};
    return root.CAWorld.seal(world);
  }
  function rotateDrawing(value){
    const drawing=normalize(value),triangles=[];
    drawing.rows.forEach((text,row)=>[...text].forEach((state,column)=>{
      if(state==='W')return;
      let points=(row+column+drawing.phase)%2?[[column,row],[column+1,row+1],[column+2,row]]:[[column,row+1],[column+1,row],[column+2,row+1]];
      points=points.map(([horizontal,vertical])=>{horizontal+=1-drawing.phase;return [(horizontal-3*vertical)/2,(horizontal+vertical)/2];});
      triangles.push({points,state});
    }));
    if(!triangles.length)return drawing;
    const vertices=triangles.flatMap(triangle=>triangle.points);
    const bounds=vertices.reduce((box,[horizontal,vertical])=>[Math.min(box[0],horizontal),Math.min(box[1],vertical),Math.max(box[2],horizontal),Math.max(box[3],vertical)],[Infinity,Infinity,-Infinity,-Infinity]);
    const [minimumHorizontal,minimumVertical,maximumHorizontal,maximumVertical]=bounds;
    let shiftHorizontal=6-minimumHorizontal;const shiftVertical=-minimumVertical;
    if((vertices[0][0]+vertices[0][1]+shiftHorizontal+shiftVertical)%2===0)shiftHorizontal++;
    const width=maximumHorizontal+shiftHorizontal+6,height=maximumVertical+shiftVertical+2;
    if(width>1000||height>512||width*height>200000)throw Error('Rotated drawing exceeds the supported size.');
    const rows=Array.from({length:height},()=>Array(width).fill('W'));
    for(const triangle of triangles){const column=Math.min(...triangle.points.map(point=>point[0]))+shiftHorizontal,row=Math.min(...triangle.points.map(point=>point[1]))+shiftVertical;rows[row][column]=triangle.state;}
    return normalize({rows:rows.map(row=>row.join('')),phase:0,boundary:drawing.boundary});
  }
  root.CellularTarget={normalize,neighborhood,fit,mirrorDrawing,mirrorWorld,rotateDrawing};
  if(typeof module!=='undefined')module.exports=root.CellularTarget;
})(globalThis);
