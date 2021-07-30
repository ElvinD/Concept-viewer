import { Component, OnInit } from '@angular/core';
import { DynamicDatabase } from '../conceptlist/conceptlist.component';
import { ConceptSchemeNode, RDFNode, ConceptNode } from '../model/types';

@Component({
  selector: 'app-conceptcontent',
  templateUrl: './conceptcontent.component.html',
  styleUrls: ['./conceptcontent.component.css']
})
export class ConceptcontentComponent implements OnInit {

  conceptData$?: ConceptNode = { label: "Laden", type: [], uri: "" };
  conceptSchemeData$?: ConceptSchemeNode;
  data$?:RDFNode;

  constructor(public database: DynamicDatabase) { }

  ngOnInit(): void {
    this.database.selectedNodeSubject.subscribe((node) => {
      if (this.database.getNode(node) !== undefined) {
        // console.log("geklikt op ", this.database.getNode(node));
        this.data$ = this.database.getNode(node);
        // switch (this.database.getNode(node)?.type[0].label) {
        switch (this.database.getNode(node)?.__typename) {
          case "Concept":
            this.database.loadConcept(node).then((result) => {
              this.conceptData$ = result;
              this.conceptSchemeData$ = undefined;
              console.log('result:', this.conceptData$);
            });
            break;

          case "ConceptScheme":
            this.conceptData$ = undefined;
            this.conceptSchemeData$ = this.database.getNode(node) as ConceptSchemeNode;
            break;

            default:
              return;
        }
      }
    });
  }

}
