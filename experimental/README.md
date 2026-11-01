# Unwired nominal post-probe experiment

This is a research prototype, not part of the desktop app or its build. The
production preview continues to reject G29/G30. `nominalPostProbe` requires the
exact `ASSUMPTION` identifier. That identifier describes a hypothetical Marlin
state immediately after a parameterless probe: millimeter units, absolute XYZ
and E, tool 0, zero coordinate offsets, and no probe end script changing state.
It omits pre-probe geometry and the probe itself; these are assumptions, not
facts learned from a printer. Returned paths are commanded-coordinate estimates,
not physical movement, material deposition, firmware validation, or safety
advice. Its returned warning must remain visibly associated with any future
preview. Do not add an opt-in UI without security, usability, and geometry work.

XYZ and E begin unknown. An absolute word establishes its coordinate; a relative
word cannot establish an unknown coordinate. An XYZ movement is omitted until
both its start and its end have known coordinates. A first absolute E value
establishes E but does not establish the amount extruded; where a displayed
movement's E delta is unknown it is marked `unknown`. A post-probe G28 marks
position unknown and only permits supported non-motion controls afterwards.
M18/M84 also mark position and E unknown. The experiment does not render a
non-drawing reposition: it returns a segment array, so a real renderer must
never join disconnected segment endpoints across an omitted transition.

The deliberately narrow subset handles linear G0/G1, Marlin G90/G91 and
M82/M83 modes, G20/G21, G92 E, tool T0, parameterless G29/G30, and specified
heater, fan, and dwell controls. XYZ G92, arcs, other tools, macros, repeated
probing, ambiguous syntax, unknown commands, post-homing motion, and most
machine-specific commands are rejected. Pre-probe content is limited to a small
startup subset and is not simulated. A different printer dialect or setup may
not obey these assumptions. No firmware macro may be silently treated as a
no-op. This small subset was selected for a test, not as broad G-code support.

The implementation processes up to 8 MiB of text and 200,000 moves, allocates
an array of segment objects, runs synchronously, and cannot be cancelled. These
limits belong to this experiment and do not change the normal 128 MiB file
limit. A future implementation needs a bounded cancellable worker, streaming or
compact typed geometry, independent chunk and total limits, tested renderer
suppression, clearly visible persistent warnings, user cancel and fresh-session
handling, and compatibility checks for broader Kiri and Marlin files.

Tests:

* `/tmp/codi-files-move-node/bin/node tests/gcode-nominal-probe-experiment.test.mjs`
  checks unknown positions and E, relative and absolute modes, unit changes,
  malformed input, unsupported commands, and post-homing failure.
* `tests/kiri-nominal-experiment-review.test.mjs` runs against an isolated
  desktop built with `grid-tools` and `gcode-preview`. It slices real Kiri
  example cubes, configures the startup to `G28; G29; G90; M82`, exports real
  G-code, confirms two unknown XYZ transitions are suppressed, and checks the
  first subsequent nominal segment. It also verifies the ordinary worker still
  refuses G29. The startup G29 is configured by the test, not claimed to be a
  Kiri default.

For a separate-process memory observation, generate that Kiri example and save
its output as an isolated temporary file, then run this from the SIMPLIFIED
root (do not use real user files):

```sh
/usr/bin/time -f 'peak_rss_kib=%M elapsed_seconds=%e' \
  /tmp/codi-files-move-node/bin/node --input-type=module -e '
import {readFile} from "node:fs/promises";
import {nominalPostProbe,ASSUMPTION} from "./apps/system/gcode-preview/experimental/nominal-probe.mjs";
const model=nominalPostProbe(await readFile(process.argv[1],"utf8"),{assumption:ASSUMPTION});
console.log("segments="+model.segments.length+" suppressed="+model.suppressedTransitions);
' /tmp/codi-kiri-nominal-generated.gcode
```

On one local run, a 3.6 MB, 127,688-segment export took 0.77 seconds and peaked
at 173,972 KiB RSS for the whole Node process. This is neither a browser/mobile
measurement nor a capacity guarantee. The export is disposable test data and
is not included in source control.
