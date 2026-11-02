// Keep each viewer's render loop tied to its actual window and document.
export function watchPreviewVisibility(stage, getPreview, isValid, {
  document: doc = globalThis.document,
  ResizeObserver: Resize = globalThis.ResizeObserver,
  MutationObserver: Mutation = globalThis.MutationObserver,
} = {}) {
  let disposed=false, last=null, running=false, observedWindow=null;
  const mutations=new Mutation(()=>update());
  function observeWindow() {
    const win=stage.closest('.window');
    if(win===observedWindow)return;
    mutations.disconnect();observedWindow=win;
    if(win)mutations.observe(win,{attributes:true,attributeFilter:['hidden','class']});
  }
  function update() {
    if(disposed)return;
    observeWindow();
    const current=getPreview();
    if(current!==last){last=current;running=!!current;}
    if(!current)return;
    const visible=isValid()&&!doc.hidden&&stage.isConnected&&stage.clientWidth>0&&stage.clientHeight>0&&
      !observedWindow?.hidden&&!observedWindow?.classList.contains('rolled');
    if(!visible&&running){current.cancelAnimation();running=false;}
    else if(visible&&!running){current.resize();current.animate();running=true;}
    else if(visible)current.resize();
  }
  const resize=new Resize(()=>update());resize.observe(stage);
  doc.addEventListener('visibilitychange',update);
  return {update,dispose(){if(disposed)return;disposed=true;resize.disconnect();mutations.disconnect();doc.removeEventListener('visibilitychange',update);last=null;}};
}

export function releasePreview(preview) {
  if(!preview)return;
  // Three's renderer.dispose() frees GPU resources, but does not itself lose
  // the WebGL context. The window owns this renderer and never reuses it.
  try{preview.dispose();}catch(error){console.warn('Could not fully dispose G-code preview:',error);}
  try{preview.renderer?.forceContextLoss?.();}catch(error){console.warn('Could not release G-code graphics context:',error);}
}
