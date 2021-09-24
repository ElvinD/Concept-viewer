/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedInterleavedBuffer,
  InterleavedBufferAttribute,
  LineSegments,
  Matrix4,
  Mesh,
  Sphere,
  Vector3,
  WireframeGeometry,
} from 'three'

const POSITIONS = [-1, 2, 0, 1, 2, 0, -1, 1, 0, 1, 1, 0, -1, 0, 0, 1, 0, 0, -1, -1, 0, 1, -1, 0]
const UVS = [-1, 2, 1, 2, -1, 1, 1, 1, -1, -1, 1, -1, -1, -2, 1, -2]
const INDEX = [0, 2, 1, 2, 3, 1, 2, 4, 3, 4, 5, 3, 4, 6, 5, 6, 7, 5]
const WORK_VEC3 = new Vector3()
const WORK_BOX3 = new Box3()
const NAN_ERROR =
  'THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.'

export class ThickLineSegmentsGeometry extends InstancedBufferGeometry {
  type = 'ThickLineSegmentsGeometry'

  constructor() {
    super()
    this.setIndex(INDEX)
    this.setAttribute('position', new Float32BufferAttribute(POSITIONS, 3))
    this.setAttribute('uv', new Float32BufferAttribute(UVS, 2))
  }

  public setColors(array: Float32Array | ArrayLike<number>): this {
    const colors = array instanceof Float32Array ? array : new Float32Array(array)
    const instanceColorBuffer = new InstancedInterleavedBuffer(colors, 6, 1) // rgb, rgb

    this.setAttribute('aInstanceColorStart', new InterleavedBufferAttribute(instanceColorBuffer, 3, 0)) // rgb
    this.setAttribute('aInstanceColorEnd', new InterleavedBufferAttribute(instanceColorBuffer, 3, 3)) // rgb

    return this
  }

  public setPositions(array: Float32Array | ArrayLike<number>): this {
    const lineSegments = array instanceof Float32Array ? array : new Float32Array(array)
    const instanceBuffer = new InstancedInterleavedBuffer(lineSegments, 6, 1) // xyz, xyz
    const segCount = array.length / 3
    const segmentIndexBuffer = new Float32Array(segCount)
    for (let i = 0; i < segCount; ) segmentIndexBuffer[i] = i++

    this.setAttribute('aInstanceStart', new InterleavedBufferAttribute(instanceBuffer, 3, 0)) // xyz
    this.setAttribute('aInstanceEnd', new InterleavedBufferAttribute(instanceBuffer, 3, 3)) // xyz
    this.setAttribute('aInstanceSegmentIndex', new InstancedBufferAttribute(segmentIndexBuffer, 1))

    this.computeBoundingBox()
    this.computeBoundingSphere()

    return this
  }

  public applyMatrix(matrix: Matrix4): this {
    return this.applyMatrix4(matrix)
  }
  public applyMatrix4(matrix: Matrix4): this {
    const start = this.attributes.instanceStart
    const end = this.attributes.instanceEnd

    if (start !== undefined) {
      start.applyMatrix4(matrix)
      end.applyMatrix4(matrix)
      start.needsUpdate = true
    }

    if (this.boundingBox !== null) this.computeBoundingBox()
    if (this.boundingSphere !== null) this.computeBoundingSphere()

    return this
  }
  public computeBoundingSphere(): void {
    if (this.boundingSphere === null) this.boundingSphere = new Sphere()
    if (this.boundingBox === null) this.computeBoundingBox()

    const start = this.attributes.instanceStart
    const end = this.attributes.instanceEnd

    if (start !== undefined && end !== undefined) {
      const { center } = this.boundingSphere

      this.boundingBox!.getCenter(center)

      let maxRadiusSq = 0

      for (let i = 0, il = start.count; i < il; i++) {
        WORK_VEC3.fromBufferAttribute(start, i)
        maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(WORK_VEC3))

        WORK_VEC3.fromBufferAttribute(end, i)
        maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(WORK_VEC3))
      }

      this.boundingSphere.radius = Math.sqrt(maxRadiusSq)

      if (isNaN(this.boundingSphere.radius)) console.error(NAN_ERROR, this)
    }
  }
  public computeBoundingBox(): void {
    if (this.boundingBox === null) this.boundingBox = new Box3()

    const start = this.attributes.instanceStart as BufferAttribute
    const end = this.attributes.instanceEnd as BufferAttribute

    if (start !== undefined && end !== undefined) {
      this.boundingBox.setFromBufferAttribute(start)
      WORK_BOX3.setFromBufferAttribute(end)
      this.boundingBox.union(WORK_BOX3)
    }
  }

  public fromWireframeGeometry(geometry: BufferGeometry): this {
    this.setPositions(geometry.attributes.position.array)
    return this
  }
  public fromEdgesGeometry(geometry: BufferGeometry): this {
    return this.fromWireframeGeometry(geometry)
  }
  public fromMesh(mesh: Mesh): this {
    this.fromWireframeGeometry(new WireframeGeometry(mesh.geometry))
    return this
  }
  public fromLineSegments(lineSegments: LineSegments): this {
    return this.fromWireframeGeometry(lineSegments.geometry)
  }
}
