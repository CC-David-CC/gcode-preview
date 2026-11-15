import {test} from 'node:test';
import assert from 'node:assert/strict';
import {watchPreviewVisibility,releasePreview} from '../apps/system/gcode-preview/preview-lifecycle.mjs';
function rig(){
 const handlers=new Map();const doc={hidden:false,addEventListener:(n,f)=>handlers.set(n,f),removeEventListener:(n,f)=>{if(handlers.get(n)===f)handlers.delete(n)}};
 let resize,mutation;class R{constructor(cb){this.cb=cb;resize=this}observe(){}disconnect(){this.closed=true}}class M{constructor(cb){this.cb=cb;mutation=this}observe(win){this.win=win}disconnect(){this.closed=true}}
 const classes=new Set(),win={hidden:false,classList:{contains:x=>classes.has(x)}},stage={isConnected:true,clientWidth:400,clientHeight:300,closest:()=>win};
 const counts={pause:0,resume:0,resize:0,dispose:0,loss:0},preview={cancelAnimation(){counts.pause++},animate(){counts.resume++},resize(){counts.resize++},dispose(){counts.dispose++},renderer:{forceContextLoss(){counts.loss++}}};
 let current=preview,valid=true;const lifecycle=watchPreviewVisibility(stage,()=>current,()=>valid,{document:doc,ResizeObserver:R,MutationObserver:M});
 return {doc,handlers,resize,mutation,classes,win,stage,preview,counts,lifecycle,setCurrent:x=>current=x,setValid:x=>valid=x};
}
test('pauses once while hidden, minimized or rolled and resumes only on visibility',()=>{
 const r=rig();r.lifecycle.update();assert.equal(r.counts.pause,0);r.win.hidden=true;r.mutation.cb();r.mutation.cb();assert.equal(r.counts.pause,1);r.win.hidden=false;r.mutation.cb();assert.equal(r.counts.resume,1);
 r.classes.add('rolled');r.mutation.cb();assert.equal(r.counts.pause,2);r.classes.delete('rolled');r.mutation.cb();assert.equal(r.counts.resume,2);
 r.doc.hidden=true;r.handlers.get('visibilitychange')();assert.equal(r.counts.pause,3);r.doc.hidden=false;r.handlers.get('visibilitychange')();assert.equal(r.counts.resume,3);
 r.stage.clientWidth=0;r.resize.cb();assert.equal(r.counts.pause,4);r.stage.clientWidth=400;r.resize.cb();assert.equal(r.counts.resume,4);
 r.lifecycle.dispose();assert.equal(r.handlers.size,0);assert.equal(r.resize.closed,true);assert.equal(r.mutation.closed,true);r.lifecycle.update();assert.equal(r.counts.resume,4);
});
test('replacement viewer and closed/account-invalid windows do not keep looping',()=>{
 const r=rig();r.lifecycle.update();r.setValid(false);r.lifecycle.update();assert.equal(r.counts.pause,1);r.setValid(true);r.lifecycle.update();assert.equal(r.counts.resume,1);
 const other={...r.preview,animate(){throw Error('already running')}};r.setCurrent(other);r.lifecycle.update();r.lifecycle.dispose();
 releasePreview(r.preview);assert.equal(r.counts.dispose,1);assert.equal(r.counts.loss,1);
});
test('WebGL context is released even if upstream dispose throws',()=>{
 let lost=false;const warn=console.warn;console.warn=()=>{};try{assert.doesNotThrow(()=>releasePreview({dispose(){throw Error('dispose failed')},renderer:{forceContextLoss(){lost=true}}}));}finally{console.warn=warn;}assert.equal(lost,true);
});
