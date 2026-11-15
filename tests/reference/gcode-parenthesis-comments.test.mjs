import assert from 'node:assert/strict';
import {stripParenthesizedComments as strip} from "../../comments.mjs";
assert.equal(strip('G1 X10 (X999 M999; comment) Y10 ; (not a command)'), 'G1 X10   Y10 ; (not a command)');
assert.equal(strip('(begin) G1 X10 (end)'), '  G1 X10  ');
assert.equal(strip('G1 X10 ; unmatched ( is inside semicolon comment'), 'G1 X10 ; unmatched ( is inside semicolon comment');
assert.equal(strip('G1 X10'), 'G1 X10');
for(const line of ['G1 X10 (unclosed','G1 X10 ) stray','G1 X10 (nested (comment))'])assert.throws(()=>strip(line),/parenthes/i);
console.log('PASS parenthesized comment removal and malformed comment rejection');
