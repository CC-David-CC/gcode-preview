// Convert XY radius arcs to relative center offsets for the renderer. This is
// a geometric preview, not a controller or machine validation.
export function normalizeArc(params,start,end,clockwise){
 const fail=message=>{throw Error(message+' The current view is unchanged.')};
 const dx=end.x-start.x,dy=end.y-start.y,chord=Math.hypot(dx,dy);
 if(!Number.isFinite(chord))fail('An arc is outside the supported coordinate range.');
 if(chord===0)fail('A full-circle arc cannot be shown reliably.');
 if(Object.keys(params).some(key=>!['x','y','z','e','f','i','j','r'].includes(key)))fail('This arc contains unsupported parameters.');
 const hasR=params.r!==undefined,hasI=params.i!==undefined,hasJ=params.j!==undefined;
 if(hasR){
  if(hasI||hasJ)fail('An arc cannot combine R with I or J in this viewer.');
  const radius=Math.abs(params.r),half=chord/2;
  if(!Number.isFinite(radius)||radius===0||radius<half)fail('The arc radius cannot reach its endpoint.');
  const height=Math.sqrt((radius-half)*(radius+half));if(!Number.isFinite(height))fail('An arc is outside the supported coordinate range.');
  const sign=(clockwise?1:-1)*(params.r<0?-1:1),factor=sign*height/chord;
  params.i=dx/2+dy*factor;params.j=dy/2-dx*factor;
  if(!Number.isFinite(params.i)||!Number.isFinite(params.j))fail('An arc is outside the supported coordinate range.');
  delete params.r;
 }else if((!hasI&&!hasJ)||Math.hypot(params.i??0,params.j??0)===0)fail('An arc needs a nonzero I or J center offset.');
 return params;
}
