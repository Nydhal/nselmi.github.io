/* Read state-labelled polygons without inserting untrusted SVG into the page. */
(function(root){
  function parse(text){
    const document=new DOMParser().parseFromString(text,'image/svg+xml'),svg=document.documentElement;
    if(document.querySelector('parsererror')||svg.localName!=='svg'||svg.getAttribute('data-ca-drawing')!=='v1')throw Error('Use an annotated triangle SVG exported by this explorer, or trace the artwork into triangle rows.');
    const width=Number(svg.getAttribute('data-ca-cols')),height=Number(svg.getAttribute('data-ca-rows')),phase=Number(svg.getAttribute('data-ca-phase')),boundary=svg.getAttribute('data-ca-boundary');
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>1000||height>512||width*height>200000)throw Error('Invalid SVG drawing dimensions.');
    const palette=JSON.parse(svg.getAttribute('data-ca-palette'));
    if(!palette||[...'WRGB'].some(state=>!/^#[0-9a-f]{6}(ff)?$/i.test(palette[state])))throw Error('Missing SVG state palette.');
    const rows=Array.from({length:height},()=>Array(width).fill('W')),seen=new Set();
    if(svg.querySelector('[transform], use, image, script, foreignObject, style')||svg.querySelectorAll('polygon:not(.cell)').length)throw Error('Transformed or unlabelled SVG artwork needs tracing into triangle rows.');
    for(const polygon of svg.querySelectorAll('polygon.cell')){
      const row=Number(polygon.getAttribute('data-row')),column=Number(polygon.getAttribute('data-col')),state=polygon.getAttribute('data-state'),key=row+','+column;
      if(!polygon.hasAttribute('data-row')||!polygon.hasAttribute('data-col')||!Number.isInteger(row)||!Number.isInteger(column)||row<0||row>=height||column<0||column>=width||!/^[WRGB]$/.test(state)||seen.has(key))throw Error('Invalid, duplicate or undefined SVG triangle state.');
      seen.add(key);
      const points=polygon.getAttribute('points').trim().split(/[\s,]+/).map(Number),expected=(row+column+phase)%2?[column*10,row*17,(column+1)*10,(row+1)*17,(column+2)*10,row*17]:[column*10,(row+1)*17,(column+1)*10,row*17,(column+2)*10,(row+1)*17];
      if(points.length!==6||points.some((point,index)=>point!==expected[index])||polygon.getAttribute('fill')?.slice(0,7).toLowerCase()!==palette[state].slice(0,7).toLowerCase())throw Error('SVG geometry or fill differs from its labelled triangle state. Trace the edited artwork first.');
      rows[row][column]=state;
    }
    return {drawing:CellularTarget.normalize({rows:rows.map(row=>row.join('')),phase,boundary}),palette};
  }
  function serialize(value,palette){
    const drawing=CellularTarget.normalize(value),width=drawing.rows[0].length,height=drawing.rows.length;
    const colors=Object.fromEntries([...'WRGB'].map(state=>{if(!/^#[0-9a-f]{6}(ff)?$/i.test(palette[state]))throw Error('Invalid palette.');return [state,palette[state]];}));
    const cells=[];drawing.rows.forEach((text,row)=>[...text].forEach((state,column)=>{if(state==='W')return;const points=(row+column+drawing.phase)%2?`${column*10},${row*17} ${(column+1)*10},${(row+1)*17} ${(column+2)*10},${row*17}`:`${column*10},${(row+1)*17} ${(column+1)*10},${row*17} ${(column+2)*10},${(row+1)*17}`;cells.push(`<polygon class="cell" data-row="${row}" data-col="${column}" data-state="${state}" points="${points}" fill="${colors[state]}"/>`);}));
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${(width+1)*10}" height="${height*17}" viewBox="0 0 ${(width+1)*10} ${height*17}" data-ca-drawing="v1" data-ca-cols="${width}" data-ca-rows="${height}" data-ca-phase="${drawing.phase}" data-ca-boundary="${drawing.boundary}" data-ca-palette='${JSON.stringify(colors)}'><rect width="100%" height="100%" fill="${colors.W}"/>${cells.join('')}</svg>`;
  }
  root.TriangleSVG={parse,serialize};
})(globalThis);
