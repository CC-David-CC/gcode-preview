# G-code Preview

Use **Try example** to view a small example, or **Open from My files** to choose a `.gcode`, `.gco`, `.nc`, `.ngc`, `.gc`, `.g`, or `.tap` file. To bring a file from your computer, upload it in Files first. Files can also open files with its existing G-code associations directly in the viewer; select the additional filename extensions inside G-code Preview. Drag to rotate and scroll or pinch to zoom. The non-extruding moves switch can reveal travel paths, including movement in many CNC files.

Only one file chooser can be open per viewer. Cancelling it keeps the current
preview, and closing the window invalidates a pending choice. The viewer does
not modify or save the selected G-code file.

When a file in My files changes, is removed, or develops a conflict, the viewer displays a separate notice while keeping the current preview. **Reload** first checks the server and then opens the current copy; an unavailable server, conflicting file, or invalid toolpath leaves the existing view open. The example has no saved file to reload.

The visualization runs in the visitor's browser using `gcode-preview` and WebGL. It does not edit or save G-code or connect to a machine. The fixed 220 × 220 × 250 mm grid is illustrative, not a detected printer profile. This is not a complete printer or CNC simulator, a machine compatibility check, or a safety guarantee. The underlying library is primarily designed for 3D-printing G-code and may omit or interpret commands differently from a particular controller. Verify toolpaths and machine settings with appropriate tools before running hardware.

