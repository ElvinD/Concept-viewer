import { Component, OnInit } from '@angular/core';
import { DynamicDatabase } from '../conceptlist/conceptlist.component';
import { RDFNode, SkosNode } from '../model/types';

@Component({
  selector: 'app-conceptcontent',
  templateUrl: './conceptcontent.component.html',
  styleUrls: ['./conceptcontent.component.css']
})
export class ConceptcontentComponent implements OnInit {

  data$: SkosNode = { label: "Laden", type: [], uri: "" };

  constructor(public database: DynamicDatabase) { }

  ngOnInit(): void {
    this.database.selectedNodeSubject.subscribe((node) => {
      console.log("geklikt op ", node);
      if (this.database.getNode(node) !== undefined) {
        switch (this.database.getNode(node)?.type[0].label) {
          case "Concept":
            this.database.loadConcept(node).then((result) => {
              this.data$ = result;
              console.log('result:', this.data$);
            });
            break;

            default:
              return;
        }
      }
    });
  }

}
