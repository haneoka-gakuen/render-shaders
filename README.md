# Portable rendering shaders

`@haneoka/render-shaders` holds the canonical FP32 FSR 1.0.2 EASU/RCAS math.
It has no Vega, Cassiopeia, Flutter, DOM, or application dependency.
The optional `./three` adapter requires the host's Three instance. `./flutter`
exports thin Impeller source wrappers for the same kernels; the Flutter kernel
release contains those generated sources and its compiled five-backend bundle.

Input is an **opaque, tone-mapped gamma RGB world layer**. Bloom's sqrt-encoded
intermediates and HDR radiance are resolved by the caller first. Native UI,
subtitles, and controls are composed afterwards. EASU uses 12 texel-centre taps
on every backend and RCAS uses five taps. Each output sample is clamped by the
original FSR deringing rules. Sharpness is normalized from 0 to 1; the default
is `2^-0.2`. The adapter accepts any finite factor of at least 1. Host shells select their own
presets; Haneoka exposes native (1), quality (1.3), and balanced (1.5).

The Three adapter retains its low-resolution RGBA8 input and full-resolution
EASU target, quantizes after the host's final color transfer, and writes RCAS
to the requested native output attachment. The caller owns draw order and UI.

To regenerate the Flutter backend wrappers and bundle, run the existing kernel
build command with `--render-shaders /absolute/path/to/render-shaders` and the
official `--compiler /absolute/path/to/impellerc`. The canonical source SHA and
upstream commit are recorded in the generated source receipt. Ordinary kernel
builds use their released, pinned wrappers without fetching packages.

FSR-derived code is licensed under AMD's MIT license in
`LICENSE-FidelityFX-FSR.txt`. The optional adapter and wrappers use the same MIT
license. Algorithm source: https://github.com/GPUOpen-Effects/FidelityFX-FSR/tree/v1.0.2.