Unsupported or unreadable files leave the previous preview in place. Numbered commands, multiple commands on one line, modal arcs and modal moves after unrecognized commands, coordinates on unit or positioning-mode lines, arc-center mode changes, full-circle arcs, coordinate-system selection, tool offsets, non-XY arc planes, and moves or coordinate resets following homing after a move are rejected because this viewer cannot reliably represent them. It starts at XYZ zero with millimeter units and no stored machine offsets; homing commands are not simulated, including a final homing move. Heater commands M104, M109, M140 and M190 may include a T parameter, which is treated as a heater selector rather than a tool change. The worker converts G20/G21 inches and millimeters, G92 X/Y/Z coordinate resets, and G90/G91 absolute and relative XYZ movements to millimeter positions before rendering and layer grouping. G92.1–G92.3 are rejected. This follows the basic [Marlin G20](https://marlinfw.org/docs/gcode/G020.html) and [G92](https://marlinfw.org/docs/gcode/G092.html) semantics; other controller dialects and persistent offsets can differ. It treats extrusion mode separately: M82/M83 select absolute/relative E and G90/G91 do not change E mode. Controllers can differ. For path coloring, the worker estimates extrusion from M82/M83, G92 E and per-tool E values; decreasing absolute E is treated as retraction. Controller-specific extrusion behavior and actual deposited material are not simulated. These checks do not detect every unsupported command or controller behavior. Files up to the shared 128 MiB limit are accepted. Parsing runs in a cancellable per-window worker; transferring the parsed commands and drawing their geometry still use the UI thread and memory. Large files can remain slow or exhaust device memory. A local worker test parses 100,000 moves and cancels a 500,000-move parse while the desktop remains responsive; it does not establish a 128 MiB device capacity. The example, upload, account/server sync, unsupported-file recovery, visual travel switch, close/reopen and fresh-session workflow were tested at desktop and emulated phone sizes; physical touch and broad controller compatibility remain unverified.

Run `npm ci --prefix apps/system/gcode-preview --ignore-scripts` before building with the shared public-app builder. Each window owns its WebGL preview and resize observer and disposes them when closed.

The build pins a narrow upstream patch that exports the library’s existing parser to the worker. The app uses the same library to render the resulting commands; review the patch and its hash when upgrading `gcode-preview`.

Parenthesized comments are removed before parsing, so text such as `(X999)`
cannot become a coordinate in the preview. Semicolon comments remain intact.
Unmatched or nested parentheses are rejected and leave the previous preview
open. This does not implement macro expressions or establish controller
compatibility.

The local compact-layout candidate keeps the visual-only warning visible and
puts additional interpretation limits under **Preview limits**. The app scrolls
when expanded controls or a short screen require it, and its main buttons have
44 px targets. Local desktop, emulated-phone and 4K account tests open a real
file, preserve the previous preview on an invalid file, and exercise the limits
and status. On a 320 × 568 emulated phone the complete preview fits before
opening details; the previous layout clipped it. The test moves the scroll
container programmatically, so physical touch scrolling remains unverified. The
change is live; it is a usability change, not a machine-safety check.

Equivalent relative and absolute paths were compared for coordinates, layers and rendered pixels in local desktop and emulated-phone tests; a live emulated-phone account workflow opened and recovered a relative file. Physical touch, machine behavior and other controller dialects remain unverified.

Local worker and desktop/phone-sized rendering tests compare equivalent inch and metric paths and equivalent coordinate-reset and absolute paths, including unit changes, extrusion and an XY arc. A 4K-sized viewport test covers the same file workflow. These comparisons do not establish controller or physical-machine compatibility.

Linear G0/G1 moves can continue on coordinate-only lines after an explicit G0/G1; supported unit, position and extrusion mode changes do not cancel that linear mode. Other commands conservatively clear it, and modal arcs are rejected. This is a limited preview interpretation and is not a controller or machine validation.

XY arcs with positive or negative R are converted to relative I/J center offsets using the common positive-R short arc and negative-R long arc convention. Zero or too-small radii, mixed R and I/J, missing or zero center offsets, multi-turn parameters, and full-circle or same-XY helical arcs are rejected. The checks do not establish that other arc commands are valid for a particular controller. Local tests compare geometry and rendered pixels for equivalent radius and center forms.

To prevent the renderer from attempting unbounded arc subdivision, the parsing worker estimates the displayed arc segments and rejects files exceeding 200,000 segments or overflowing its arc calculations. This is a preview resource limit; it does not guarantee that other large files will fit a device’s memory.

For I/J center arcs, the viewer rejects a start/end radius difference greater than the larger of 0.01 mm or 0.1% of the starting radius. This permits small rounding differences; it is a preview rule, not a controller-acceptance or safety guarantee. A rejected file leaves the previous view in place. Local desktop, emulated-phone and 4K and live emulated-phone account tests cover inconsistent and rounded centers, equivalent R/IJ paths and previous-view preservation.

Home-offset changes `M206` and `M428` are rejected because their effects are
not modeled. The current preview remains visible. Stored offsets and other
controller-specific behavior still cannot be inferred from the file; this is
not a machine compatibility or safety check. See [Marlin home offsets](https://marlinfw.org/docs/gcode/M206.html).

Hotend-offset commands `M218` are also rejected, including queries, because
their effect is not modeled. A rejected file leaves the previous preview open.
Other stored offsets may exist outside the file and remain unknown; this is
not controller or machine validation. See [Marlin M218](https://marlinfw.org/docs/gcode/M218.html).

Other unrecognized G commands carrying geometric or extrusion parameters are
also rejected: ignoring a spline, probing move, or drilling cycle could make
later toolpaths start from the wrong position. This conservative rule may also
reject non-motion commands that use those letters. Commands without those
parameters can still have controller-specific effects that are not modeled.

Moves containing A/B/C rotary axes or U/V/W additional axes and unsupported
G commands carrying these coordinates are rejected because this viewer cannot
represent their effect. The previous preview stays
visible. This does not identify every unsupported machine command or replace
controller-specific verification.

Malformed or repeated coordinate words in G0–G3 moves and G92 resets are
rejected rather than partially interpreted. This is not a comprehensive
G-code syntax or machine-safety check.

Motion after M2 or M30 is rejected as ambiguous. For example, [LinuxCNC](https://www.linuxcnc.org/docs/html/gcode/m-code.html) treats these as program-end commands, while [Marlin](https://marlinfw.org/docs/gcode/) uses M30 differently. The viewer does not select or validate a controller dialect.

The picker also accepts `.g`, `.gc`, `.ngc` and `.tap` names. These are
filename conventions, not controller detection: the existing conservative
parser still rejects unsupported commands and keeps the previous preview. Local
desktop and emulated-phone account tests cover those names, uppercase `.NGC`,
a rejected coordinate-system command, and fresh-session reopening. Physical
touch, other dialects, and machine execution are unverified.

[Marlin repeat markers and macros](https://marlinfw.org/docs/gcode/)
(`M808`, `M810`–`M819`) and common [LinuxCNC subprogram control](https://www.linuxcnc.org/docs/master/html/en/gcode/o-code.html)
(`M98`, `M99` and O-code) are rejected instead of drawing each source line as if it ran once. They are not
simulated. This is still not a complete interpreter or machine-safety check.
