import * as Preview from 'gcode-preview';
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
  const body=make('div','window-content gcode-app'),intro=make('p','gcode-intro'),bar=make('div','gcode-bar');
  const path=appInput('G-code file path',w.launchContext?.path||'/'),stage=make('div','gcode-stage'),status=make('div','app-status');
  const travel=document.createElement('input');travel.type='checkbox';travel.checked=true;
  const travelLabel=make('label','gcode-travel');travelLabel.append(travel,document.createTextNode(' Show non-extruding moves'));
  intro.textContent='Inspect a toolpath in your browser. This is a visual preview, not a machine or safety check; it does not connect to a printer or CNC machine.';
  let disposed=false,preview=null,canvas=null,observer,busy=false,operation=0;
  const valid=()=>!disposed&&!host.signal.aborted&&body.isConnected&&owner===signedInSubject();
  const tell=t=>{if(valid())status.textContent=t;};
  function show(code,source){
    if(!/(?:^|\n)\s*(?:N\d+\s*)?G0?[0123](?=\s|[XYZEFIJR;]|$)/im.test(code))throw Error('No supported G0–G3 moves were found. The current view is unchanged.');
    const candidate=document.createElement('canvas');candidate.className='gcode-candidate';candidate.setAttribute('aria-label','3D G-code preview');stage.append(candidate);
    let next;
    try{
      next=Preview.init({canvas:candidate,renderExtrusion:true,renderTravel:travel.checked,buildVolume:{x:220,y:220,z:250},extrusionColor:'#5575df',travelColor:'#d16b35'});
      next.processGCode(code);next.resize();
      if(!valid())throw Error('Window closed.');
      const previous=preview,old=canvas;preview=next;canvas=candidate;next=null;candidate.classList.remove('gcode-candidate');previous?.dispose();old?.remove();
      tell(source+' loaded. Drag to rotate; pinch or scroll to zoom. The 220 × 220 × 250 mm grid is illustrative, not a printer profile.');
    }catch(e){next?.dispose();candidate.remove();throw e;}
  }
  async function open(selected){
    if(busy||!valid())return;busy=true;const token=++operation;
    try{
      const c=await mirrorFileContext(),p=c.path(selected||path.value);
      if(!/\.(?:gcode|gco|nc)$/i.test(p))throw Error('Choose a .gcode, .gco, or .nc file from My files.');
      const f=await c.files.read(p);
      if(f.status==='conflict')throw Error('Resolve the file conflict in Files first.');
      if(f.data.length>128*1024*1024)throw Error('G-code files are limited to 128 MiB.');
      if(!valid()||!c.valid()||token!==operation)return;
      const code=new TextDecoder('utf-8',{fatal:true}).decode(f.data);
      show(code,p.split('/').pop());path.value=p;
    }catch(e){tell('Could not preview G-code: '+e.message);}finally{busy=false;}
  }
  async function browse(){
    if(busy||!valid())return;
    try{const selected=await host.storage.pickFile({extensions:['.gcode','.gco','.nc'],signal:host.signal});if(selected&&valid())await open(selected);}catch(e){tell('Could not choose a file: '+e.message);}
  }
  travel.addEventListener('change',()=>{if(preview&&valid()){preview.renderTravel=travel.checked;preview.render();}});
  const location=document.createElement('details'),summary=make('summary','','File path'),pathBar=make('div','gcode-bar');
  pathBar.append(path,textButton('Open path',()=>open()));location.append(summary,pathBar);
  bar.append(textButton('Open from My files',browse),textButton('Try example',()=>{if(busy||!valid())return;try{show(EXAMPLE,'Example');}catch(e){tell('Could not preview example: '+e.message);}}),textButton('Files',()=>desktop.launch('files')),travelLabel);
  body.append(intro,bar,location,stage,status);tell('Open a file from My files, or try the example. Upload from your computer in Files.');
  observer=new ResizeObserver(()=>{if(preview&&valid())preview.resize();});observer.observe(stage);
  if(w.launchContext?.storage==='mirror'&&w.launchContext.owner===owner)queueMicrotask(()=>open(w.launchContext.path));
  return {element:body,dispose(){if(disposed)return;disposed=true;operation++;observer.disconnect();preview?.dispose();canvas?.remove();}};
}
