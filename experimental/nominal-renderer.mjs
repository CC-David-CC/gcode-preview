/** Unwired adapter for the existing gcode-preview renderer; no physical claims. */
const MAX=200000,MAX_COORDINATE=1000000;
export function installNominalGeometry(preview,result){
 const positions=result?.positions,kinds=result?.kinds,count=result?.segmentCount;
 if(!(positions instanceof Float64Array)||!(kinds instanceof Uint8Array)||!Number.isInteger(count)||count<0||count>MAX||positions.length!==count*6||kinds.length!==count)throw Error('Invalid experimental geometry.');
 if(count===0)throw Error('No fully established nominal path segments were found.');
 let totals=[0,0,0];for(let i=0;i<count;i++){const kind=kinds[i];if(kind>2)throw Error('Invalid segment class.');totals[kind]++;for(let k=0;k<6;k++){const n=positions[i*6+k];if(!Number.isFinite(n)||Math.abs(n)>MAX_COORDINATE)throw Error('Nominal coordinate exceeds renderer range.')}}
 // Separate LineSegments: each pair stands alone, including across omitted gaps.
 // Float32 is the existing WebGL renderer's coordinate representation.
 const buffers=totals.map(n=>new Float32Array(n*6)),offsets=[0,0,0];for(let i=0;i<count;i++){const kind=kinds[i];buffers[kind].set(positions.subarray(i*6,i*6+6),offsets[kind]);offsets[kind]+=6;}
 preview.parser.preamble={commands:[]};preview.parser.layers=[{commands:[],height:0.2}];preview.parser.metadata={};
 preview.renderLayer=function(index){if(index!==0)return;if(this.renderTravel&&buffers[0].length)this.addLine(buffers[0],0xd16b35);if(this.renderExtrusion&&buffers[1].length)this.addLine(buffers[1],0x5575df);if(buffers[2].length)this.addLine(buffers[2],0xa83279);};
 return {counts:totals,warning:result.warning};
}
