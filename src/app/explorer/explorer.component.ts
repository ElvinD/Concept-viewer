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
            this.renderView.initRootMesh(conceptSchemeData.uri);
            break;

          default:
            return;
        }
      }
    });
    this.renderView.animate();
  }

}
