const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const World=require('./ca-world.js'),Target=require('./ca-target.js');
const catalogue=JSON.parse(fs.readFileSync(__dirname+'/catalogue/index.json'));
function drawingOf(world){return {rows:World.run(world.dynamics,world.observation.rowCount).rows,phase:world.geometry.phase,boundary:world.dynamics.boundary};}
function support(value){
  const triangles=[];value.rows.forEach((text,row)=>[...text].forEach((state,column)=>{if(state==='W')return;const vertices=(row+column+value.phase)%2?[[column,row],[column+1,row+1],[column+2,row]]:[[column,row+1],[column+1,row],[column+2,row+1]];triangles.push({state,vertices});}));
  const horizontal=Math.min(...triangles.flatMap(item=>item.vertices.map(point=>point[0]))),vertical=Math.min(...triangles.flatMap(item=>item.vertices.map(point=>point[1])));
  return triangles.map(item=>item.state+JSON.stringify(item.vertices.map(point=>[point[0]-horizontal,point[1]-vertical]).sort())).sort();
}
async function main(){
  for(const entry of catalogue.entries){const world=entry.world,mirrored=await Target.mirrorWorld(world);await World.verify(mirrored);assert.deepEqual(World.run(mirrored.dynamics,world.observation.rowCount).rows,entry.rows.map(row=>[...row].reverse().join('')));const twice=await Target.mirrorWorld(mirrored);assert.deepEqual(twice.dynamics,world.dynamics);assert.equal(twice.geometry.phase,world.geometry.phase);}
  const family=catalogue.entries.filter(entry=>['entry-023','entry-024','entry-025','entry-026','entry-027'].includes(entry.key)),ensemble=family[0].world,rows=drawingOf(ensemble).rows;
  const expected=Array.from({length:8},()=>Array(81).fill('W'));
  family.slice(1).forEach((entry,index)=>{assert.deepEqual(entry.world.dynamics.rules,ensemble.dynamics.rules);entry.rows.forEach((row,rowIndex)=>[...row].forEach((state,column)=>{if(state!=='W'){assert.equal(expected[rowIndex][column+index*20],'W');expected[rowIndex][column+index*20]=state;}}));});
  assert.deepEqual(rows,expected.map(row=>row.join('')));assert(World.run(ensemble.dynamics,64).rows.slice(4).every(row=>/^W+$/.test(row)));
  const seedOnly=[];
  for(const entry of family){
    const value=drawingOf(entry.world),fit=Target.fit(value,entry.world.dynamics.rules);assert(fit.consistent&&fit.compatible);assert.deepEqual(World.run({...entry.world.dynamics,rules:fit.rules},value.rows.length).rows,value.rows);
    assert.deepEqual(Target.mirrorDrawing(Target.mirrorDrawing(value)),value);
    for(const phase of [0,1]){let rotated={...value,phase};const before=support(rotated);for(let turn=0;turn<6;turn++)rotated=Target.rotateDrawing(rotated);assert.deepEqual(support(rotated),before);}
    const reversedSeed={...entry.world.dynamics,seed:[...entry.world.dynamics.seed].reverse().join('')},actual=World.run(reversedSeed,value.rows.length).rows,expected=value.rows.map(row=>[...row].reverse().join(''));
    const firstRow=actual.findIndex((row,index)=>row!==expected[index]);seedOnly.push({construction:entry.name,firstMismatchRow:firstRow,firstMismatchColumn:firstRow<0?null:[...actual[firstRow]].findIndex((state,column)=>state!==expected[firstRow][column])});
  }
  const contradictory=Target.fit(['RRR','RGB']);assert(contradictory.consistent); // Fixed boundaries distinguish the three neighborhoods.
  const conflict=Target.fit({rows:['RRR','RGB'],boundary:'periodic'});assert.equal(conflict.conflicts[0].input,'RRRRRRR');
  assert.equal(Target.fit(['WWWWWWW','WWWRWWW']).background.occurrence.column,3);
  assert(Target.fit(['R','G'],[['WWWRWWW','G']]).compatible);assert(!Target.fit(['R','G'],[['WWWRWWW','B']]).compatible);
  const cubes=['WWWRRGWWWW','WWWBBGWWWW','WWWWWWWWWW','WWWRRGWWWW'];assert(!Target.fit(cubes).consistent);
  for(const bad of [[],['WR','W'],['WX'],{rows:['R'],phase:2}])assert.throws(()=>Target.normalize(bad));
  for(const file of ['ca-drawing-controls.js','ca-svg-drawing.js','construction-presets.js'])new vm.Script(fs.readFileSync(__dirname+'/'+file,'utf8'));
  console.log(`Mirror replay across all ${catalogue.entries.length} worlds; shared seed, fitted replay, six rotations, contradictions, background and reference constraints pass.`);
  console.log(JSON.stringify(seedOnly,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
