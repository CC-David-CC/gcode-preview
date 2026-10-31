import {CodiParser} from 'gcode-preview';
self.onmessage=({data})=>{
 try{
  const code=new TextDecoder('utf-8',{fatal:true}).decode(data.bytes);
  if(!/(?:^|\n)\s*(?:N\d+\s*)?G0?[0123](?=\s|[XYZEFIJR;]|$)/im.test(code))throw Error('No supported G0–G3 moves were found. The current view is unchanged.');
  if(/^(?:[^;\r\n]*?[ \t])?G0?91(?=[ \tXYZEFIJR;]|$)/im.test(code))throw Error('Relative positioning (G91) is not supported. The current view is unchanged.');
  if(/^(?:[^;\r\n]*?[ \t])?G0?20(?=[ \tXYZEFIJR;]|$)/im.test(code))throw Error('Inch units (G20) are not supported. The current view is unchanged.');
  if(/^[ \t]*N\d+[ \t]*G0?[0123](?=[ \tXYZEFIJR;]|$)/im.test(code))throw Error('Numbered move commands are not supported. The current view is unchanged.');
  if(/^[ \t]*(?:N\d+[ \t]*)?G0?92(?=[ \tXYZEFIJR;]|$)[^;\r\n]*[XYZ]/im.test(code))throw Error('Coordinate resets (G92 X/Y/Z) are not supported. The current view is unchanged.');
  const parser=new CodiParser(0);parser.parseGCode(code);
  self.postMessage({preamble:parser.preamble,layers:parser.layers,metadata:parser.metadata});
 }catch(error){self.postMessage({error:error.message||'Could not parse this file.'});}
};
