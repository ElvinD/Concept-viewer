import { BufferGeometry, Line } from 'three'
import { ThickLineSegmentsGeometry } from './ThickLineSegmentsGeometry'

export class ThickLineGeometry extends ThickLineSegmentsGeometry {
  type = 'ThickLineGeometry'
  public setPositions(array: ArrayLike<number>): this {
    const length = array.length - 3
    const points = new Float32Array(2 * length)

    for (let i = 0; i < length; i += 3) {
      points[2 * i] = array[i]
      points[2 * i + 1] = array[i + 1]
      points[2 * i + 2] = array[i + 2]

      points[2 * i + 3] = array[i + 3]
      points[2 * i + 4] = array[i + 4]
      points[2 * i + 5] = array[i + 5]
    }

    super.setPositions(points)

    return this
  }
  public setColors(array: ArrayLike<number>): this {
    const length = array.length - 3
    const colors = new Float32Array(2 * length)

    for (let i = 0; i < length; i += 3) {
      colors[2 * i] = array[i]
      colors[2 * i + 1] = array[i + 1]
      colors[2 * i + 2] = array[i + 2]

      colors[2 * i + 3] = array[i + 3]
      colors[2 * i + 4] = array[i + 4]
      colors[2 * i + 5] = array[i + 5]
    }

    super.setColors(colors)

    return this
  }
  public fromLine(line: Line): this {
    const geometry = line.geometry

    if (geometry instanceof BufferGeometry) this.setPositions(geometry.attributes.position.array)

    return this
  }
  public copy(): this {
    //
    return this
  }
}
