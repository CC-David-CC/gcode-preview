// Expand only unambiguous linear modal moves. This is not a controller emulator.
export function expandLinearModal(lines){
 let motion=null;
 return lines.map(line=>{
  const body=line.split(';',1)[0].trim();
  if(!body)return line;
  // Coordinate-only lines require a previously explicit linear motion. Unknown
  // commands deliberately clear it rather than guessing a machine's state.
  if(/^[xyzefijr]/i.test(body)){
   if(!motion||!/^[xyze]/i.test(body)||/[ijr]/i.test(body))throw Error('This modal move cannot be interpreted safely. Use an explicit G0 or G1. The current view is unchanged.');
   return motion+' '+line;
  }
  const op=body.match(/^([gmt])\s*(\d+(?:\.\d+)?)/i);
  if(!op){motion=null;return line;}
  const name=op[1].toLowerCase(),value=Number(op[2]);
  if(name==='g'&&(value===0||value===1))motion='G'+value;
  else if(name==='g'&&[20,21,90,91,92].includes(value)){} // non-motion modes
  else if(name==='m'&&(value===82||value===83)){} // extrusion mode
  else motion=null;
  return line;
 });
}
