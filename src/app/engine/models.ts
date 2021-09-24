import * as THREE from 'three';
import { ThickLine } from './plugins/thickline/ThickLine';
import { ThickLineGeometry } from './plugins/thickline/ThickLineGeometry';
import { ThickLineMaterial } from './plugins/thickline/ThickLineMaterial';

enum LineTypes  {
 THIN,
 FAT
}
export class ConnectedEdge {

  public line?: THREE.Line | ThickLine;
  public points?: THREE.Vector3[];
  private _lineType: LineTypes = LineTypes.FAT;

  constructor(public subject: THREE.Object3D, public object: THREE.Object3D, material: THREE.Material) {
    this.points = [];
    this.points.push(subject.position);
    this.points.push(object.position);
    this.line = this.createThickLine(this.points);
  }

  private createDefaultLine(points: THREE.Vector3[]): THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x58595b }));
    line.computeLineDistances();
    return line;
  }

  private createThickLine(points: THREE.Vector3[]): ThickLine {
    const positions = [];
    const point = new THREE.Vector3();
    for (let i = 0, l = points.length; i < l; i++) {
      point.copy(points[i]);
      positions.push(point.x, point.y, point.z)
    };
    const geometry = new ThickLineGeometry();
    geometry.setPositions(positions);
    const resolution = new THREE.Vector2(300, 600);
    const matLine = new ThickLineMaterial({
      color: 0x58595b,
      linewidth: 5, // in pixels
      // vertexColors: false,
      resolution,
      dashed: false,
    });
    const line = new ThickLine(geometry, matLine);
    line.computeLineDistances();
    line.scale.multiplyScalar(0.5);
    return line;

  };

  updatePosition() {
    this.points = [];
    this.points.push(this.subject.position);
    this.points.push(this.object.position);
    switch (this._lineType) {
      case LineTypes.THIN:
        this.line?.geometry.setFromPoints(this.points);
        break;

        case LineTypes.FAT:
          const positions = [];
          const point = new THREE.Vector3();
          for (let i = 0, l = this.points.length; i < l; i++) {
            point.copy(this.points[i]);
            positions.push(point.x, point.y, point.z)
          };
          const geom = <ThickLineGeometry>this.line?.geometry;
          geom?.setPositions(positions);
    }
  };
}