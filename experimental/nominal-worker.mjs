/** Unwired one-job worker. Cancel by terminating this worker from its owner. */
import {nominalPostProbe} from './nominal-probe.mjs';
let used=false;
self.onmessage=({data})=>{
 if(used){self.postMessage({type:'error',error:'This experimental worker accepts one job.'});return}
 used=true;
 try{
  if(!data||data.type!=='parse'||!(data.bytes instanceof Uint8Array)||data.bytes.byteLength>8*1024*1024)throw Error('Invalid or oversized experimental G-code.');
  self.postMessage({type:'started'});
  const text=new TextDecoder('utf-8',{fatal:true}).decode(data.bytes);
  const result=nominalPostProbe(text,{assumption:data.assumption,packed:true});
  self.postMessage({type:'complete',result},[result.positions.buffer,result.kinds.buffer]);
 }catch(error){self.postMessage({type:'error',error:error?.message||'Could not analyze nominal G-code.'});}
};
