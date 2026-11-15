import assert from 'node:assert/strict';import {expandLinearModal} from "../../modal.mjs";
assert.deepEqual(expandLinearModal(['G1 X1','X2 Y3 ; second','G91','Y-1 E0.2','M83','E1','G0 X0','Z2']),['G1 X1','G1 X2 Y3 ; second','G91','G1 Y-1 E0.2','M83','G1 E1','G0 X0','G0 Z2']);
for(const lines of [['X1'],['G2 X1 I1','X2 I1'],['G1 X1','G28','X2'],['G1 X1','M104 S200','X2'],['G1 X1','I2'],['G1 X1','F300']])assert.throws(()=>expandLinearModal(lines),/modal move cannot be interpreted safely/i);
assert.deepEqual(expandLinearModal(['; start','G01 X1','; comment','X2']),['; start','G01 X1','; comment','G1 X2']);console.log('PASS bounded linear modal moves and ambiguous-mode rejection');
// Numbered-line rejection is checked in the real worker test, not this transformer.
