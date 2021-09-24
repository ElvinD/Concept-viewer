/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BufferAttribute,
  InstancedInterleavedBuffer,
  InterleavedBufferAttribute,
  Intersection,
  Line3,
  MathUtils,
  Matrix4,
  Mesh,
  Raycaster,
  Vector3,
  Vector4,
} from 'three'
import { ThickLineMaterial } from './ThickLineMaterial'
import { ThickLineSegmentsGeometry } from './ThickLineSegmentsGeometry'

const WORK_START3 = new Vector3()
const WORK_END3 = new Vector3()

const WORK_START4 = new Vector4()
const WORK_END4 = new Vector4()

const ssOrigin = new Vector4()
const ssOrigin3 = new Vector3()
const mvMatrix = new Matrix4()
const line = new Line3()
const closestPoint = new Vector3()

export interface IThickLineIntersects extends Intersection {
  pointOnLine: Vector3
  uv2: null
}
export class ThickLineSegments extends Mesh {
  type = 'ThickLineSegments'
  constructor(geometry: ThickLineSegmentsGeometry, material: ThickLineMaterial) {
    super(geometry, material)
  }

  public computeLineDistances(): this {
    const { geometry } = this

    const { aInstanceStart, aInstanceEnd } = geometry.attributes
    const count = (aInstanceStart as InterleavedBufferAttribute).data.count
    const lineDistances = new Float32Array(2 * count)

    for (let i = 0, j = 0, l = count; i < l; i++, j += 2) {
      WORK_START3.fromBufferAttribute(aInstanceStart as BufferAttribute, i)
      WORK_END3.fromBufferAttribute(aInstanceEnd as BufferAttribute, i)

      lineDistances[j] = j === 0 ? 0 : lineDistances[j - 1]
      lineDistances[j + 1] = lineDistances[j] + WORK_START3.distanceTo(WORK_END3)
    }

    const instanceDistanceBuffer = new InstancedInterleavedBuffer(lineDistances, 2, 1) // d0, d1

    geometry.setAttribute('aInstanceDistanceStart', new InterleavedBufferAttribute(instanceDistanceBuffer, 1, 0)) // d0
    geometry.setAttribute('aInstanceDistanceEnd', new InterleavedBufferAttribute(instanceDistanceBuffer, 1, 1)) // d1

    return this
  }

  public raycast(raycaster: Raycaster, intersects: IThickLineIntersects[]): void {
    if (raycaster.camera === null)
      console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2.')

    const threshold = raycaster.params.Line !== undefined ? raycaster.params.Line.threshold || 0 : 0

    const { ray, camera } = raycaster
    const { projectionMatrix } = camera

    const { geometry, material } = this
    const { resolution, linewidth } = material as ThickLineMaterial
    const lineWidth = linewidth + threshold

    const { aInstanceStart, aInstanceEnd } = geometry.attributes

    // camera forward is negative
    const near = -(camera as any).near

    // pick a point 1 unit out along the ray to avoid the ray origin
    // sitting at the camera origin which will cause "w" to be 0 when
    // applying the projection matrix.
    ray.at(1, ssOrigin as any)

    // ndc space [ - 1.0, 1.0 ]
    ssOrigin.w = 1
    ssOrigin.applyMatrix4(camera.matrixWorldInverse)
    ssOrigin.applyMatrix4(projectionMatrix)
    ssOrigin.multiplyScalar(1 / ssOrigin.w)

    // screen space
    ssOrigin.x *= resolution.x / 2
    ssOrigin.y *= resolution.y / 2
    ssOrigin.z = 0

    ssOrigin3.copy(ssOrigin as any)

    const matrixWorld = this.matrixWorld
    mvMatrix.multiplyMatrices(camera.matrixWorldInverse, matrixWorld)

    for (let i = 0, l = aInstanceStart.count; i < l; i++) {
      WORK_START4.fromBufferAttribute(aInstanceStart as BufferAttribute, i)
      WORK_END4.fromBufferAttribute(aInstanceEnd as BufferAttribute, i)

      WORK_START4.w = 1
      WORK_END4.w = 1

      // camera space
      WORK_START4.applyMatrix4(mvMatrix)
      WORK_END4.applyMatrix4(mvMatrix)

      // skip the segment if it's entirely behind the camera
      const isBehindCameraNear = WORK_START4.z > near && WORK_END4.z > near
      if (isBehindCameraNear) {
        continue
      }

      // trim the segment if it extends behind camera near
      if (WORK_START4.z > near) {
        const deltaDist = WORK_START4.z - WORK_END4.z
        const t = (WORK_START4.z - near) / deltaDist
        WORK_START4.lerp(WORK_END4, t)
      } else if (WORK_END4.z > near) {
        const deltaDist = WORK_END4.z - WORK_START4.z
        const t = (WORK_END4.z - near) / deltaDist
        WORK_END4.lerp(WORK_START4, t)
      }

      // clip space
      WORK_START4.applyMatrix4(projectionMatrix)
      WORK_END4.applyMatrix4(projectionMatrix)

      // ndc space [ - 1.0, 1.0 ]
      WORK_START4.multiplyScalar(1 / WORK_START4.w)
      WORK_END4.multiplyScalar(1 / WORK_END4.w)

      // screen space
      WORK_START4.x *= resolution.x / 2
      WORK_START4.y *= resolution.y / 2

      WORK_END4.x *= resolution.x / 2
      WORK_END4.y *= resolution.y / 2

      // create 2d segment
      line.start.copy(WORK_START4 as any)
      line.start.z = 0

      line.end.copy(WORK_END4 as any)
      line.end.z = 0

      // get closest point on ray to segment
      const param = line.closestPointToPointParameter(ssOrigin3, true)
      line.at(param, closestPoint)

      // check if the intersection point is within clip space
      const zPos = MathUtils.lerp(WORK_START4.z, WORK_END4.z, param)
      const isInClipSpace = zPos >= -1 && zPos <= 1

      const isInside = ssOrigin3.distanceTo(closestPoint) < lineWidth * 0.5

      if (isInClipSpace && isInside) {
        line.start.fromBufferAttribute(aInstanceStart, i)
        line.end.fromBufferAttribute(aInstanceEnd, i)

        line.start.applyMatrix4(matrixWorld)
        line.end.applyMatrix4(matrixWorld)

        const pointOnLine = new Vector3()
        const point = new Vector3()

        ray.distanceSqToSegment(line.start, line.end, point, pointOnLine)

        intersects.push({
          point,
          pointOnLine,
          distance: ray.origin.distanceTo(point),

          object: this,
          face: null,
          faceIndex: i,
          uv2: null,
        })
      }
    }
  }
}
