import assert from 'node:assert/strict';
import {nominalPostProbe,ASSUMPTION} from '../apps/system/gcode-preview/experimental/nominal-probe.mjs';
const options={assumption:ASSUMPTION};
assert.throws(()=>nominalPostProbe('G29\nG1 X1'),/assumptions/);
const input='G28\nG29\nG90\nM82\nG1 E-1.5\nG1 Z0.25\nG1 X10 Y20\nG1 E0\nG1 X30 E1\nG91\nM83\nG1 Y2 E0.2\n';
const r=nominalPostProbe(input,options);assert.equal(r.suppressedTransitions,2);assert.match(r.warning,/not the physical machine path/);assert.deepEqual(r.segments,[{from:{x:10,y:20,z:.25},to:{x:30,y:20,z:.25},kind:'extruding'},{from:{x:30,y:20,z:.25},to:{x:30,y:22,z:.25},kind:'extruding'}]);
// A relative move cannot establish an unknown axis. Absolute positions may be
// established one at a time, but all transitions until then remain omitted.
const relative=nominalPostProbe('G29\nG91\nG1 X1\nG90\nG1 X3\nG1 Y4\nG1 Z5\nG1 X6 E4\nG1 Y8 E5',options);
assert.equal(relative.suppressedTransitions,4);assert.equal(relative.segments[0].kind,'unknown');assert.equal(relative.segments[1].kind,'extruding');
const inch=nominalPostProbe('G29\nG20\nG90\nG1 X1 Y2 Z0\nG1 X2',options);assert.equal(inch.segments[0].from.x,25.4);assert.equal(inch.segments[0].to.x,50.8);
for(const source of ['G29\nG92 X0\nG1 X1','G29\nG1 XBAD','G29\nG1 X1 X2','G29\nG1 X1 G1 Y2','G29\nG2 X1 Y2 I1','G29\nM221 S0','G29\nG28\nG1 X1','M98 P1\nG29','G1 XBAD\nG29','G29 P1\nG1 X1','G29\nG30','G29\nT1'])assert.throws(()=>nominalPostProbe(source,options),/Unsupported|ambiguous/);
const end=nominalPostProbe('G29\nG1 X1 Y2 Z3\nG1 X4\nG28 X0 Y0\nM84',options);assert.equal(end.segments.length,1);assert.deepEqual(end.position,{x:null,y:null,z:null});
assert.throws(()=>nominalPostProbe('G29\n'+'G1 X1\n'.repeat(200001),options),/budget/);
assert.throws(()=>nominalPostProbe('G29\n'+' '.repeat(8*1024*1024),options),/oversized/);
console.log('PASS unwired nominal unknown-state, suppressed transitions, units, modes, extrusion and conservative rejection');
