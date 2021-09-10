import * as THREE from 'three';

export class ConnectedEdge  {

  public line?: THREE.Line;
  public points?: THREE.Vector3[];

  constructor(public subject:THREE.Object3D, public object:THREE.Object3D, material:THREE.Material) {
    this.points = [];
    this.points.push(subject.position);
    this.points.push(object.position);
    const geometry = new THREE.BufferGeometry().setFromPoints(this.points);
    this.line = new THREE.Line (geometry, material);
    this.line.computeLineDistances();
  }

  updatePosition() {
    this.points = [];
    this.points.push(this.subject.position);
    this.points.push(this.object.position);
    this.line?.geometry.setFromPoints(this.points);
  }
}