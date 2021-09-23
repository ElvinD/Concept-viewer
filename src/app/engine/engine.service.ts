import { ElementRef, Injectable, NgZone, OnDestroy } from '@angular/core';
import TWEEN from '@tweenjs/tween.js';
import * as THREE from 'three';
import { Font } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { DynamicDatabase } from '../conceptlist/conceptlist.component';
import { CustomInteractionEvent, InteractionEventTypes, InteractionService } from '../services/interaction.service';
import { ConnectedEdge } from './models';

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
  private _orangeBasicMaterial = new THREE.MeshBasicMaterial({ color: 0xf58220 });
  private _whiteBasicMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  private _nodeMaterial: THREE.Material = new THREE.MeshPhongMaterial({ color: 0xf58220 });
  // private boxDebugger = new THREE.BoxHelper(new THREE.Mesh(new THREE.SphereGeometry(0.1), this._nodeMaterial), 0xffff00);
  private _centerTargetBox = this.createTargetBox();
  private _cameraTargetBox = this.createTargetBox(0xff0000, 0.05);
  private _cameraDeltaPos = new THREE.Vector3();
  private _selectedNodes: string[] = [];

  public scene!: THREE.Scene;
  public rootMesh!: THREE.Mesh;
  public baseMeshes!: THREE.Mesh[];
  public allMeshes!: THREE.Mesh[];
  public meshMap = new Map<string, THREE.Mesh[]>();
  public edges!: ConnectedEdge[];
  public labels!: THREE.Mesh[];

  constructor(private _ngZone: NgZone, private database: DynamicDatabase, private interactionService: InteractionService) { }

  public createScene(canvas: ElementRef<HTMLCanvasElement>, hostElement: ElementRef<HTMLDivElement>): void {
    this._hostElement = hostElement;
    this._canvas = canvas.nativeElement;
    this._canvas.width = hostElement.nativeElement.offsetWidth;
    this._canvas.height = hostElement.nativeElement.offsetHeight;

    this._renderer = new THREE.WebGLRenderer({
      canvas: this._canvas,
      alpha: false,    // transparent background
      
      antialias: true // smooth edges
    });
    // this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this._renderer.setSize(this._canvas.clientWidth, this._canvas.clientHeight);
    this._renderer.setPixelRatio(window.devicePixelRatio);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);
    this.scene.fog = new THREE.FogExp2(0xffffff, 0.4);

    this._camera = new THREE.PerspectiveCamera(
      50, this._canvas.width / this._canvas.height, 0.1, 500);
    this._camera.position.set(0, 0, 2);
    this.scene.add(this._camera);
    // this.scene.add(this.boxDebugger);
    this.scene.add(this._centerTargetBox);
    this._centerTargetBox.add(new THREE.AxesHelper(0.5));
    this._cameraTargetBox.add(new THREE.AxesHelper(0.5));
    this._cameraTargetBox.position.set(0, 0, -1 );
    // this._cameraTargetBox.lookAt(this._centerTargetBox.position);
    this._centerTargetBox.add(this._cameraTargetBox);
    this._controls = new OrbitControls(this._camera, this._renderer.domElement);
    this._controls.target = this._centerTargetBox.position;
    window["renderengine"] = this;
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
      mesh.clear();
    });
    this.edges?.map(edge => {
      if (edge.line) {
        this.scene.remove(edge.line);
        edge.line.geometry.dispose();
      }
    });
    this.baseMeshes = [];
    this.edges = [];
    this.labels = [];
    this.meshMap = new Map<string, THREE.Mesh[]>();
    this._selectedNodes = [];
    this._renderer.renderLists.dispose();
  }


  initRootMesh(name: string): THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]> {
    this.rootMesh = this.createMesh(name);
    this.scene.add(this.rootMesh);
    return this.rootMesh;
  }

  transform(objects: THREE.Object3D[], shape: string = "sphere", duration: number = 400) {
    TWEEN.removeAll();
    for (let i = 0; i < objects.length; i++) {
      const object = objects[i];
      const targetVector: THREE.Vector3 = object.userData[shape];
      object.userData["pos"] = targetVector;
      if (targetVector) {
        new TWEEN.Tween(object.position)
          .to({ x: targetVector.x, y: targetVector.y, z: targetVector.z }, Math.random() * duration + duration)
          .easing(TWEEN.Easing.Exponential.InOut)
          .start();

        const label = object.getObjectByName("label-" + object.name) as THREE.Mesh;
        // console.log(object.children)
        if (label) {
          const mat = label.material as THREE.Material;
          mat.opacity = 0;
          new TWEEN.Tween(label.material)
            .to({ opacity: 1 }, duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();
        } else {
          // console.log("not found label from", object.name);
        }
      }

      new TWEEN.Tween(this)
        .to({}, duration * 2)
        .onUpdate(this._onUpdate)
        .start();
    }
  }

  private _storePosition(param: any) {
    console.log("store pos:", param);
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


  get cameraDeltaPos(): THREE.Vector3 {
    return this._camera.position;
  }

  set cameraDeltaPos(val: THREE.Vector3) {
    this._camera.position.set(val.x, val.y, val.z);
    this._camera.lookAt(this._centerTargetBox.position);
    this._cameraDeltaPos = val;
  };

  clicked(event: MouseEvent) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(event.offsetX, event.offsetY);
    mouse.x = (event.offsetX / this._canvas.clientWidth) * 2 - 1;
    mouse.y = - (event.offsetY / this._canvas.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, this._camera);
    const intersects = raycaster.intersectObjects(this.scene.children);
    if (intersects.length) {
      // console.log ("got some intersects", intersects);
      for (let i = 0; i < intersects.length; i++) {
        const object = intersects[i];
        if (object.object instanceof THREE.Mesh && object.object.name !== this.rootMesh.name && object.object.name != "debugger") {
          this.selectNode(object.object.name);
        }
      }
    } else {
      // this.collapseSelections();
    }
  }

  public collapseSelections() {
    let newPos = new THREE.Vector3();
    if (this._selectedNodes.length == 1) {
      const nodeId = this._selectedNodes.pop();
      if (nodeId) {
        const node = this.scene.getObjectByName(nodeId);
        if (node) {
          newPos = node.userData["pos"];
          // console.log("reset to:", this.meshMap)
          let nodes: THREE.Object3D[] = [node];
          if (this.meshMap.has(nodeId)) {
            const childnodes = this.meshMap.get(nodeId);
            if (childnodes) {
              nodes = nodes.concat(childnodes);
              // console.log("return these nodes:", nodes);
            };
          };
          nodes.forEach(node => {
            new TWEEN.Tween(node.position)
              .to(newPos, 200)
              .onComplete((event) => {
                console.log("done returning to normal", nodeId);
                const childnodes = this.meshMap.get(nodeId);
                if (childnodes) {
                  childnodes.forEach(node => {
                    node.clear();
                    node.geometry.dispose();
                    this.scene.remove(node);
                  });
                  this.meshMap.delete(nodeId);
                  const len = this.edges.length;
                  for (let i = len - 1; i >= 0; i--) {
                    const edge = this.edges[i];
                    if (this.cleanupEdge(edge)) {
                      this.edges.splice(i, 1);
                      if (edge.line)
                        this.scene.remove(edge.line);
                    }
                  }
                }
              })
              .start();
          });
          const newCameraPos = new THREE.Vector3();
          new TWEEN.Tween(this._centerTargetBox.position)
            .to(newCameraPos, 200)
            .onUpdate(() => {
              this._onUpdate(this);
            })
            .start();
        }
      }
    }
  }

  public cleanupEdge(edge: ConnectedEdge): boolean {
    if (edge.subject && (this.scene.getObjectByName(edge.subject.name) == undefined)) {
      // console.log("no longer connected subject, you can remove me", edge.subject.name);
      return true;
    }
    if (edge.object && (this.scene.getObjectByName(edge.object.name) == undefined)) {
      // console.log("no longer connected object, you can remove me", edge.object.name);
      return true;
    }
    return false;
  }

  public getLevel(id:string):number {
    let level = 1;
    let key = this.getKeyFromMap(id);
    do {
      level ++;
      key = this.getKeyFromMap(key);
      // console.log("found key: ", key);
    } while (key !== "");
    // console.log("item found at level", level);
    return level;
  }

  private getKeyFromMap(id:string):string {
    for (const [key, value] of this.meshMap.entries()) {
       if (value.find (mesh => mesh.name == id) ) {
        return key;
      }
    }
    return "";
  }

  public selectNode(id: string) {
    let newPos = new THREE.Vector3();

    // node from different branch selected while one still open
    if (this._selectedNodes.length && this._selectedNodes.indexOf(id) == -1) {
      //clear up old selection
      const previousSelectedNodeId = this._selectedNodes.pop();
      if (previousSelectedNodeId) {
        const previousSelectedNode = this.scene.getObjectByName(previousSelectedNodeId);
        if (previousSelectedNode) {
          newPos = previousSelectedNode.userData["pos"];
          new TWEEN.Tween(previousSelectedNode.position)
            .to(newPos, 200)
            .easing(TWEEN.Easing.Sinusoidal.Out)
            .start();
        }
      }
    } else if (this._selectedNodes.indexOf(id) != -1) {
      //already selected
      // console.log("already selected, collapsing", id);
      this.collapseSelections();
      return;
    }
    const node = this.scene.getObjectByName(id);
    
    if (this._selectedNodes.indexOf(id) == -1) {
      // console.log("selecting node: ", id);
      this._selectedNodes.push(id);
    } else {
      console.log("already selected, doing nothing:", id);
      return;
    }
    newPos = new THREE.Vector3();
    if (node) {
      newPos = new THREE.Vector3(node.position.x, node.position.y, node.position.z);
      const ray: THREE.Ray = new THREE.Ray(newPos, node.position);
      ray.at(2 / this.getLevel(id), newPos);
      // newPos.normalize();
      new TWEEN.Tween(node.position)
        .to(newPos, 400)
        .easing(TWEEN.Easing.Sinusoidal.InOut)
        .onUpdate(() => {
          this._onUpdate(this);
        })
        .onComplete(() => {
         
        })
        .start();
        new TWEEN.Tween(this._centerTargetBox.position)
        .to(newPos, 400)
        .easing(TWEEN.Easing.Sinusoidal.InOut)
        .onComplete(() => {
          this._centerTargetBox.lookAt(new THREE.Vector3());
          this._centerTargetBox.rotateY(0.1);
          this.scene.updateMatrixWorld();
          let newPosCam = new THREE.Vector3();
          this._cameraTargetBox.localToWorld(newPosCam);
          this.panCamera(newPosCam, node.name);
         })
        .start();

      // this.panCamera(this._cameraTargetBox.position);
    }
  }

  public panCamera(target: THREE.Vector3, nodeId:string) {
    this._controls.enabled = false;
    new TWEEN.Tween(this._camera.position)
      .to(target, 400)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .onUpdate(() => {
        // this._camera.lookAt(this.rootMesh.position);
      })
      .onComplete(() => {
        this._controls.enabled = true;
        this._ngZone.run(() => {
          this.interactionService.emitEvent(new CustomInteractionEvent(InteractionEventTypes.EXPLORER_SELECT, {}, nodeId));
        });
      })
      .start();
  }


  public unFocusNode(id: string) {
    // const node = this.scene.getObjectByName(id);
    // if (node) {
    //   node.scale.set(1, 1, 1);
    // };
  }

  public focusOnNode(id: string, override: boolean = false) {
    if (this._selectedNodes.length > 0 && !override) {
      return;
    }
    const node = this.scene.getObjectByName(id);
    TWEEN.removeAll();
    if (node) {
      this._centerTargetBox.lookAt(node.position);
      // let camDistance = this._camera.position.distanceTo(this.centerTargetBox.position);
      let camDistance = 2;
      this._cameraTargetBox.position.set(0, 0, camDistance);
      const targetPos: THREE.Vector3 = new THREE.Vector3();
      this._cameraTargetBox.getWorldPosition(targetPos);
      new TWEEN.Tween(this.cameraDeltaPos)
        .to(targetPos, 400)
        .onStart((event) => {
          this._onCameraTweenStart(event)
        })
        .onComplete((event) => {
          this._onCameraTweenComplete(event)
        })
        .onUpdate((event) => {
          this._onCameraTween(event);
        })
        .start();
    };
  }
  private _onCameraTweenStart(delta: THREE.Vector3) {
    this._controls.enabled = false;
  }

  private _onCameraTweenComplete(delta: THREE.Vector3) {
    this._controls.enabled = true;
  }
  private _onCameraTween(delta: THREE.Vector3): void {
    this.cameraDeltaPos = delta;
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
    // this.update2dIcons();
    TWEEN.update();
    this._renderer.render(this.scene, this._camera);
  }

  private updateLabels() {
    this.labels?.forEach(label => {
      label.quaternion.copy(this._camera.quaternion);
    })
  }

  private update2dIcons() {
    this.baseMeshes?.forEach(mesh => {
      mesh.quaternion.copy(this._camera.quaternion);
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

  private async loadFont(objects: THREE.Object3D[]): Promise<THREE.Font> {
    if (!this._fontLoader) {
      this._fontLoader = new THREE.FontLoader();
    }
    if (!this._labelFont) {
      return this._fontLoader.loadAsync('assets/fonts/helvetiker_regular.typeface.json');
    } else {
      return Promise.resolve( this._labelFont);
    }
    // this._fontLoader.load('assets/fonts/helvetiker_regular.typeface.json', (font: Font) => {
    //   this._labelFont = font;
    //   this.createLabels(objects);
    // });
  }

  toggleLabels() {

  }

  async createLabels(objects: THREE.Object3D[]): Promise<void> {
    const font = await this.loadFont(objects).then(font => {
      this._labelFont = font;
      // if (!this._labelFont) {
      //   this.loadFont(objects);
      //   return;
      // }
      objects.map(mesh => {
        const nodeData = this.database.getNode(mesh.name);
        if (nodeData) {
          const textShape = this._labelFont.generateShapes(nodeData.label, 0.03);
          const geometry = new THREE.ShapeGeometry(textShape);
          geometry.computeBoundingBox();
          if (geometry.boundingBox) {
            const xMid = - 0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
            geometry.translate(xMid, 0.05, 0);
            const text = new THREE.Mesh(geometry, this.createTextMaterial());
            text.name = "label-" + mesh.name;
            text.position.z = 0;
            mesh.add(text);
            text.material.opacity = 0;
            this.labels.push(text);
          }
        }
      });
      return this.labels;
    });
  }

  private createTextMaterial() {
    return new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
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

  animateHelix(objects: THREE.Object3D[]): void {
    this.transform(objects, "helix");
  }

  animateSphere(objects: THREE.Object3D[]): void {
    this.transform(objects, "sphere");
  }

  animateGrid(objects: THREE.Object3D[]): void {
    this.transform(objects, "grid");
  }

  animateTable(objects: THREE.Object3D[]): void {
    this.transform(objects, "table");
  }

  public makeHelix(objects: THREE.Mesh[]): void {
    const distance = objects.length;
    for (let i = 0, l = distance; i < l; i++) {
      const theta = i * 0.175 + Math.PI;
      const y = - (i * .05) + distance * 0.025;
      const mesh = objects[i];
      const centerVector = new THREE.Vector3(mesh.position.x, mesh.position.y, mesh.position.z);
      const targetVector = new THREE.Vector3();
      targetVector.setFromCylindricalCoords(1, theta, y);
      centerVector.x = centerVector.x + targetVector.x * .2;
      centerVector.y = centerVector.y + targetVector.y;
      centerVector.z = centerVector.z + targetVector.z * .2;
      // object.lookAt(vector);
      mesh.userData["helix"] = targetVector;
    }
  }

  public makeGrid(objects: THREE.Mesh[]): void {
    const distance = objects.length;
    for (let i = 0, l = distance; i < l; i++) {
      const mesh = objects[i];
      const centerVector = new THREE.Vector3(mesh.position.x, mesh.position.y, mesh.position.z);
      const targetVector = new THREE.Vector3();
      targetVector.x = centerVector.x + ((i % 5) * .5) - 1;
      targetVector.y = centerVector.y + (- (Math.floor(i / 5) % 5) * .5) + 1;
      targetVector.z = centerVector.z + (Math.floor(i / (distance * 0.25))) * 0.25;
      // console.log("z: " , targetVector.z , "x: ", targetVector.x);
      mesh.userData["grid"] = targetVector;
    }
  }

  public makeSphere(objects: THREE.Mesh[], multiply: number = 1): void {
    const distance = objects.length;
    for (let i = 0, l = distance; i < l; i++) {
      const phi = Math.acos(- 1 + (2 * i) / l);
      const theta = Math.sqrt(l * Math.PI) * phi;
      const mesh = objects[i];
      const centerVector = new THREE.Vector3(mesh.position.x, mesh.position.y, mesh.position.z);
      // console.log("centervector:", centerVector);
      const targetVector = new THREE.Vector3();
      targetVector.setFromSphericalCoords(0.8, phi, theta);
      targetVector.multiplyScalar(multiply);
      targetVector.add(centerVector);
      // console.log("targetvector: " , targetVector);
      mesh.userData["sphere"] = targetVector;
    }
  }

  private createTargetBox(color:number = 0x00ff00, size:number = 0.1): THREE.Object3D {
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshBasicMaterial({ color: color, wireframe: true });
    const cube = new THREE.Mesh(geometry, material);
    cube.name = "debugger";
    return cube;
  }

  createMesh(name: string, radius: number = 0.02): THREE.Mesh {
    // const geometry = new THREE.CircleGeometry(radius, 24);
    const geometry = new THREE.SphereGeometry(radius, 12, 12);
    // const edges = new THREE.EdgesGeometry( geometry );
    // const line = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: 0xffffff, linewidth:4 } ) );
    const mesh = new THREE.Mesh(geometry, this._orangeBasicMaterial);
    // line.renderOrder = 1;
    // mesh.add(line);
    mesh.name = name;
    return mesh;
    // return this.createDiscObject(name, this._whiteBasicMaterial, this._orangeBasicMaterial, radius);
  }

  createDiscObject(name: string, frontMaterial: THREE.Material, rearMaterial: THREE.Material, radius: number = 0.02): THREE.Object3D {
    const frontGeom = new THREE.CircleGeometry(radius, 16);
    const frontCircle = new THREE.Mesh(frontGeom, frontMaterial);
    const rearGeom = new THREE.CircleGeometry(radius + 0.01, 16);
    const rearCircle = new THREE.Mesh(rearGeom, rearMaterial);
    rearCircle.position.set(0, 0, 0.01);
    const group = new THREE.Group();
    group.add(frontCircle, rearCircle);
    return group;
  }

  createEdge(subject: THREE.Object3D, object: THREE.Object3D): ConnectedEdge {
    return new ConnectedEdge(subject, object, this._edgeMaterial);
  }
}
