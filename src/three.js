import {
  Mesh,
  Scene,
  OrthographicCamera,
  PlaneGeometry,
  ShaderMaterial,
  WebGLRenderTarget,
  UnsignedByteType,
  RGBAFormat,
  NoColorSpace,
  NoBlending,
  NearestFilter,
  Vector4,
} from "three";
import { easuMath, rcasMath } from "./fsr1.js";

const vertexShader = `varying vec2 vUv;
void main() { vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;
const copyFragment = `uniform sampler2D image; varying vec2 vUv;
void main() { gl_FragColor=vec4(clamp(texture2D(image,vUv).rgb,0.0,1.0),1.0); }`;
const easuFragment = `uniform sampler2D image; uniform vec4 spatialInputOutput;
varying vec2 vUv;\n#define SPATIAL_SAMPLE texture2D\n${easuMath}
void main() { gl_FragColor=vec4(spatialEasu(vUv),1.0); }`;
const rcasFragment = `uniform sampler2D image; uniform vec4 spatialSizeSharpness;
varying vec2 vUv;\n#define SPATIAL_SAMPLE texture2D\n${rcasMath}
void main() { gl_FragColor=vec4(spatialRcas(vUv),1.0); }`;
function target(name) {
  const value = new WebGLRenderTarget(1, 1, {
    type: UnsignedByteType,
    format: RGBAFormat,
    depthBuffer: false,
    stencilBuffer: false,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    generateMipmaps: false,
  });
  value.texture.name = name;
  // Values are already tone-mapped gamma RGB; no hardware sRGB conversion.
  value.texture.colorSpace = NoColorSpace;
  return value;
}
function material(fragmentShader, uniforms) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
    blending: NoBlending,
    transparent: false,
    toneMapped: false,
  });
}
export function spatialInputSize(width, height, factor) {
  if (
    ![width, height, factor].every(Number.isFinite) ||
    width < 1 ||
    height < 1 ||
    factor < 1
  )
    throw new TypeError("Invalid spatial upscaling extent");
  return {
    width: Math.max(1, Math.round(width / factor)),
    height: Math.max(1, Math.round(height / factor)),
  };
}
export function spatialConfiguration(value = {}) {
  const factor = value.factor ?? 1;
  const sharpness = value.sharpness ?? 0.8705505632961241;
  if (
    !Number.isFinite(factor) ||
    factor < 1 ||
    !Number.isFinite(sharpness) ||
    sharpness < 0 ||
    sharpness > 1
  )
    throw new TypeError("Invalid spatial upscaling configuration");
  return Object.freeze({ factor, sharpness });
}

/** Optional Three adapter. The host supplies an opaque, tone-mapped gamma world.
 * All text and controls are drawn by the host after this pass at native size.
 */
export class SpatialUpscalerPass {
  input = target("spatial:gamma-input");
  easu = target("spatial:easu");
  scene = new Scene();
  camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  geometry = new PlaneGeometry(2, 2);
  copy = material(copyFragment, { image: { value: null } });
  reconstruct = material(easuFragment, {
    image: { value: this.input.texture },
    spatialInputOutput: { value: new Vector4() },
  });
  sharpen = material(rcasFragment, {
    image: { value: this.easu.texture },
    spatialSizeSharpness: { value: new Vector4() },
  });
  mesh = new Mesh(this.geometry, this.copy);
  configuration = spatialConfiguration();
  constructor() {
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }
  setConfiguration(value) {
    this.configuration = spatialConfiguration(value);
  }
  /** source and output must be distinct. No per-frame GPU allocations. */
  render(renderer, source, width, height, output = null) {
    if (source === output || width < source.width || height < source.height)
      throw new TypeError("Invalid spatial source/output boundary");
    this.input.setSize(source.width, source.height);
    this.easu.setSize(width, height);
    this.reconstruct.uniforms.spatialInputOutput.value.set(
      source.width,
      source.height,
      width,
      height,
    );
    this.sharpen.uniforms.spatialSizeSharpness.value.set(
      width,
      height,
      this.configuration.sharpness,
      0,
    );
    const previous = renderer.getRenderTarget(),
      autoClear = renderer.autoClear;
    const scissorTest = renderer.getScissorTest();
    renderer.autoClear = false;
    renderer.setScissorTest(false);
    const draw = (shader, destination) => {
      this.mesh.material = shader;
      renderer.setRenderTarget(destination);
      renderer.render(this.scene, this.camera);
    };
    try {
      this.copy.uniforms.image.value = source.texture;
      draw(this.copy, this.input);
      draw(this.reconstruct, this.easu);
      draw(this.sharpen, output);
    } finally {
      renderer.setRenderTarget(previous);
      renderer.setScissorTest(scissorTest);
      renderer.autoClear = autoClear;
    }
  }
  dispose() {
    this.input.dispose();
    this.easu.dispose();
    this.copy.dispose();
    this.reconstruct.dispose();
    this.sharpen.dispose();
    this.geometry.dispose();
    this.scene.clear();
  }
}
