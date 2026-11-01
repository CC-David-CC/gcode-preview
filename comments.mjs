// Strip standard parenthesized comments before the upstream word parser sees
// them. Semicolon comments remain intact for the preview's metadata parser.
export function stripParenthesizedComments(line){
 let result='',start=0,inside=false;
 for(let i=0;i<line.length;i++){
  const ch=line[i];
  if(!inside&&ch===';')return result+line.slice(start);
  if(ch==='('){if(inside)throw Error('Nested parenthesized comments are not supported. The current view is unchanged.');result+=line.slice(start,i)+' ';inside=true;}
  else if(ch===')'){if(!inside)throw Error('Unmatched parenthesis in G-code. The current view is unchanged.');inside=false;start=i+1;}
 }
 if(inside)throw Error('Unclosed parenthesized comment in G-code. The current view is unchanged.');
 return result+line.slice(start);
}
