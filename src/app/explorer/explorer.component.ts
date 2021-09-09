import { Component, ElementRef, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { DynamicDatabase } from '../conceptlist/conceptlist.component';
import { EngineService } from '../engine/engine.service';
import { ConceptSchemeNode } from '../model/types';


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
    private database: DynamicDatabase) {
  }

  ngOnInit(): void {
    this.renderView.createScene(this.rendererCanvas, this.hostElement);

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
    this.renderView.animate();
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

  init3dNodes(data: ConceptSchemeNode) {
    this.renderView.reset();
    this.renderView.initRootMesh(data.uri);
    data.hasTopConcept?.map(node => {
      const mesh = this.renderView.createMesh(node.uri, 0.05);
      this.renderView.addChildMesh(mesh);
    });
    this.renderView.makeSphere();
    this.renderView.makeGrid();
    this.renderView.makeHelix();
    this.animateSphere();
  }
}
