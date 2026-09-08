/* Portable CA records. No DOM dependencies; shared by explorer and tests. */
(function(root) {
  'use strict';
  const coordinates='even: (c,r+1),(c+1,r),(c+2,r+1); odd: (c,r),(c+1,r+1),(c+2,r)';
  const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
  async function hash(x) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(x))))].map(n=>n.toString(16).padStart(2,'0')).join(''); }
  function run(d,count) {
    const table=new Map(d.rules), rows=[d.seed], used=new Set(), width=d.width;
    for(let r=1;r<count;r++) {
      let next=''; const prev=rows[r-1];
      for(let c=0;c<width;c++) {
        let key=''; for(let o=-3;o<=3;o++){const i=c+o;key+=d.boundary==='periodic'?prev[((i%width)+width)%width]:(i<0||i>=width?'W':prev[i]);}
        if(d.diagnosticPropagation==='legacy-K-as-W')key=key.replaceAll('K','W');
        if(table.has(key)){next+=table.get(key);used.add(key);}else next+='K';
      } rows.push(next);
    } return {rows,used};
  }
  function validate(value) {
    const w=structuredClone(value), fail=s=>{throw Error(s);};
    if(w?.schema!=='ca-world-v1')fail('Expected a complete ca-world-v1 record, not a rule-only file.');
    const d=w.dynamics,g=w.geometry,a=w.appearance,o=w.observation;
    if(!d||!g||!a||!o)fail('World needs dynamics, geometry, appearance, and observation.');
    if(d.schema!=='ca-dynamics-v1'||canonical(d.states)!=='["W","R","G","B"]'||d.diagnostic!=='K'||canonical(d.offsets)!=='[-3,-2,-1,0,1,2,3]'||d.update!=='synchronous'||d.missing!=='output-K')fail('Unsupported automaton definition.');
    if(!['output-K','legacy-K-as-W'].includes(d.diagnosticPropagation))fail('Unsupported diagnostic behavior.');
    if(typeof d.seed!=='string'||!/^[WRGBK]+$/.test(d.seed)||d.seed.length!==d.width||!Number.isInteger(d.width)||d.width>1000)fail('Seed must contain 1–1000 WRGBK cells and match width.');
    if(!['fixed-W','periodic'].includes(d.boundary))fail('Unsupported boundary.');
    if(!Array.isArray(d.rules)||d.rules.length>16384)fail('Invalid rule table.');
    const keys=new Set();for(const pair of d.rules){if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||typeof pair[1]!=='string'||!/^[WRGB]{7}$/.test(pair[0])||!/^[WRGB]$/.test(pair[1])||keys.has(pair[0]))fail('Rules must have unique seven-state inputs and one WRGB output.');keys.add(pair[0]);}
    if(g.schema!=='ca-geometry-v1'||!['triangular-strip','square-grid'].includes(g.tessellation)||![0,1].includes(g.phase)||g.seam!=='unjoined-planar-view'||g.horizontalUnit!==10||g.verticalUnit!==(g.tessellation==='square-grid'?10:17)||g.coordinates!==(g.tessellation==='square-grid'?'unit squares at (c,r)':coordinates))fail('Unsupported geometry. This explorer supports phase 0/1 triangles (10 × 17) or squares (10 × 10), shown as a planar strip.');
    if(a.schema!=='ca-appearance-v1'||a.colorSpace!=='srgb'||!a.palette)fail('Unsupported appearance.');
    const opaque=x=>typeof x==='string'&&/^#[0-9a-f]{6}(ff)?$/i.test(x);
    for(const s of 'WRGBK')if(!opaque(a.palette[s]))fail('Palette must contain opaque sRGB colors for W, R, G, B, K.');
    if(!opaque(a.canvasBackground)||a.canvasBackground.slice(0,7).toLowerCase()!==a.palette.W.slice(0,7).toLowerCase()||!opaque(a.borderColor))fail('Canvas background must match W; border color must be opaque sRGB.');
    if(!['none','all','edges','different-state-and-support-boundary'].includes(a.borders)||!Number.isFinite(a.borderWidth)||a.borderWidth<0||a.borderWidth>5||a.skipWhite!==undefined&&typeof a.skipWhite!=='boolean')fail('Unsupported border or background setting.');
    if(o.schema!=='ca-observation-v1'||o.firstGeneration!==0||o.crop!=='full-domain'||!Number.isInteger(o.rowCount)||o.rowCount<1||o.rowCount>512||o.rowCount*d.width>200000)fail('Observation must start at the seed, show the full domain, and fit within 512 rows / 200,000 cells.');
    if(!['catalogue-canvas-v1','explorer-svg-v1'].includes(o.renderer))fail('Unsupported renderer.');
    return w;
  }
  async function seal(w) {
    const d=await hash(w.dynamics);w.geometry.dynamicsId=d;const g=await hash(w.geometry);w.appearance.geometryId=g;const a=await hash(w.appearance);w.observation.appearanceId=a;
    w.observation.gridSha256=await hash(run(w.dynamics,w.observation.rowCount).rows);
    w.ids={dynamics:d,geometry:g,appearance:a,observation:await hash(w.observation)};return w;
  }
  async function verify(value) {
    const w=validate(value), sealed=await seal(structuredClone(w));
    if(w.ids)for(const k of ['dynamics','geometry','appearance','observation'])if(w.ids[k]!==sealed.ids[k])throw Error('World '+k+' checksum does not match its contents.');
    if(w.geometry.dynamicsId!==sealed.ids.dynamics||w.appearance.geometryId!==sealed.ids.geometry||w.observation.appearanceId!==sealed.ids.appearance)throw Error('World identity links do not match their contents.');
    if(w.observation.gridSha256!==sealed.observation.gridSha256)throw Error('Recorded grid checksum does not match replay.');
    return w;
  }
  root.CAWorld={coordinates,canonical,hash,run,validate,seal,verify};
  if(typeof module!=='undefined')module.exports=root.CAWorld;
})(globalThis);
