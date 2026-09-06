# Grape grasper — Fox.Build Bambu A1 print package

Prepared September 5, 2026 with Bambu Studio 2.8.2.61.

All six parts are sliced on one plate. Estimate: **1 hour 59 minutes, 27.04 g of PLA**, including supports and brims. This is a first fit-test prototype; it has not yet been physically printed or assembled.

Fox.Build lists **Bambu A1 printers with a 256 × 256 × 256 mm build volume** and accepts PLA, PLA+, and PETG: https://fox.build/equipment/bambu-a1-3d-printers/

## At the makerspace

1. Confirm the printer is an **A1 with a 0.4 mm nozzle**, the installed plate is **textured PEI**, and the loaded filament is **ordinary PLA**. The website does not identify the installed nozzle or plate. This package assumes these three settings.
2. Open `grape-grasper-A1-PLA.3mf` in Bambu Studio **as a project**, preserving the six objects, placement, and settings. Review the Preview tab. Keep the supplied broad-face-down orientations.
3. If the nozzle, plate, or filament differs, select the actual printer/nozzle, plate, and material preset, then **Slice Plate again**. PETG needs a fresh slice with a PETG profile.
4. With the matching setup, either use Bambu Studio to send the sliced plate over the Fox.Build network, or copy `grape-grasper-A1-PLA.gcode` to the printer's microSD card and select it on the printer. Fox.Build documents both methods. Match the filament source to the spool actually loaded; leave timelapse off.
5. Enable bed leveling before printing and watch the first layer to make sure the small support bases and parts adhere.

The supplied G-code has already been sliced for the stated setup. Opening the 3MF does not require rebuilding the CAD model. The command-line export has no embedded thumbnail; the separate PNG previews show actual exported toolpaths. Bambu Studio can regenerate its native preview by slicing the project.

## Settings in the supplied slice

| Setting | Value |
| --- | --- |
| Printer | Bambu Lab A1, 0.4 mm nozzle |
| Material | Generic PLA, 1.75 mm |
| Plate | Textured PEI |
| Nozzle / bed | 220 °C / 65 °C |
| Layers | 0.16 mm; 0.20 mm first layer |
| Walls | 4 |
| Infill | 50% gyroid |
| Top / bottom | 6 / 5 layers, with 1.0 mm minimum top shell thickness |
| Supports | Automatic tree supports, build plate only |
| Support contact gap | 0.20 mm; 3 interface layers |
| Brim | 3 mm outside only, 0.10 mm separation |
| Colors / prime tower | One color; no prime tower |

## After printing

Let the plate cool, remove the parts, and carefully remove the brims and support trees. Hold each thin tip close to the support while separating it so you do not bend the tip. Inspect the nose fingers, jaw tip, and crank/trigger details for remaining support.

Clear the **1.5 mm wire slots**. Check the **3.25 mm pivot holes** and **2.25 mm link holes**; clean or ream them gently by hand if needed. Fit the 6 mm moving parts in the nominal 6.4 mm forks and confirm free movement before tightening pivot hardware. Follow the [assembly instructions in the project README](../../README.md#assembly).

## Files and checks

- `grape-grasper-A1-PLA.3mf`: editable project with six separate parts, settings, and embedded sliced G-code.
- `grape-grasper-A1-PLA.gcode`: the same unmodified G-code extracted for microSD use.
- `toolpath-preview.png`: first-layer and all-layer toolpath views; orange is support, grey is brim, teal is the part.
- `support-details.png`: detailed views of actual support paths under the raised tips.
- `slice-checks.json`: machine identity, source hashes, bounds, estimates, and validation results.

Validation: six unique objects, unchanged source triangle geometry, A1 printer identifier N2S, verified embedded G-code checksum, all object/support extrusions within the bed, and support toolpaths present for both nose parts and the jaw. Physical fit and support removal still need testing on the first print.
