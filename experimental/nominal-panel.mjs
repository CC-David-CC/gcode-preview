/** Unwired UI adapter: host supplies consent, bytes and an atomic geometry sink. */
import {ASSUMPTION,WARNING} from './nominal-probe.mjs';
export function createNominalPanel({getBytes,confirm,onGeometry,prepareGeometry=async()=>{},workerURL=new URL('./nominal-worker.mjs',import.meta.url),signal}){
 if(typeof getBytes!=='function'||typeof confirm!=='function'||typeof onGeometry!=='function')throw Error('Experimental panel callbacks required.');
 const element=document.createElement('section'),warning=document.createElement('p'),status=document.createElement('p'),start=document.createElement('button'),cancel=document.createElement('button');
 warning.textContent=WARNING;warning.setAttribute('role','note');status.setAttribute('role','status');start.type=cancel.type='button';start.textContent='Analyze hypothetical path';cancel.textContent='Cancel analysis';cancel.disabled=true;element.append(warning,start,cancel,status);
 start.setAttribute('aria-label',start.textContent);cancel.setAttribute('aria-label',cancel.textContent);
 let disposed=false,busy=false,revision=0,worker=null,jobController=null;
 const valid=token=>!disposed&&!signal?.aborted&&token===revision;
 function reset(){worker?.terminate();worker=null;jobController?.abort();jobController=null;busy=false;start.disabled=false;cancel.disabled=true;}
 // Bound each asynchronous stage. Abort rejects the wrapper immediately even
 // when an underlying storage callback cannot itself be cancelled; late
 // results are ignored and may never install geometry.
 function bounded(action,jobSignal){return new Promise((resolve,reject)=>{
   let done=false,timer;const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);jobSignal.removeEventListener('abort',aborted);error?reject(error):resolve(value);};
   const aborted=()=>finish(Error('Analysis cancelled.'));if(jobSignal.aborted)return aborted();
   jobSignal.addEventListener('abort',aborted,{once:true});timer=setTimeout(()=>finish(Error('Analysis timed out. Try opening the file again.')),120000);
   Promise.resolve().then(()=>done?undefined:action()).then(value=>finish(null,value),error=>finish(error));
 });}
 function cancelJob(message='Analysis cancelled. Previous view is unchanged.') {revision++;reset();if(!disposed&&!signal?.aborted)status.textContent=message;}
 async function analyze(){
  if(disposed||signal?.aborted||busy)return;busy=true;start.disabled=true;cancel.disabled=false;const token=++revision;jobController=new AbortController();const jobSignal=jobController.signal;
  try{
   const approved=await confirm(WARNING,{signal:jobSignal});if(!valid(token))return;if(approved!==true){status.textContent='Analysis cancelled. Previous view is unchanged.';return}
   const source=await bounded(()=>getBytes({signal:jobSignal}),jobSignal);if(!valid(token))return;if(!(source instanceof Uint8Array)||source.byteLength>8*1024*1024)throw Error('Experimental files must be 8 MiB or smaller.');
   // Copy before transfer so the caller's file bytes remain owned by the caller.
   const bytes=source.slice(),taskWorker=new Worker(workerURL,{type:'module'});worker=taskWorker;status.textContent='Analyzing hypothetical path…';
   const outcome=await bounded(()=>new Promise((resolve,reject)=>{taskWorker.onmessage=({data})=>{if(data?.type==='complete')resolve(data.result);else if(data?.type==='error')reject(Error(data.error))};taskWorker.onerror=()=>reject(Error('Experimental worker failed.'));taskWorker.onmessageerror=()=>reject(Error('Experimental worker response could not be read.'));taskWorker.postMessage({type:'parse',assumption:ASSUMPTION,bytes},[bytes.buffer]);}),jobSignal);
   if(!valid(token))return;await bounded(()=>prepareGeometry(outcome,{signal:jobSignal}),jobSignal);if(!valid(token))return;
   // The receiver must stage and atomically replace its own view. No path is
   // presented by this adapter; every pair is an independent line segment.
   onGeometry(outcome);status.textContent='Hypothetical analysis ready; unknown transitions omitted. '+WARNING;
  }catch(error){if(valid(token))status.textContent='Could not analyze: '+error.message+' Previous view is unchanged.';}
  finally{if(valid(token))reset();}
 }
 start.addEventListener('click',analyze);cancel.addEventListener('click',()=>cancelJob());
 const aborted=()=>dispose();signal?.addEventListener('abort',aborted,{once:true});
 function dispose(){if(disposed)return;disposed=true;revision++;reset();signal?.removeEventListener('abort',aborted);start.removeEventListener('click',analyze);element.remove();}
 if(signal?.aborted)dispose();
 return {element,dispose};
}
