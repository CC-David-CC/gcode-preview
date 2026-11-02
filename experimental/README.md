# Nominal post-probe experiment

This is an experimental opt-in path in the local desktop source; it has not
been deployed. The ordinary preview continues to reject G29/G30.
`nominalPostProbe` requires the
exact `ASSUMPTION` identifier. That identifier describes a hypothetical Marlin
state immediately after a parameterless probe: millimeter units, absolute XYZ
and E, tool 0, zero coordinate offsets, and no probe end script changing state.
It omits pre-probe geometry and the probe itself; these are assumptions, not
facts learned from a printer. Returned paths are commanded-coordinate estimates,
not physical movement, material deposition, firmware validation, or safety
advice. Its returned warning must remain visibly associated with any future
preview. It must remain explicitly labeled as hypothetical.

XYZ and E begin unknown. An absolute word establishes its coordinate; a relative
word cannot establish an unknown coordinate. An XYZ movement is omitted until
both its start and its end have known coordinates. A first absolute E value
establishes E but does not establish the amount extruded; where a displayed
movement's E delta is unknown it is marked `unknown`. A post-probe G28 marks
position unknown and only permits supported non-motion controls afterwards.
M18/M84 also mark position and E unknown. The experiment does not use the
production renderer. Its compact result contains independent segment endpoints:
six Float64 coordinates and one byte per segment (0 travel, 1 estimated
extrusion, 2 unknown). A future renderer must draw each pair separately and
never join disconnected endpoints across an omitted transition.

The deliberately narrow subset handles linear G0/G1, Marlin G90/G91 and
M82/M83 modes, G20/G21, G92 E, tool T0, parameterless G29/G30, and specified
heater, fan, and dwell controls. XYZ G92, arcs, other tools, macros, repeated
probing, ambiguous syntax, unknown commands, post-homing motion, and most
machine-specific commands are rejected. Pre-probe content is limited to a small
startup subset and is not simulated; the subset includes the supported heater,
fan and dwell commands, an extruder-only `G92 E` reset, homing, and the listed
mode commands. An E reset before probing is validated but does not establish
the post-probe E value. A
different printer dialect or setup may
not obey these assumptions. No firmware macro may be silently treated as a
no-op. This small subset was selected for a test, not as broad G-code support.

The analyzer accepts up to 8 MiB of text and 200,000 moves. Its one-job
experimental worker returns transferable typed arrays and cancellation
terminates the worker. These limits do not change the normal 128 MiB file limit.
`nominal-panel.mjs` requires explicit host confirmation, displays a persistent
warning, and terminates work on cancel or dispose. The local desktop connects it
to My files and the existing renderer using an atomic candidate canvas and
independent line segments. It rechecks the locally observed file version before
committing and asks again after opening the file again. Server-side changes not
yet synchronized to the browser are not detected by this local check. Further
work includes physical-phone and broader Kiri/Marlin compatibility tests,
resource profiling, and review before deployment.

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
* `tests/kiri-nominal-preheat-review.test.mjs` configures a Kiri startup with
  `M140`, `M104`, `M190` and `M109` before `G28` and `G29`, slices example
  cubes, and checks the real browser worker's hypothetical geometry. Those
  startup commands are test configuration, not claimed Kiri defaults.
* `tests/kiri-nominal-e-reset-review.test.mjs` adds a pre-probe `G92 E0` to the
  configured startup and checks the generated Kiri output. It does not assume
  that this reset describes the post-probe extruder position.
* `tests/gcode-nominal-worker-browser.test.mjs` and
  `tests/gcode-nominal-panel-browser.test.mjs` exercise actual Chromium worker
  termination, typed non-joining geometry, confirmation, decline, invalid
  input, cancellation and disposal against `tests/serve-nominal-fixture.py`.
  `tests/kiri-nominal-panel-review.test.mjs` also passes the actual Kiri export
  through that experimental panel and a test-only 2D canvas sink at desktop
  and emulated-phone sizes, including decline and re-analysis. The fixture's
  confirmation and canvas are test implementations, not desktop integration.

For a separate-process memory observation, generate that Kiri example and save
its output as an isolated temporary file, then run this from the SIMPLIFIED
root (do not use real user files):

```sh
/usr/bin/time -f 'peak_rss_kib=%M elapsed_seconds=%e' \
  /tmp/codi-files-move-node/bin/node --input-type=module -e '
import {readFile} from "node:fs/promises";
import {nominalPostProbe,ASSUMPTION} from "./apps/system/gcode-preview/experimental/nominal-probe.mjs";
const model=nominalPostProbe(await readFile(process.argv[1],"utf8"),{assumption:ASSUMPTION,packed:true});
console.log("segments="+model.segmentCount+" suppressed="+model.suppressedTransitions);
' /tmp/codi-kiri-nominal-generated.gcode
```

For one local 3.6 MB, 127,688-segment export, the independent output buffers
used 6,256,712 bytes and the headless Chromium worker completed in about
578 ms. Separate Node processes measured 83,952 KiB peak RSS with packed
output and 155,696 KiB with object output; these include the entire process,
not just the geometry, and are not mobile measurements or capacity guarantees.
The export is disposable test data and is not included in source control.
