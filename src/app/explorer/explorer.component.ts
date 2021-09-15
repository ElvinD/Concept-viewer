import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DynamicDatabase } from '../conceptlist/conceptlist.component';
import { EngineService } from '../engine/engine.service';
import { ConceptSchemeNode } from '../model/types';
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
          this.renderView.selectNode(event.value);
          break;

        default:
          break;
      }
    });
    this.database.selectedNodeSubject.subscribe((node) => {
      if (this.database.getNode(node) !== undefined) {
        switch (this.database.getNode(node)?.__typename) {
          case "Concept":
            this.database.loadConcept(node).then((result) => {
            });
            break;

          case "ConceptScheme":
            const conceptSchemeData = this.database.getNode(node) as ConceptSchemeNode;
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

  init3dNodes(data: ConceptSchemeNode) {
    // const buttonLabels = this._document.querySelectorAll('.nodelink');
    // buttonLabels.forEach(item => {
    //   console.log("found item:", item);
    // })
    this.renderView.reset();
    const rootMesh = this.renderView.initRootMesh(data.uri);
    data.hasTopConcept?.map(node => {
      const mesh = this.renderView.createMesh(node.uri, 0.02);
      this.renderView.addChildMesh(mesh);
      const edge = this.renderView.createEdge(rootMesh, mesh);
      this.renderView.addEdge(edge);
    });
    this.renderView.makeSphere();
    this.renderView.makeGrid();
    this.renderView.makeHelix();
    this.renderView.createLabels();
    // this.renderView.makeTable();
    this.animateSphere();
  }

  canvasClicked(event:MouseEvent) {
    this.renderView.clicked(event);
  }
}
