/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Color, MaterialParameters, Shader, ShaderMaterial, UniformsLib, UniformsUtils, Vector2 } from 'three'
import vertexShader from '../../../../assets/glsl/thickLine.vert'
import fragmentShader from '../../../../assets/glsl/thickLine.frag'

const DEFAULT_UNIFORMS = UniformsUtils.merge([
  UniformsLib.common,
  UniformsLib.fog,
  {
    uLinewidth: { value: 1 },
    uResolution: { value: new Vector2(1, 1) },
    uDashScale: { value: 1 },
    uDashSize: { value: 1 },
    uDashOffset: { value: 0 },
    uGapSize: { value: 1 },
  },
])

interface IParameters extends MaterialParameters {
  color?: string | number | Color
  resolution?: Vector2
  linewidth?: number
  dashed?: boolean
}

export class ThickLineMaterial extends ShaderMaterial {
  private static readonly CustomChunks: Record<string, boolean> = {
    cLocalSpace: true,
    cViewSpace: true,
    cProjectedSpace: true,
    cVertexGlobal: true,
    cVertexStart: true,
    cVertexEnd: true,
    cColor: true,
    cFragmentGlobal: true,
    cFragmentStart: true,
    cFragmentEnd: true,
  }
  public static readonly CustomChunkNames: string[] = Object.keys(ThickLineMaterial.CustomChunks)

  public type = 'ThickLineMaterial'
  public dashed = false

  private _customChunks: Record<string, string> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _customUniforms: Record<string, { value: any }> = {}

  constructor(parameters: IParameters) {
    super({
      vertexShader,
      fragmentShader,
      uniforms: UniformsUtils.clone(DEFAULT_UNIFORMS),
      clipping: true,
    })

    this.setValues(parameters)

    this.onBeforeCompile = (shader: Shader) => {
      shader.uniforms = { ...shader.uniforms, ...this._customUniforms }
      shader.vertexShader = this._parseChunks(shader.vertexShader)
      shader.fragmentShader = this._parseChunks(shader.fragmentShader)
    }
  }

  get resolution(): Vector2 {
    return this.uniforms.uResolution.value
  }
  set resolution(value: Vector2) {
    this.uniforms.uResolution.value = value
  }

  //@ts-ignore
  get opacity(): number {
    return this.uniforms.opacity.value
  }
  set opacity(value: number) {
    if (this.uniforms) this.uniforms.opacity.value = value
  }

  get gapSize(): number {
    return this.uniforms.uGapSize.value
  }
  set gapSize(value: number) {
    this.uniforms.uGapSize.value = value
  }

  get dashOffset(): number {
    return this.uniforms.uDashOffset.value
  }
  set dashOffset(value: number) {
    this.uniforms.uDashOffset.value = value
  }

  get dashSize(): number {
    return this.uniforms.uDashSize.value
  }
  set dashSize(value: number) {
    this.uniforms.uDashSize.value = value
  }

  get dashScale(): number {
    return this.uniforms.uDashScale.value
  }
  set dashScale(value: number) {
    this.uniforms.uDashScale.value = value
  }

  //@ts-ignore
  get linewidth(): number {
    return this.uniforms.uLinewidth.value
  }
  set linewidth(value: number) {
    if (this.uniforms && this.uniforms.uLinewidth) this.uniforms.uLinewidth.value = value
  }

  get color(): Color {
    return this.uniforms.diffuse.value
  }
  set color(value: Color) {
    this.uniforms.diffuse.value = value
  }

  public setUniforms(uniforms: Record<string, { value: any }>): void {
    this._customUniforms = uniforms
    this.needsUpdate = true
  }
  public unsetUniforms(): void {
    this._customUniforms = {}
    this.needsUpdate = true
  }
  public setChunk(chunkName: string, chunk: string): void {
    if (!ThickLineMaterial.CustomChunks[chunkName]) return
    this._customChunks[chunkName] = chunk
    this.needsUpdate = true
  }
  public unsetChunk(chunkName: string): void {
    if (!ThickLineMaterial.CustomChunks[chunkName]) return
    delete this._customChunks[chunkName]
    this.needsUpdate = true
  }
  public clearChunks(): void {
    this._customChunks = {}
    this.needsUpdate = true
  }

  private _chunkReplacer = (_match: string, chunkName: string) => {
    return this._parseChunks(this._customChunks[chunkName] ?? '')
  }
  private _parseChunks(shader: string): string {
    const chunkPattern = /%- ([\w\d/]+) -%/gm
    return shader.replace(chunkPattern, this._chunkReplacer)
  }
}
