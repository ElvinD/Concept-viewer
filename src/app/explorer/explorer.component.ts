import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { DynamicDatabase } from '../conceptlist/conceptlist.component';
import { EngineService } from '../engine/engine.service';
import { ConceptNode, ConceptSchemeNode } from '../model/types';
import { InteractionEventTypes, InteractionService } from '../services/interaction.service';


@Component({
  selector: 'app-explorer',
  templateUrl: './explorer.component.html',
  styleUrls: ['./explorer.component.css']
})
export class ExplorerComponent implements OnInit {

  @ViewChild('rendererCanvas', { static: true })
  public rendererCanvas!: ElementRef<HTMLCanvasElement>;

  constructor(private renderView: EngineService,
    private hostElement: ElementRef<HTMLDivElement>,
    private database: DynamicDatabase,
    private interactionService: InteractionService) {
  }

  ngOnInit(): void {
    this.renderView.createScene(this.rendererCanvas, this.hostElement);
    this.interactionService.eventSubmitter.subscribe(async event => {
      let node: ConceptNode;
      // console.log("interaction event: ", event);
      switch (event.type) {
        case InteractionEventTypes.OVER:
          this.renderView.focusOnNode(event.value);
          break;

        case InteractionEventTypes.OUT:
          this.renderView.unFocusNode(event.value);
          break;

        case InteractionEventTypes.EXPLORER_SELECT:
          node = this.database.getNode(event.value) as ConceptNode;
          if (node && node.__typename == "Concept") {
            const childNodes = await this.database.getChildren(node.uri);
            if (childNodes && childNodes.length) {
              this.initChildNodes(node, childNodes);
              // this.animateSphere(this.renderView.meshMap.get(node.uri));
              const childMeshes = this.renderView.meshMap.get(node.uri);
              if (childMeshes) {
                 this.debugNodes(childMeshes);
              };
            }
          };
          break;
        case InteractionEventTypes.TREE_SELECT:
          node = this.database.getNode(event.value) as ConceptNode;
          if (node && node.__typename == "Concept") {
            this.renderView.selectNode(event.value);
          };
          break;

        default:
          break;
      }
    });
    this.database.selectedNodeSubject.subscribe((node) => {
      if (this.database.getNode(node) !== undefined) {
        switch (this.database.getNode(node)?.__typename) {
          case "Concept":
            this.database.loadConcept(node).then((result: ConceptNode) => {
              // console.log("show child meshes");
            });
            break;

          case "ConceptScheme":
            const conceptSchemeData = this.database.getNode(node) as ConceptSchemeNode;
            // console.log("mesh: ", this.renderView.rootMesh?.name, " scheme: ", conceptSchemeData.uri);
            if (this.renderView.rootMesh) {
              if (conceptSchemeData.uri == this.renderView.rootMesh.name) {
                return;
              }
            }
            this.init3dNodes(conceptSchemeData);
            break;

          default:
            return;
        }
      }
    });
    this.renderView.startFrameRendering();
  }

  initChildNodes(parentNode: ConceptNode, childNodes: string[]) {
    // console.log("init child nodes: ", parentNode, "children: ", childNodes);
    if (!this.renderView.meshMap.get(parentNode.uri)) {
      const childMeshes: THREE.Mesh[] = [];
      const parentMesh = this.renderView.scene.getObjectByName(parentNode.uri);
      if (parentMesh) {
        let basePosition:THREE.Vector3 = new THREE.Vector3();
        basePosition.copy(parentMesh.position);
        console.log("base position:", basePosition);
        childNodes.map(uri => {
          const mesh = this.renderView.createMesh(uri, 0.02);
          mesh.position.set(basePosition.x, basePosition.y, basePosition.z);
          this.renderView.addChildMesh(mesh);
          childMeshes.push(mesh);
          const edge = this.renderView.createEdge(parentMesh, mesh);
          this.renderView.addEdge(edge);
        });
        this.renderView.meshMap.set(parentNode.uri, childMeshes);
        this.renderView.makeGrid(childMeshes, basePosition);
        this.renderView.makeSphere(childMeshes, basePosition);
        this.renderView.makeHelix(childMeshes, basePosition);
        this.renderView.createLabels(childMeshes);
        // console.log("created: ", this.renderView.meshMap.get(parentNode.uri));
      }
    } else {
      // console.log("already populated: ", this.renderView.meshMap.get(parentNode.uri));
    }
  }

  debugNodes(children: THREE.Mesh[]) {
    console.log("debugnodes ", children);
    children.map(child => {
      const targetVector:THREE.Vector3 = child.userData["sphere"];
      if (targetVector) {
        child.position.set (targetVector.x, targetVector.y, targetVector.y);
      };
    })
  }

  init3dNodes(data: ConceptSchemeNode) {
    this.renderView.reset();
    const rootMesh = this.renderView.initRootMesh(data.uri);
    const childMeshes: THREE.Mesh[] = [];
    data.hasTopConcept?.map(node => {
      const mesh = this.renderView.createMesh(node.uri, 0.02);
      this.renderView.addChildMesh(mesh);
      childMeshes.push(mesh);
      const edge = this.renderView.createEdge(rootMesh, mesh);
      this.renderView.addEdge(edge);
    });
    this.renderView.meshMap.set(data.uri, childMeshes);
    this.renderView.makeSphere(childMeshes);
    this.renderView.makeGrid(childMeshes);
    this.renderView.makeHelix(childMeshes);
    this.renderView.createLabels(childMeshes);
    // this.renderView.makeTable();
    this.animateSphere(childMeshes);
  }

  canvasClicked(event: MouseEvent) {
    this.renderView.clicked(event);
  }

  animateSphere(objects?: THREE.Object3D[]) {
    objects = objects ? objects : this.renderView.baseMeshes;
    // console.log("animating: ", objects);
    this.renderView.animateSphere(objects);
  }

  animateGrid(objects?: THREE.Object3D[]) {
    objects = objects ? objects : this.renderView.baseMeshes;
    this.renderView.animateGrid(objects);
  }

  animateHelix(objects?: THREE.Object3D[]) {
    objects = objects ? objects : this.renderView.baseMeshes;
    this.renderView.animateHelix(objects);
  }

  animateTable(objects?: THREE.Object3D[]) {
    objects = objects ? objects : this.renderView.baseMeshes;
    this.renderView.animateTable(objects);
  }
}
