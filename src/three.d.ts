import type { WebGLRenderTarget, WebGLRenderer } from "three";
export interface SpatialConfiguration {
  readonly factor: number;
  readonly sharpness: number;
}
export declare function spatialConfiguration(
  value?: Partial<SpatialConfiguration>,
): SpatialConfiguration;
export declare function spatialInputSize(
  width: number,
  height: number,
  factor: number,
): { width: number; height: number };
export declare class SpatialUpscalerPass {
  constructor();
  readonly configuration: SpatialConfiguration;
  setConfiguration(value: Partial<SpatialConfiguration>): void;
  render(
    renderer: WebGLRenderer,
    source: WebGLRenderTarget,
    width: number,
    height: number,
    output?: WebGLRenderTarget | null,
  ): void;
  dispose(): void;
}
