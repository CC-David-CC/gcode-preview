import assert from 'node:assert/strict';
import {nominalPostProbe,ASSUMPTION} from '../apps/system/gcode-preview/experimental/nominal-probe.mjs';
const options={assumption:ASSUMPTION};
assert.throws(()=>nominalPostProbe('G29\nG1 X1'),/assumptions/);
const input='G28\nG29\nG90\nM82\nG1 E-1.5\nG1 Z0.25\nG1 X10 Y20\nG1 E0\nG1 X30 E1\nG91\nM83\nG1 Y2 E0.2\n';
const r=nominalPostProbe(input,options);assert.equal(r.suppressedTransitions,2);assert.match(r.warning,/not the physical machine path/);assert.deepEqual(r.segments,[{from:{x:10,y:20,z:.25},to:{x:30,y:20,z:.25},kind:'extruding'},{from:{x:30,y:20,z:.25},to:{x:30,y:22,z:.25},kind:'extruding'}]);
const compact=nominalPostProbe(input,{...options,packed:true});assert.equal(compact.segmentCount,2);assert.deepEqual([...compact.positions],[10,20,.25,30,20,.25,30,20,.25,30,22,.25]);assert.deepEqual([...compact.kinds],[1,1]);assert.equal(compact.suppressedTransitions,2);
// A relative move cannot establish an unknown axis. Absolute positions may be
// established one at a time, but all transitions until then remain omitted.
const relative=nominalPostProbe('G29\nG91\nG1 X1\nG90\nG1 X3\nG1 Y4\nG1 Z5\nG1 X6 E4\nG1 Y8 E5',options);
assert.equal(relative.suppressedTransitions,4);assert.equal(relative.segments[0].kind,'unknown');assert.equal(relative.segments[1].kind,'extruding');
const inch=nominalPostProbe('G29\nG20\nG90\nG1 X1 Y2 Z0\nG1 X2',options);assert.equal(inch.segments[0].from.x,25.4);assert.equal(inch.segments[0].to.x,50.8);
for(const source of ['G29\nG92 X0\nG1 X1','G29\nG1 XBAD','G29\nG1 X1 X2','G29\nG1 X1 G1 Y2','G29\nG2 X1 Y2 I1','G29\nM221 S0','G29\nG28\nG1 X1','M98 P1\nG29','G1 XBAD\nG29','G29 P1\nG1 X1','G29\nG30','G29\nT1'])assert.throws(()=>nominalPostProbe(source,options),/Unsupported|ambiguous/);
const end=nominalPostProbe('G29\nG1 X1 Y2 Z3\nG1 X4\nG28 X0 Y0\nM84',options);assert.equal(end.segments.length,1);assert.deepEqual(end.position,{x:null,y:null,z:null});
const gap=nominalPostProbe('G29\nG1 X1 Y2 Z3\nG1 X4\nM84\nG1 X20 Y30 Z40\nG1 X50', {...options,packed:true});assert.equal(gap.suppressedTransitions,2);assert.deepEqual([...gap.positions],[1,2,3,4,2,3,20,30,40,50,30,40]);
assert.throws(()=>nominalPostProbe('G29\n'+'G1 X1\n'.repeat(200001),options),/budget/);
assert.throws(()=>nominalPostProbe('G29\n'+' '.repeat(8*1024*1024),options),/oversized/);
// Common slicer startup: preheat and fan controls precede homing/probing. They
// are non-motion commands under the explicit no-firmware-macro assumptions.
const heated='M140 S60\nM104 S200 T0\nM190 S60\nM109 S200 T0\nM106 S128\nG4 P10\nG28\n'+input.slice(input.indexOf('G29'));
const heatResult=nominalPostProbe(heated,options);assert.deepEqual(heatResult.segments,r.segments);assert.equal(heatResult.suppressedTransitions,r.suppressedTransitions);
assert.throws(()=>nominalPostProbe('M104 S200 T1\nG29\nG1 X1',options),/Unsupported|ambiguous/);
assert.throws(()=>nominalPostProbe('M104 S200 S210\nG29\nG1 X1',options),/Unsupported|ambiguous/);
// A pre-probe extruder-coordinate reset is common, but the prototype must not
// carry its E value across probing; the first later absolute E stays unknown.
const beforeProbeReset=nominalPostProbe('G92 E0\nG28\nG29\nG90\nM82\nG1 X1 Y2 Z3\nG1 X4 E1\nG1 X5 E2',options);
assert.equal(beforeProbeReset.suppressedTransitions,1);assert.deepEqual(beforeProbeReset.segments.map(s=>s.kind),['unknown','extruding']);
for(const invalid of ['G92 X0\nG29','G92 E0 X0\nG29','G92 E0 E1\nG29','G92 Ebad\nG29'])assert.throws(()=>nominalPostProbe(invalid,options),/Unsupported|ambiguous/);
console.log('PASS nominal state, startup controls, pre-probe E reset and conservative geometry');
