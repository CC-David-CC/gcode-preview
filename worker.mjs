import {CodiParser} from 'gcode-preview';
self.onmessage=({data})=>{
 try{
  const code=new TextDecoder('utf-8',{fatal:true}).decode(data.bytes);
  if(!/(?:^|\n)\s*(?:N\d+\s*)?G0?[0123](?=\s|[XYZEFIJR;]|$)/im.test(code))throw Error('No supported G0–G3 moves were found. The current view is unchanged.');
  if(/^(?:[^;\r\n]*?[ \t])?G0?20(?=[ \tXYZEFIJR;]|$)/im.test(code))throw Error('Inch units (G20) are not supported. The current view is unchanged.');
  if(/^[ \t]*N\d+[ \t]*[GMT]\d/im.test(code))throw Error('Numbered commands are not supported. The current view is unchanged.');
  if(/^[ \t]*[XYZE][ \t]*[+\-.0-9]/im.test(code))throw Error('Modal coordinate-only lines are not supported. The current view is unchanged.');
  if(/^[ \t]*(?:N\d+[ \t]*)?G0?92(?=[ \tXYZEFIJR;]|$)[^;\r\n]*[XYZ]/im.test(code))throw Error('Coordinate resets (G92 X/Y/Z) are not supported. The current view is unchanged.');
  if(/^[ \t]*G0?9[01]\.1(?=[ \tXYZEFIJR;]|$)/im.test(code))throw Error('Arc center mode changes (G90.1/G91.1) are not supported. The current view is unchanged.');
  const parser=new CodiParser(0),commands=parser.lines2commands(code.split('\n'));
  // The renderer treats a positive E parameter as deposition. Convert absolute
  // E coordinates to deltas, and honor explicit relative E and G92 E resets.
  // This only classifies paths; it does not simulate the extruder or material.
  let relative=false,relativeXYZ=false,tool=0,x=0,y=0,z=0;const positions=new Map([[0,0]]);
  for(const command of commands){
   if((command.src.split(';',1)[0].match(/[GMT]\s*\d+(?:\.\d+)?/gi)||[]).length>1)throw Error('Multiple commands on one line are not supported. The current view is unchanged.');
   const op=command.gcode;if(['g90','g090','g91','g091'].includes(op)){if(Object.keys(command.params||{}).length)throw Error('Coordinates on a positioning-mode line are not supported. The current view is unchanged.');relativeXYZ=op==='g91'||op==='g091';continue}if(op==='m82'){relative=false;continue}if(op==='m83'){relative=true;continue}
   if(/^t[0-9]+$/.test(op)){tool=Number(op.slice(1));if(!positions.has(tool))positions.set(tool,0);continue}
   if(op==='g92'&&Number.isFinite(command.params?.e)){positions.set(tool,command.params.e);continue}
   if(!/^g0?[0123]$/.test(op))continue;
   for(const axis of ['x','y','z','e','i','j','r'])if(command.params[axis]!==undefined&&!Number.isFinite(command.params[axis]))throw Error('A move contains an invalid coordinate. The current view is unchanged.');
   const nextX=command.params.x===undefined?x:relativeXYZ?x+command.params.x:command.params.x,nextY=command.params.y===undefined?y:relativeXYZ?y+command.params.y:command.params.y,nextZ=command.params.z===undefined?z:relativeXYZ?z+command.params.z:command.params.z;
   if(command.params.x!==undefined)command.params.x=nextX;if(command.params.y!==undefined)command.params.y=nextY;if(command.params.z!==undefined)command.params.z=nextZ;
   if(/^g0?[23]$/.test(op)&&nextX===x&&nextY===y&&nextZ===z)throw Error('A full-circle arc cannot be shown reliably. The current view is unchanged.');
   x=nextX;y=nextY;z=nextZ;if(!Number.isFinite(command.params.e))continue;
   const value=command.params.e,previous=positions.get(tool)??0,delta=relative?value:value-previous;
   positions.set(tool,relative?previous+value:value);command.params.e=delta;
  }
  parser.groupIntoLayers(commands);parser.metadata.thumbnails=parser.parseMetadata(commands.filter(c=>c.comment)).thumbnails;
  self.postMessage({preamble:parser.preamble,layers:parser.layers,metadata:parser.metadata});
 }catch(error){self.postMessage({error:error.message||'Could not parse this file.'});}
};
