import { ElementRef, Injectable, NgZone, OnDestroy } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root'
})
export class EngineService implements OnDestroy {
  private canvas!: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private light!: THREE.AmbientLight;

  private cube!: THREE.Mesh;

  private frameId: number = -1;
  private hostElement!: ElementRef<HTMLDivElement>;

  constructor(private ngZone: NgZone) { }

  public createScene(canvas: ElementRef<HTMLCanvasElement>, hostElement: ElementRef<HTMLDivElement>): void {
    // The first step is to get the reference of the canvas element from our HTML document
    this.hostElement = hostElement;
    this.canvas = canvas.nativeElement;
    // console.log("INIT", hostElement, hostElement.nativeElement.offsetWidth, hostElement.nativeElement.offsetHeight);
    this.canvas.width = hostElement.nativeElement.offsetWidth;
    this.canvas.height = hostElement.nativeElement.offsetHeight;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,    // transparent background
      antialias: true // smooth edges
    });
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);

    // create the scene
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75,this.canvas.width / this.canvas.height, 0.1, 1000
    );
    this.camera.position.z = 5;
    this.scene.add(this.camera);

    // soft white light
    this.light = new THREE.AmbientLight(0x404040);
    this.light.position.z = 10;
    this.scene.add(this.light);

    const pointLight = new THREE.PointLight( 0xffffff, 1 );
		this.camera.add( pointLight );

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({color: 0xffffff});
    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);

  }

  public animate(): void {
    // We have to run this outside angular zones,
    // because it could trigger heavy changeDetection cycles.
    this.ngZone.runOutsideAngular(() => {
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
    this.frameId = requestAnimationFrame(() => {
      this.render();
    });
    
    this.cube.rotation.x += 0.01;
    this.cube.rotation.y += 0.01;
    this.renderer.render(this.scene, this.camera);
  }

  public resize(): void {
    const width = this.hostElement.nativeElement.offsetWidth;
    const height = this.hostElement.nativeElement.offsetHeight;

    // console.log(this.hostElement, width, height);
    this.renderer.setSize(width, height);
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera.updateProjectionMatrix();

  }

  ngOnDestroy(): void {
    if (this.frameId != -1) {
      cancelAnimationFrame(this.frameId);
      this.frameId = -1;
    }
  }
}
