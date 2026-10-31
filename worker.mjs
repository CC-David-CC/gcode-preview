import {CodiParser} from 'gcode-preview';
self.onmessage=({data})=>{
 try{
  const code=new TextDecoder('utf-8',{fatal:true}).decode(data.bytes);
  if(!/(?:^|\n)\s*(?:N\d+\s*)?G0?[0123](?=\s|[XYZEFIJR;]|$)/im.test(code))throw Error('No supported G0–G3 moves were found. The current view is unchanged.');
  if(/^(?:[^;\r\n]*?[ \t])?G0?91(?=[ \tXYZEFIJR;]|$)/im.test(code))throw Error('Relative positioning (G91) is not supported. The current view is unchanged.');
  if(/^(?:[^;\r\n]*?[ \t])?G0?20(?=[ \tXYZEFIJR;]|$)/im.test(code))throw Error('Inch units (G20) are not supported. The current view is unchanged.');
  if(/^[ \t]*N\d+[ \t]*[GMT]\d/im.test(code))throw Error('Numbered commands are not supported. The current view is unchanged.');
  if(/^[ \t]*[XYZE][ \t]*[+\-.0-9]/im.test(code))throw Error('Modal coordinate-only lines are not supported. The current view is unchanged.');
  if(/^[ \t]*(?:N\d+[ \t]*)?G0?92(?=[ \tXYZEFIJR;]|$)[^;\r\n]*[XYZ]/im.test(code))throw Error('Coordinate resets (G92 X/Y/Z) are not supported. The current view is unchanged.');
  const parser=new CodiParser(0);parser.parseGCode(code);
  // The renderer treats a positive E parameter as deposition. Convert absolute
  // E coordinates to deltas, and honor explicit relative E and G92 E resets.
  // This only classifies paths; it does not simulate the extruder or material.
  let relative=false,tool=0,x=0,y=0,z=0;const positions=new Map([[0,0]]);
  for(const layer of [parser.preamble,...parser.layers])for(const command of layer.commands){
   const op=command.gcode;if(op==='m82'){relative=false;continue}if(op==='m83'){relative=true;continue}
   if(/^t[0-9]+$/.test(op)){tool=Number(op.slice(1));if(!positions.has(tool))positions.set(tool,0);continue}
   if(op==='g92'&&Number.isFinite(command.params?.e)){positions.set(tool,command.params.e);continue}
   if(!/^g0?[0123]$/.test(op))continue;
   const nextX=command.params.x??x,nextY=command.params.y??y,nextZ=command.params.z??z;
   if(/^g0?[23]$/.test(op)&&nextX===x&&nextY===y&&nextZ===z)throw Error('A full-circle arc cannot be shown reliably. The current view is unchanged.');
   x=nextX;y=nextY;z=nextZ;if(!Number.isFinite(command.params.e))continue;
   const value=command.params.e,previous=positions.get(tool)??0,delta=relative?value:value-previous;
   positions.set(tool,relative?previous+value:value);command.params.e=delta;
  }
  self.postMessage({preamble:parser.preamble,layers:parser.layers,metadata:parser.metadata});
 }catch(error){self.postMessage({error:error.message||'Could not parse this file.'});}
};
