import assert from 'node:assert/strict';import {normalizeArc,arcSegmentCount} from '../apps/system/gcode-preview/arcs.mjs';
const start={x:0,y:0},end={x:10,y:0};
for(const [cw,r,sign] of [[true,10,-1],[true,-10,1],[false,10,1],[false,-10,-1]]){const p=normalizeArc({x:10,y:0,r},start,end,cw);assert.equal(p.i,5);assert.ok(Math.abs(p.j-sign*Math.sqrt(75))<1e-12);assert.equal('r' in p,false)}
assert.deepEqual(normalizeArc({i:5,j:0,x:10},start,end,true),{i:5,j:0,x:10});
for(const params of [{r:4},{r:0},{r:10,i:1},{},{i:0,j:0},{i:1,p:2}])assert.throws(()=>normalizeArc(params,start,end,true));
assert.throws(()=>normalizeArc({i:1},start,start,true),/full-circle/);assert.throws(()=>normalizeArc({r:1e308},start,end,true),/outside/);
assert.equal(arcSegmentCount({i:5,j:0},start,end,true),Math.ceil(5*Math.PI/1.8));assert.ok(arcSegmentCount(normalizeArc({r:-10},start,end,true),start,end,true)>arcSegmentCount(normalizeArc({r:10},start,end,true),start,end,true));assert.throws(()=>arcSegmentCount({i:1.7e308,j:1.7e308},start,end,true),/outside/);assert.throws(()=>arcSegmentCount({i:1e200,j:0},start,end,true),/outside/);
console.log('PASS radius sign and direction, center conversion and unsupported arc rejection');
