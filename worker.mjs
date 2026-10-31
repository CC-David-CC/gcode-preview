import {CodiParser} from 'gcode-preview';
import {expandLinearModal} from './modal.mjs';
import {normalizeArc} from './arcs.mjs';
self.onmessage=({data})=>{
 try{
  const code=new TextDecoder('utf-8',{fatal:true}).decode(data.bytes);
  if(!/(?:^|\n)\s*(?:N\d+\s*)?G0?[0123](?=\s|[XYZEFIJR;]|$)/im.test(code))throw Error('No supported G0–G3 moves were found. The current view is unchanged.');
  if(/^[ \t]*N\d+(?=\s|[A-Z]|$)/im.test(code))throw Error('Numbered commands are not supported. The current view is unchanged.');
  if(/^[ \t]*G0?92\.[123](?=[ \tXYZEFIJR;]|$)/im.test(code))throw Error('Coordinate reset modes (G92.1–G92.3) are not supported. The current view is unchanged.');
  if(/^[ \t]*G0?9[01]\.1(?=[ \tXYZEFIJR;]|$)/im.test(code))throw Error('Arc center mode changes (G90.1/G91.1) are not supported. The current view is unchanged.');
  const parser=new CodiParser(0),commands=parser.lines2commands(expandLinearModal(code.split('\n')));
  // The renderer treats a positive E parameter as deposition. Convert absolute
  // E coordinates to deltas, and honor explicit relative E and G92 E resets.
  // This only classifies paths; it does not simulate the extruder or material.
  let relative=false,relativeXYZ=false,hadMoves=false,tool=0,x=0,y=0,z=0,units=1,offsetX=0,offsetY=0,offsetZ=0;const positions=new Map([[0,0]]);
  const finite=value=>{if(!Number.isFinite(value))throw Error('A coordinate is outside the supported range. The current view is unchanged.');return value;};
  for(const command of commands){
   if((command.src.split(';',1)[0].match(/[GMT]\s*\d+(?:\.\d+)?/gi)||[]).length>1)throw Error('Multiple commands on one line are not supported. The current view is unchanged.');
   const op=command.gcode;if(['g20','g020','g21','g021'].includes(op)){if(Object.keys(command.params||{}).length)throw Error('Coordinates on a unit-mode line are not supported. The current view is unchanged.');units=op==='g20'||op==='g020'?25.4:1;continue}
   if((op==='g28'||op==='g028')&&hadMoves)throw Error('Homing after a move is not supported. The current view is unchanged.');
   if(['g10','g010','g43','g043','g49','g049','g51','g051','g68','g068','g69','g069','g18','g018','g19','g019','g52','g052','g53','g053','g54','g054','g55','g055','g56','g056','g57','g057','g58','g058','g59','g059'].includes(op)||/^g0?(?:59|92)\./.test(op))throw Error('This coordinate system or arc plane is not supported. The current view is unchanged.');
   if(['g90','g090','g91','g091'].includes(op)){if(Object.keys(command.params||{}).length)throw Error('Coordinates on a positioning-mode line are not supported. The current view is unchanged.');relativeXYZ=op==='g91'||op==='g091';continue}if(op==='m82'){relative=false;continue}if(op==='m83'){relative=true;continue}
   if(/^t[0-9]+$/.test(op)){tool=Number(op.slice(1));if(!positions.has(tool))positions.set(tool,0);continue}
   if(op==='g92'||op==='g092'){const p=command.params||{},keys=Object.keys(p);if(!keys.length||keys.some(k=>!['x','y','z','e'].includes(k)||!Number.isFinite(p[k])))throw Error('This coordinate reset is not supported. The current view is unchanged.');if(p.x!==undefined)offsetX=finite(x-finite(p.x*units));if(p.y!==undefined)offsetY=finite(y-finite(p.y*units));if(p.z!==undefined)offsetZ=finite(z-finite(p.z*units));if(p.e!==undefined)positions.set(tool,finite(p.e*units));continue}
   if(!/^g0?[0123]$/.test(op))continue;
   hadMoves=true;
   for(const axis of ['x','y','z','e','i','j','r','f'])if(command.params[axis]!==undefined){if(!Number.isFinite(command.params[axis]))throw Error('A move contains an invalid coordinate. The current view is unchanged.');command.params[axis]=finite(command.params[axis]*units);}
   const nextX=command.params.x===undefined?x:relativeXYZ?x+command.params.x:command.params.x+offsetX,nextY=command.params.y===undefined?y:relativeXYZ?y+command.params.y:command.params.y+offsetY,nextZ=command.params.z===undefined?z:relativeXYZ?z+command.params.z:command.params.z+offsetZ;
   finite(nextX);finite(nextY);finite(nextZ);if(command.params.x!==undefined)command.params.x=nextX;if(command.params.y!==undefined)command.params.y=nextY;if(command.params.z!==undefined)command.params.z=nextZ;
   if(/^g0?[23]$/.test(op))normalizeArc(command.params,{x,y},{x:nextX,y:nextY},/^g0?2$/.test(op));
   x=nextX;y=nextY;z=nextZ;if(!Number.isFinite(command.params.e))continue;
   const value=command.params.e,previous=positions.get(tool)??0,delta=relative?value:value-previous;
   positions.set(tool,finite(relative?previous+value:value));command.params.e=finite(delta);
  }
  parser.groupIntoLayers(commands);parser.metadata.thumbnails=parser.parseMetadata(commands.filter(c=>c.comment)).thumbnails;
  self.postMessage({preamble:parser.preamble,layers:parser.layers,metadata:parser.metadata});
 }catch(error){self.postMessage({error:error.message||'Could not parse this file.'});}
};
