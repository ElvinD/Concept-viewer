import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
    this.interactionService.eventSubmitter.subscribe(event => {
      switch (event.type) {
        case InteractionEventTypes.OVER:
          this.renderView.focusOnNode(event.value);
          break;

        case InteractionEventTypes.OUT:
          this.renderView.unFocusNode(event.value);
          break;

        case InteractionEventTypes.TREE_SELECT:
          const node = this.database.getNode(event.value);
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
              console.log("show child meshes");
            });
            break;

          case "ConceptScheme":
            const conceptSchemeData = this.database.getNode(node) as ConceptSchemeNode;
            console.log("mesh: ", this.renderView.rootMesh?.name, " scheme: ", conceptSchemeData.uri);
            if (this.renderView.rootMesh) {
              if (conceptSchemeData.uri == this.renderView.rootMesh.name) {
                console.log("will NOT init 3d from conceptscheme");
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
    // this.renderView.renderOnDemand();
  }
  animateSphere() {
    this.renderView.animateSphere();
  }

  animateGrid() {
    this.renderView.animateGrid();
  }

  animateHelix() {
    this.renderView.animateHelix();
  }

  animateTable() {
    this.renderView.animateTable();
  }

  initChildNodes(data: ConceptNode) {
    const childMeshes: THREE.Mesh[] = [];
    const parentNode = this.renderView.scene.getObjectByName(data.uri);
    if (parentNode) {
      data.narrower?.map(childNode => {
        const mesh = this.renderView.createMesh(childNode.uri, 0.02);
        this.renderView.addChildMesh(mesh);
        childMeshes.push(mesh);
        const edge = this.renderView.createEdge(parentNode, mesh);
        this.renderView.addEdge(edge);
      });
      this.renderView.meshMap.set(data.uri, childMeshes);
    }
  }

  init3dNodes(data: ConceptSchemeNode) {
    console.log("init3d:", data);
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
    console.log("meshmap:", this.renderView.meshMap);
    this.renderView.makeSphere(childMeshes);
    this.renderView.makeGrid(childMeshes);
    this.renderView.makeHelix(childMeshes);
    this.renderView.createLabels();
    // this.renderView.makeTable();
    this.animateSphere();
  }

  canvasClicked(event: MouseEvent) {
    this.renderView.clicked(event);
  }
}
