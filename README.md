# G-code Preview

This app uses gcode-preview to display a 3D visualization of account-mirrored
`.gcode`, `.gco`, or `.nc` files. It reads data in the browser and does not
connect to a printer. The displayed 220 × 220 × 250 mm build grid is illustrative,
not a detected printer profile; it is not a complete simulator or a guarantee a
file is safe or suitable for a particular machine. WebGL is required.
Run `npm ci --prefix apps/system/gcode-preview --ignore-scripts` before building.
