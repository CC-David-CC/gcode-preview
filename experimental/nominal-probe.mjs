/** Unwired, deliberately narrow post-probe nominal analysis, not a controller.
 * It does not render or execute. Exact assumptions are mandatory. */
import {stripParenthesizedComments} from '../comments.mjs';
export const ASSUMPTION='marlin-mm-absolute-xyz-absolute-e-tool0-no-offset-or-probe-macro/1';
export const WARNING='Hypothetical nominal path: all motion before and during probing and all transitions from unknown positions are omitted. Assumes millimeters, absolute XYZ and E, tool 0, zero coordinate offsets, and no probe end script changes. It is not the physical machine path or a safety check.';
const number=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
export function nominalPostProbe(source,{assumption}={}){
 if(assumption!==ASSUMPTION)throw Error('Explicit nominal assumptions required.');
 // This unoptimized prototype builds a segment array in memory; its smaller
 // cap is not the production file limit or a device capacity claim.
 if(typeof source!=='string'||source.length>8*1024*1024)throw Error('Invalid or oversized experimental G-code.');
 let after=false,homed=false,relativeXYZ=false,relativeE=false,scale=1,pos={x:null,y:null,z:null},e=null,suppressed=0,moves=0,lineNumber=0;const segments=[];
 const bad=()=>{throw Error('Unsupported or ambiguous command on line '+lineNumber+'.')};
 function parseWords(raw){const words={};let text=raw.trim();while(text){const m=text.match(/^([a-zA-Z])\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*/);if(!m)bad();const k=m[1].toLowerCase();if(Object.hasOwn(words,k)||!number.test(m[2])||!Number.isFinite(+m[2]))bad();words[k]=+m[2];text=text.slice(m[0].length)}return words;}
 for(const raw of source.split('\n')){
  lineNumber++;
  const line=stripParenthesizedComments(raw).split(';',1)[0].trim();if(!line)continue;
  const match=line.match(/^([gmt])\s*(\d+)(.*)$/i);if(!match)bad();const cmd=match[1].toUpperCase()+Number(match[2]),tail=match[3];
  if(!after){
   if(cmd==='G29'||cmd==='G30'){if(tail.trim())bad();after=true;continue}
   // The prototype does not display pre-probe paths. Accept only a very small
   // explicit startup subset; never silently skip malformed or unknown code.
   if(cmd==='G28'){const p=parseWords(tail);if(Object.keys(p).some(k=>!['x','y','z'].includes(k)))bad();continue}
   if(['G90','G91','G20','G21','M82','M83','T0'].includes(cmd)){if(tail.trim())bad();continue}
   bad();
  }
  if(cmd==='G29'||cmd==='G30')bad();
  if(cmd==='G28'){const p=parseWords(tail);if(Object.keys(p).some(k=>!['x','y','z'].includes(k)))bad();homed=true;pos={x:null,y:null,z:null};e=null;continue}
  if(homed&&!['M18','M84','M104','M109','M140','M190','M106','M107'].includes(cmd))bad();
  if(cmd==='G90'||cmd==='G91'){if(tail.trim())bad();relativeXYZ=cmd==='G91';relativeE=relativeXYZ;continue}
  if(cmd==='M82'||cmd==='M83'){if(tail.trim())bad();relativeE=cmd==='M83';continue}
  if(cmd==='G20'||cmd==='G21'){if(tail.trim())bad();scale=cmd==='G20'?25.4:1;continue}
  if(cmd==='G92'){const p=parseWords(tail);if(Object.keys(p).length!==1||!Object.hasOwn(p,'e'))bad();e=p.e*scale;if(!Number.isFinite(e))bad();continue}
  if(cmd==='T0'){if(tail.trim())bad();continue}
  // Disabled motors may be moved externally; do not assume the old position.
  if(cmd==='M18'||cmd==='M84'){if(tail.trim())bad();pos={x:null,y:null,z:null};e=null;continue}
  // These common controls are assumed to have no motion or modal side effects.
  // Heater-specific T0 is a selector, not a tool change.
  if(['G4','M104','M109','M140','M190','M106','M107'].includes(cmd)){
   const p=parseWords(tail),allowed=cmd==='G4'?'ps':cmd==='M106'?'ps':cmd==='M107'?'p':'srt';if(Object.keys(p).some(k=>!allowed.includes(k))||(Object.hasOwn(p,'t')&&p.t!==0))bad();continue;
  }
  if(cmd!=='G0'&&cmd!=='G1')bad();
  const p=parseWords(tail);if(Object.keys(p).some(k=>!['x','y','z','e','f'].includes(k)))bad();if(++moves>200000)throw Error('Nominal preview segment budget exceeded.');
  const from={...pos},to={...pos};for(const axis of ['x','y','z'])if(Object.hasOwn(p,axis)){const value=p[axis]*scale;to[axis]=relativeXYZ?(pos[axis]===null?null:pos[axis]+value):value;if(to[axis]!==null&&!Number.isFinite(to[axis]))bad()}
  let delta=null;if(Object.hasOwn(p,'e')){const value=p.e*scale;if(!Number.isFinite(value))bad();if(relativeE){delta=value;e=e===null?null:e+value}else{delta=e===null?null:value-e;e=value}if(e!==null&&!Number.isFinite(e))bad()}
  const hasXYZ=['x','y','z'].some(axis=>Object.hasOwn(p,axis));
  if(hasXYZ){if(Object.values(from).every(v=>v!==null)&&Object.values(to).every(v=>v!==null)){
    const kind=!Object.hasOwn(p,'e')?'travel':delta===null?'unknown':delta>0?'extruding':'travel';segments.push({from,to,kind});
   }else suppressed++;
  }
  pos=to;
 }
 if(!after)throw Error('No parameterless G29 or G30 found.');
 return {assumption,warning:WARNING,preProbeOmitted:true,suppressedTransitions:suppressed,position:pos,extruder:e,segments};
}
