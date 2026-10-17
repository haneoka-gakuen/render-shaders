import { easuMath, rcasMath } from "./fsr1.js";
/** Backend-only wrappers. Keep released entrypoint names and reflection stable. */
export function flutterSpatialShaders() {
  const wrapper = (block, field, kernel, entry, result) => {
    const body = kernel
      .replace(`vec3 ${entry}(vec2 spatialUv)`, "void main()")
      .replaceAll("spatialUv", "uv")
      .replaceAll("SPATIAL_SAMPLE", "texture")
      .replaceAll(
        block === "EasuSettings"
          ? "spatialInputOutput"
          : "spatialSizeSharpness",
        `settings.${field}`,
      )
      .replace(`return ${result};`, `fragment=vec4(${result},1.0)*tint;`);
    return `// Generated from @haneoka/render-shaders FSR 1.0.2 (MIT).
// See LICENSE-FidelityFX-FSR.txt. All backends use the same FP32 tap footprint.
#version 450
layout(location=0) in vec2 uv;
layout(location=1) in vec4 tint;
layout(location=0) out vec4 fragment;
layout(set=0,binding=0) uniform sampler2D image;
layout(set=0,binding=1) uniform ${block} { vec4 ${field}; } settings;
${body.trimStart()}`;
  };
  return {
    "fsr_easu.frag": wrapper(
      "EasuSettings",
      "inputOutput",
      easuMath,
      "spatialEasu",
      "clamp(sum/weight,low,high)",
    ),
    "fsr_rcas.frag": wrapper(
      "RcasSettings",
      "sizeSharpness",
      rcasMath,
      "spatialRcas",
      "clamp(result,0.0,1.0)",
    ),
  };
}
