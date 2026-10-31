# G-code Preview

Use **Try example** to view a small example, or **Open from My files** to choose a `.gcode`, `.gco`, or `.nc` file. To bring a file from your computer, upload it in Files first. Files can also open a supported file directly in the viewer. Drag to rotate and scroll or pinch to zoom. The non-extruding moves switch can reveal travel paths, including movement in many CNC files.

The visualization runs in the visitor's browser using `gcode-preview` and WebGL. It does not edit or save G-code or connect to a machine. The fixed 220 × 220 × 250 mm grid is illustrative, not a detected printer profile. This is not a complete printer or CNC simulator, a machine compatibility check, or a safety guarantee. The underlying library is primarily designed for 3D-printing G-code and may omit or interpret commands differently from a particular controller. Verify toolpaths and machine settings with appropriate tools before running hardware.

Unsupported or unreadable files leave the previous preview in place. Files up to the shared 128 MiB limit are accepted, but parsing and rendering currently happen on the UI thread: large files can be slow or exhaust device memory. The example, upload, account/server sync, unsupported-file recovery, visual travel switch, close/reopen and fresh-session workflow were tested at desktop and emulated phone sizes; physical touch and broad controller compatibility remain unverified.

Run `npm ci --prefix apps/system/gcode-preview --ignore-scripts` before building with the shared public-app builder. Each window owns its WebGL preview and resize observer and disposes them when closed.
