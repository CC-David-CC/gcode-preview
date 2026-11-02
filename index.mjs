import * as Preview from 'gcode-preview';
import {createNominalPanel} from './experimental/nominal-panel.mjs';
import {installNominalGeometry} from './experimental/nominal-renderer.mjs';
import {watchPreviewVisibility,releasePreview} from './preview-lifecycle.mjs';
import './style.css';

const EXAMPLE = `; Example only: a small square on a 3D printer
G21 ; millimetres
G90 ; absolute positioning
M82 ; absolute extrusion
G0 X10 Y10 Z0.2
G1 X40 Y10 E1
G1 X40 Y40 E2
G1 X10 Y40 E3
G1 X10 Y10 E4
`;

export function mount(host) {
  const {w,desktop}=host, {make,textButton,appInput}=host.ui;
  const {mirrorFileContext,signedInSubject}=host.storage;
  const owner=w.launchContext?.owner||signedInSubject();
  w.ownerSub=owner;
  const body=make('div','window-content gcode-app'),intro=make('p','gcode-intro'),limits=document.createElement('details'),limitsSummary=make('summary','','Preview limits'),limitsText=make('p','gcode-limits'),bar=make('div','gcode-bar');
  const path=appInput('G-code file path',w.launchContext?.path||'/'),stage=make('div','gcode-stage'),sourceLabel=make('div','gcode-source','No toolpath open'),status=make('div','app-status');
  sourceLabel.setAttribute('aria-live','polite');stage.append(sourceLabel);
  const notice=make('p','gcode-file-notice');notice.hidden=true;notice.setAttribute('role','status');
  const nominalWarning=make('p','gcode-file-notice');nominalWarning.hidden=true;nominalWarning.setAttribute('role','status');
  const nominalOffer=make('div','gcode-nominal-offer');let nominalPanel=null;
  const travel=document.createElement('input');travel.type='checkbox';travel.checked=true;
  const travelLabel=make('label','gcode-travel');travelLabel.append(travel,document.createTextNode(' Show travel (orange)'));
  intro.textContent='Blue: estimated extrusion. Orange: travel or non-extruding. Assumes Marlin-style extrusion positioning. Visual preview only; not a machine or safety check.';
  limitsText.textContent='This viewer does not connect to a printer or CNC machine. The 220 × 220 × 250 mm grid is illustrative, not a printer profile. The preview starts at zero with millimeter units unless the file changes them; stored machine offsets and homing movement are not modeled. Extrusion mode follows Marlin: G90/G91 set XYZ and E modes and clear M82/M83 overrides; M82/M83 override E until the next G90/G91. Klipper and other firmware can differ. Turn on travel to see paths in CNC files without extrusion commands. Other controller behavior may differ.';limits.append(limitsSummary,limitsText);
  status.setAttribute('role','status');
  let previewInfo=null,disposed=false,preview=null,canvas=null,visibility,busy=false,operation=0,parseWorker=null,cancelParse=null,currentPath=null,unsubscribe=()=>{},watchRevision=0,checkRevision=0;
  const valid=()=>!disposed&&!host.signal.aborted&&body.isConnected&&owner===signedInSubject();
  const tell=t=>{if(valid())status.textContent=t;};
  function clearNominalOffer(){nominalPanel?.dispose();nominalPanel=null;nominalOffer.replaceChildren();}
  function clearWatch(){watchRevision++;checkRevision++;unsubscribe();unsubscribe=()=>{};currentPath=null;notice.textContent='';notice.hidden=true;reloadButton.disabled=true;}
  function watchFile(c,p,file){
    clearWatch();currentPath=p;reloadButton.disabled=false;const watch=watchRevision;
    const check=async()=>{const checkId=++checkRevision;let warning='';try{const now=await c.files.stat(p);warning=now.status==='conflict'?'This file has conflicting copies. Resolve them in Files.':(file.sha256&&now.sha256?file.sha256!==now.sha256:file.version!==now.version)?'This file changed. Select Reload to see the latest copy.':'';}catch(e){warning=e.message==='File not found.'?'This file is no longer available in My files.':'Could not check this file. The current preview remains open.';}if(!valid()||!c.valid()||watch!==watchRevision||checkId!==checkRevision)return;notice.textContent=warning;notice.hidden=!warning;};
    unsubscribe=c.files.subscribe(check);void check();
  }
  function parse(bytes,token){
    return new Promise((resolve,reject)=>{
      const worker=new Worker(new URL('./workers/parse.mjs',import.meta.url),{type:'module'});parseWorker=worker;cancelButton.disabled=false;let done=false,timer;
      const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);worker.terminate();if(parseWorker===worker){parseWorker=null;cancelParse=null;cancelButton.disabled=true;}error?reject(error):resolve(value);};
      timer=setTimeout(()=>finish(new Error('Parsing timed out. Try opening the file again.')),120000);
      cancelParse=()=>finish(new Error('Preview cancelled.'));
      worker.onerror=()=>finish(new Error('The G-code parser could not finish. The file may be too large for this device.'));
      worker.onmessageerror=()=>finish(new Error('The G-code parser response could not be read. Try opening the file again.'));
      worker.onmessage=({data})=>{if(token!==operation||!valid())return finish(new Error('Preview cancelled.'));if(data.error)return finish(new Error(data.error));finish(null,data);};
      try{worker.postMessage({bytes},[bytes.buffer]);}catch(error){finish(error);}
    });
  }
  async function show(bytes,source,token){
    tell('Parsing '+source+'…');const parsed=await parse(bytes,token);if(!valid()||token!==operation)return;
    const candidate=document.createElement('canvas');candidate.className='gcode-candidate';candidate.setAttribute('aria-label','3D G-code preview');stage.append(candidate);
    let next;
    try{
      next=Preview.init({canvas:candidate,renderExtrusion:true,renderTravel:travel.checked,buildVolume:{x:220,y:220,z:250},extrusionColor:'#5575df',travelColor:'#d16b35'});
      next.parser.preamble=parsed.preamble;next.parser.layers=parsed.layers;next.parser.metadata=parsed.metadata;next.render();next.resize();
      if(!valid()||token!==operation)throw Error('Window closed.');
      const previous=preview,old=canvas;preview=next;canvas=candidate;next=null;candidate.classList.remove('gcode-candidate');releasePreview(previous);old?.remove();visibility.update();
      nominalWarning.hidden=true;nominalWarning.textContent='';
      previewInfo={source,kind:'preview',layers:parsed.layers.length,commands:(parsed.preamble?.commands?.length||0)+parsed.layers.reduce((n,layer)=>n+(layer.commands?.length||0),0)};sourceLabel.textContent='Showing: '+source;sourceLabel.title=source;
      tell(source+' loaded. Grid is illustrative; drag to rotate, pinch or scroll to zoom.');
    }catch(e){releasePreview(next);candidate.remove();throw e;}
  }

  async function open(selected,{restore=false}={}){
    if(busy||!valid())return;clearNominalOffer();busy=true;const token=++operation;let target=null,readFailed=false,selectedFile=null,selectedContext=null;
    try{
      const c=await mirrorFileContext(),p=c.path(selected||path.value);target=p;
      if(!/\.(?:gcode|gco|nc|ngc|gc|g|tap)$/i.test(p))throw Error('Choose a G-code file (.gcode, .gco, .nc, .ngc, .gc, .g or .tap) from My files.');
      let f;try{f=await c.files.read(p);}catch(e){readFailed=true;throw e;}
      selectedFile=f;selectedContext=c;
      if(f.status==='conflict'){readFailed=true;throw Error('Resolve the file conflict in Files first.');}
      if(f.data.length>128*1024*1024)throw Error('G-code files are limited to 128 MiB.');
      if(!valid()||!c.valid()||token!==operation)return;
      await show(f.data,p,token);if(valid()&&c.valid()&&token===operation){path.value=p;w.launchContext=Object.freeze({version:1,storage:'mirror',path:p,owner});watchFile(c,p,f);}
    }catch(e){if(restore&&readFailed&&target&&valid()&&token===operation){clearWatch();currentPath=target;reloadButton.disabled=false;notice.textContent='The saved file could not be read. Select Reload to retry.';notice.hidden=false;}
      if(valid()&&token===operation&&target&&selectedFile&&selectedContext&&/Bed probing and leveling \(G29\/G30\)/.test(e.message))offerNominal(selectedContext,target,selectedFile,token);
      tell('Could not preview G-code: '+e.message);}finally{busy=false;}
  }
  function offerNominal(c,p,original,token){
    // Consent is tied to this exact snapshot. Re-read before analysis and
    // compare again before committing, so stale bytes cannot replace a view.
    if(!original.version)return;const same=f=>f.status!=='conflict'&&f.version===original.version&&(!original.sha256||f.sha256===original.sha256);
    let chosen=null;
    nominalPanel=createNominalPanel({signal:host.signal,workerURL:new URL('./workers/nominal.mjs',import.meta.url),
      confirm:(message,{signal})=>host.ui.confirm(message+' The experimental limit is 8 MiB. Continue only to see this hypothetical commanded path.',{title:'Hypothetical path assumptions',confirmLabel:'Analyze hypothetical path',cancelLabel:'Cancel',signal}),
      getBytes:async()=>{const now=await c.files.read(p);if(!valid()||!c.valid()||token!==operation||!same(now))throw Error('The file changed. Open it again before analyzing.');chosen=now;return now.data;},
      prepareGeometry:async()=>{const now=await c.files.stat(p);if(!valid()||!c.valid()||token!==operation||!same(now))throw Error('The file changed. Open it again before analyzing.');},
      onGeometry:result=>{
        if(!valid()||!c.valid()||token!==operation||!chosen)throw Error('The file is no longer available.');
        const candidate=document.createElement('canvas');candidate.className='gcode-candidate';candidate.setAttribute('aria-label','Hypothetical 3D G-code preview');stage.append(candidate);let next;
        try{
          next=Preview.init({canvas:candidate,renderExtrusion:true,renderTravel:travel.checked,buildVolume:{x:220,y:220,z:250},extrusionColor:'#5575df',travelColor:'#d16b35'});
          installNominalGeometry(next,result);next.render();next.resize();
          if(!valid()||!c.valid()||token!==operation)throw Error('Window closed.');
          const previous=preview,old=canvas;preview=next;canvas=candidate;next=null;candidate.classList.remove('gcode-candidate');releasePreview(previous);old?.remove();visibility.update();
          previewInfo={source:p,kind:'hypothetical',layers:null,commands:null};sourceLabel.textContent='Showing hypothetical path: '+p;sourceLabel.title=p;
          nominalWarning.textContent=result.warning+' Blue: estimated extrusion. Orange: travel. Magenta: unknown extrusion.';nominalWarning.hidden=false;
          path.value=p;w.launchContext=Object.freeze({version:1,storage:'mirror',path:p,owner});watchFile(c,p,chosen);
          tell('Hypothetical path loaded. Unknown transitions are omitted.');
        }catch(error){releasePreview(next);candidate.remove();throw error;}
      }});
    nominalOffer.replaceChildren(nominalPanel.element);
  }
  async function reload(){
    if(busy||!valid()||!currentPath)return;const target=currentPath;busy=true;let ready=false;
    try{tell('Checking the server for updates…');const c=await mirrorFileContext();await c.files.sync();ready=valid()&&c.valid()&&target===currentPath;}catch(e){tell('Could not check the server. The current preview remains open: '+e.message);}finally{busy=false;}
    if(ready)await open(target);
  }
  async function browse(){
    if(busy||!valid())return;
    busy=true;let selected=null;
    try{selected=await host.storage.pickFile({extensions:['.gcode','.gco','.nc','.ngc','.gc','.g','.tap'],signal:host.signal});}catch(e){tell('Could not choose a file: '+e.message);}finally{busy=false;}
    if(selected&&valid())await open(selected);
  }
  travel.addEventListener('change',()=>{if(preview&&valid()){preview.renderTravel=travel.checked;preview.render();}});
  const location=document.createElement('details'),summary=make('summary','','File path'),pathBar=make('div','gcode-bar');
  pathBar.append(path,textButton('Open path',()=>open()));location.append(summary,pathBar);
  const cancelButton=textButton('Cancel parsing',()=>cancelParse?.());cancelButton.disabled=true;
  const reloadButton=textButton('Reload',reload);reloadButton.disabled=true;
  bar.append(textButton('Open from My files',browse),reloadButton,cancelButton,textButton('Try example',async()=>{if(busy||!valid())return;clearNominalOffer();busy=true;const token=++operation;try{await show(new TextEncoder().encode(EXAMPLE),'Example',token);if(valid()&&token===operation){clearWatch();w.launchContext=null;}}catch(e){tell('Could not preview example: '+e.message);}finally{busy=false;}}),textButton('Files',()=>desktop.launch('files')),travelLabel);
  body.append(intro,limits,bar,location,notice,nominalOffer,nominalWarning,stage,status);tell('Open a file from My files, or try the example. Upload from your computer in Files.');
  if(host.commands){
    const ready=()=>{if(!valid()||busy||!preview||!previewInfo)throw Error('Open a toolpath and wait for the preview.');};
    const argsFor=(args,keys)=>{if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(k=>!keys.includes(k)))throw Error('Invalid command arguments.');};
    const inspect=host.commands.register({id:'inspect',description:'Inspect the currently displayed G-code preview and its limitations.',parameters:{type:'object',additionalProperties:false}},args=>{ready();argsFor(args,[]);return {...previewInfo,path:currentPath,showTravel:travel.checked,fileNotice:notice.hidden?'':notice.textContent,hypotheticalNotice:nominalWarning.hidden?'':nominalWarning.textContent,note:'Visual approximation only. It is not a machine simulation or safety check.'};});host.onDispose(inspect);
    const setTravel=host.commands.register({id:'set-travel',description:'Show or hide travel paths in the current preview.',parameters:{type:'object',required:['show'],properties:{show:{type:'boolean'}},additionalProperties:false}},args=>{ready();argsFor(args,['show']);if(typeof args.show!=='boolean')throw Error('Provide a boolean show value.');travel.checked=args.show;travel.dispatchEvent(new Event('change'));return {showTravel:travel.checked};});host.onDispose(setTravel);
  }
  visibility=watchPreviewVisibility(stage,()=>preview,valid);
  if(w.launchContext?.storage==='mirror'&&w.launchContext.owner===owner)queueMicrotask(()=>open(w.launchContext.path,{restore:true}));
  return {element:body,dispose(){if(disposed)return;disposed=true;operation++;clearNominalOffer();clearWatch();cancelParse?.();parseWorker?.terminate();visibility.dispose();releasePreview(preview);canvas?.remove();}};
}
