import { ElementRef, Injectable, NgZone, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import TWEEN from '@tweenjs/tween.js';
import { ConnectedEdge } from './models';
import { Font } from 'three';
import { DynamicDatabase } from '../conceptlist/conceptlist.component';

@Injectable({
  providedIn: 'root'
})
export class EngineService implements OnDestroy {
  private _canvas!: HTMLCanvasElement;
  private _renderer!: THREE.WebGLRenderer;
  private _camera!: THREE.PerspectiveCamera;
  private _light!: THREE.AmbientLight;
  private _controls!: OrbitControls;
  private _frameId: number = -1;
  private _labelFont!: Font;
  private _fontLoader!: THREE.FontLoader;
  private _hostElement!: ElementRef<HTMLDivElement>;
  private _edgeMaterial: THREE.Material = new THREE.LineDashedMaterial({ color: 0x58595b, dashSize: 1, gapSize: 5 });
  private _textMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });
  private _nodeMaterial: THREE.Material = new THREE.MeshPhongMaterial({ color: 0xf58220 });
  // private _nodeMaterial: THREE.Material = new THREE.MeshBasicMaterial({ color: 0x808080, wireframe: true });
  private _targets: { table: THREE.Object3D[]; sphere: THREE.Object3D[]; helix: THREE.Object3D[]; grid: THREE.Object3D[]; } = {
    sphere: [], helix: [], grid: [], table: []
  };
  // private boxDebugger = new THREE.BoxHelper(new THREE.Mesh(new THREE.SphereGeometry(0.1), this._nodeMaterial), 0xffff00);
  private _cameraIsAnimating = false;
  private centerTargetBox = this.createTargetBox();
  private cameraTargetBox = this.createTargetBox();
  private _cameraDeltaPos = new THREE.Vector3();
  public scene!: THREE.Scene;
  public rootMesh!: THREE.Mesh;
  public baseMeshes!: THREE.Mesh[];
  public expandedMeshes!: THREE.Mesh[];
  public edges!: ConnectedEdge[];
  public labels!: THREE.Mesh[];


  constructor(private _ngZone: NgZone, private database: DynamicDatabase,) { }

  public createScene(canvas: ElementRef<HTMLCanvasElement>, hostElement: ElementRef<HTMLDivElement>): void {
    // The first step is to get the reference of the canvas element from our HTML document
    this._hostElement = hostElement;
    this._canvas = canvas.nativeElement;
    // console.log("INIT", hostElement, hostElement.nativeElement.offsetWidth, hostElement.nativeElement.offsetHeight);
    this._canvas.width = hostElement.nativeElement.offsetWidth;
    this._canvas.height = hostElement.nativeElement.offsetHeight;

    this._renderer = new THREE.WebGLRenderer({
      canvas: this._canvas,
      alpha: true,    // transparent background
      antialias: true // smooth edges
    });
    // this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this._renderer.setSize(this._canvas.clientWidth, this._canvas.clientHeight);
    // create the scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xffffff, 0.4);

    this._camera = new THREE.PerspectiveCamera(
      50, this._canvas.width / this._canvas.height, 0.1, 500);
    this._camera.position.set(0, 0, 2);
    this.scene.add(this._camera);
    // this.scene.add(this.boxDebugger);
    // this.scene.add(this.centerTargetBox);
    this.centerTargetBox.add(this.cameraTargetBox);

    this._controls = new OrbitControls(this._camera, this._renderer.domElement);
    this._controls.update();
    this._controls.addEventListener('change', (event) => {
      this.renderOnDemand();
    });
    // soft white light
    this._light = new THREE.AmbientLight(0x404040);
    this._light.position.set(1, 1, -30);
    this.scene.add(this._light);
    // 
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(0, 0, 16);
    this._camera.add(pointLight);
  }

  reset() {
    if (this.rootMesh) {
      this.scene.remove(this.rootMesh);
      this.rootMesh.geometry.dispose();
    }
    this.baseMeshes?.map(mesh => {
      mesh.children.map(meshChild => {
        mesh.remove(meshChild);
        (meshChild as THREE.Mesh).geometry.dispose();
      });
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    });
    this.edges?.map(edge => {
      if (edge.line) {
        this.scene.remove(edge.line);
        edge.line.geometry.dispose();
      }
    });
    this.baseMeshes = [];
    this.edges = [];
    this._targets = { sphere: [], helix: [], grid: [], table: [] };
    this.labels = [];
  }


  initRootMesh(name: string): THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]> {
    this.rootMesh = this.createMesh(name);
    this.scene.add(this.rootMesh);
    return this.rootMesh;
  }

  private loadFont() {
    this._fontLoader = new THREE.FontLoader();
    this._fontLoader.load('assets/fonts/helvetiker_regular.typeface.json', (font: Font) => {
      this._labelFont = font;
      this.createLabels();
    });

  }

  createLabels() {
    if (!this._labelFont) {
      this.loadFont();
      return;
    }
    this.baseMeshes?.map(mesh => {
      const nodeData = this.database.getNode(mesh.name);
      if (nodeData) {
        const textShape = this._labelFont.generateShapes(nodeData.label, 0.04);
        const geometry = new THREE.ShapeGeometry(textShape);
        geometry.computeBoundingBox();
        if (geometry.boundingBox) {
          const xMid = - 0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
          geometry.translate(xMid, 0.05, 0);
          const text = new THREE.Mesh(geometry, this._textMaterial);
          text.position.z = 0;
          mesh.add(text);
          this.labels.push(text);
        }
      }
    })
  }

  addChildMesh(mesh: THREE.Mesh) {
    this.baseMeshes = this.baseMeshes ? this.baseMeshes : [];
    this.baseMeshes.push(mesh);
    this.scene.add(mesh);
  }

  addEdge(edge: ConnectedEdge) {
    this.edges = this.edges ? this.edges : [];
    this.edges.push(edge);
    if (edge.line) {
      // console.log("adding edge: ", edge);
      this.scene.add(edge.line);
    }
  }

  animateHelix(): void {
    this.transform(this.baseMeshes, this._targets.helix);
  }

  animateSphere(): void {
    this.transform(this.baseMeshes, this._targets.sphere);
  }

  animateGrid(): void {
    this.transform(this.baseMeshes, this._targets.grid);
  }

  animateTable(): void {
    this.transform(this.baseMeshes, this._targets.table);
  }

  public makeHelix(): void {
    const vector = new THREE.Vector3();
    const distance = this.baseMeshes.length;
    for (let i = 0, l = distance; i < l; i++) {
      const theta = i * 0.175 + Math.PI;
      const y = - (i * .05) + distance * 0.025;
      // const object = this.childMeshes[i];
      const object = new THREE.Object3D();
      object.position.setFromCylindricalCoords(1, theta, y);
      vector.x = object.position.x * .2;
      vector.y = object.position.y;
      vector.z = object.position.z * .2;
      object.lookAt(vector);
      this._targets.helix.push(object);
    }
  }

  public makeGrid(): void {
    const distance = this.baseMeshes.length;
    for (let i = 0, l = distance; i < l; i++) {
      const object = new THREE.Object3D();
      object.position.x = ((i % 5) * .5) - 1;
      object.position.y = (- (Math.floor(i / 5) % 5) * .5) + 1;
      object.position.z = (Math.floor(i / 25)) * 0.5;
      this._targets.grid.push(object);
    }
  }

  public makeSphere(): void {
    const vector = new THREE.Vector3();
    const distance = this.baseMeshes.length;
    for (let i = 0, l = distance; i < l; i++) {
      const phi = Math.acos(- 1 + (2 * i) / l);
      const theta = Math.sqrt(l * Math.PI) * phi;
      const object = new THREE.Object3D();
      // const object = this.childMeshes[i];
      object.position.setFromSphericalCoords(0.8, phi, theta);
      vector.copy(object.position).multiplyScalar(1);
      object.lookAt(vector);
      this._targets.sphere.push(object);
    }
  }

  private createTargetBox(): THREE.Object3D {
    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    return cube;
  }

  createMesh(name: string, radius: number = 0.02): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(radius, 6, 6);
    const mesh = new THREE.Mesh(geometry, this._nodeMaterial);
    mesh.name = name;
    return mesh;
  }

  createEdge(subject: THREE.Object3D, object: THREE.Object3D): ConnectedEdge {
    return new ConnectedEdge(subject, object, this._edgeMaterial);
  }

  transform(objects: THREE.Object3D[], targets: THREE.Object3D[], duration: number = 400) {
    TWEEN.removeAll();
    for (let i = 0; i < objects.length; i++) {
      const object = objects[i];
      const target = targets[i];
      // }
      new TWEEN.Tween(object.position)
        .to({ x: target.position.x, y: target.position.y, z: target.position.z }, Math.random() * duration + duration)
        .easing(TWEEN.Easing.Exponential.InOut)
        // .onUpdate(this._onUpdate)
        .start();
    }

    new TWEEN.Tween(this)
      .to({}, duration * 2)
      .onUpdate(this._onUpdate)
      .start();
  }

  private _onUpdate(engine: EngineService): void {
    engine.edges?.forEach(edge => {
      edge.updatePosition();
    })
    // engine.labels?.forEach(label => {
    //   label.quaternion.copy(engine._camera.quaternion);
    // })
  }

  public startFrameRendering(): void {
    // We have to run this outside angular zones,
    // because it could trigger heavy changeDetection cycles.
    this._ngZone.runOutsideAngular(() => {
      if (document.readyState !== 'loading') {
        this.render();
      } else {
        window.addEventListener('DOMContentLoaded', () => {
          this.render();
        });
      }

      window.addEventListener('resize', () => {
        // this.resize();
      });
    });
  }

  public selectNode(id:string) {

  }

  get cameraDeltaPos(): THREE.Vector3 {
    return this._camera.position;
  }

  set cameraDeltaPos(val: THREE.Vector3) {
    this._camera.position.set(val.x, val.y, val.z);
    this._camera.lookAt(this.centerTargetBox.position);
    this._cameraDeltaPos = val;
  };

  public focusOnNode(id: string) {
    const node = this.scene.getObjectByName(id);
    if (this._cameraIsAnimating) {
      return;
    }
    if (node) {
      this.centerTargetBox.lookAt(node.position);
      let camDistance = this._camera.position.distanceTo(this.centerTargetBox.position);
      if (camDistance < 1.5) camDistance = 1.5;
      this.cameraTargetBox.position.set(0, 0, camDistance);
      const targetPos: THREE.Vector3 = new THREE.Vector3();
      this.cameraTargetBox.getWorldPosition(targetPos);
      new TWEEN.Tween(this.cameraDeltaPos)
        .to(targetPos , 400)
        .onStart((event)=> {
          this._onCameraTweenStart(event)
        })
        .onComplete((event)=> {
          this._onCameraTweenComplete(event)
        })
        .onUpdate((event)=> {
          this._onCameraTween (event);
        })
        .start();
    };
  }
  private _onCameraTweenStart(delta:THREE.Vector3) {
    this._controls.enabled = false;
    this._cameraIsAnimating = true;
  }

  private _onCameraTweenComplete(delta:THREE.Vector3) {
    this._controls.enabled = true;
    this._cameraIsAnimating = false;
  }
  private _onCameraTween(delta:THREE.Vector3): void {
    this.cameraDeltaPos = delta;
  }

  public unFocusNode(id: string) {
    // const node = this.scene.getObjectByName(id);
    // if (node) {
    //   node.scale.set(1, 1, 1);
    // };
  }

  public renderOnDemand(): void {
    // this._controls.update();
    this._renderer.render(this.scene, this._camera);
  }

  private render(): void {
    this._frameId = requestAnimationFrame(() => {
      this.render();
    });
    this._controls.update();
    this.updateLabels();
    TWEEN.update();
    this._renderer.render(this.scene, this._camera);
  }

  private updateLabels() {
    this.labels?.forEach(label => {
      label.quaternion.copy(this._camera.quaternion);
    })
  }

  public resize(): void {
    const width = this._hostElement.nativeElement.offsetWidth;
    const height = this._hostElement.nativeElement.offsetHeight;

    this._renderer.setSize(width, height);
    this._camera.aspect = this._canvas.clientWidth / this._canvas.clientHeight;
    this._camera.updateProjectionMatrix();
  }

  ngOnDestroy(): void {
    if (this._frameId != -1) {
      cancelAnimationFrame(this._frameId);
      this._frameId = -1;
    }
  }
}
