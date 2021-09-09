import { ElementRef, Injectable, NgZone, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

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
  private _hostElement!: ElementRef<HTMLDivElement>;
  
  public scene!: THREE.Scene;
  public rootMesh!: THREE.Mesh;
  public childMeshes!: THREE.Mesh[];

  constructor(private _ngZone: NgZone) { }

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
    
    this._camera = new THREE.PerspectiveCamera(
      75,this._canvas.width / this._canvas.height, 0.1, 1000
      );
      this._camera.position.set(0,0,-2);
      this.scene.add(this._camera);
      
      this._controls = new OrbitControls (this._camera, this._renderer.domElement);
      this._controls.update();
    // soft white light
    this._light = new THREE.AmbientLight(0x404040);
    this._light.position.set(1,1,-30);
    // this._scene.add(this._light);

    const pointLight = new THREE.PointLight( 0xffffff, 1 );
    pointLight.position.set(-3, 3, 3);
		this._camera.add( pointLight );
  }
  
  initRootMesh(name:string) {
     this.rootMesh = this.createMesh(name);
     this.scene.add(this.rootMesh);
  }

  addChildMesh(mesh:THREE.Mesh) {
    this.childMeshes = this.childMeshes ? this.childMeshes : [];
    this.childMeshes.push(mesh);
  }

  makeCircle():void {
    
  }

  createMesh(name:string):THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.1, 10, 10);
    const material = new THREE.MeshPhongMaterial({color: 0xf58220});
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    return mesh;
  }

  public animate(): void {
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

  public render(): void {
    this._frameId = requestAnimationFrame(() => {
      this.render();
    });
    this._controls.update();
    // this.cube.rotation.x += 0.01;
    // this.cube.rotation.y += 0.01;
    this._renderer.render(this.scene, this._camera);
  }

  public resize(): void {
    const width = this._hostElement.nativeElement.offsetWidth;
    const height = this._hostElement.nativeElement.offsetHeight;

    // console.log(this.hostElement, width, height);
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
