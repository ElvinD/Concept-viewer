import { Component, OnInit, Inject, Input } from '@angular/core';
import { DynamicDatabase, DynamicFlatNode } from '../conceptlist/conceptlist.component';
import { ConceptSchemeNode, RDFNode, ConceptNode } from '../model/types';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ConceptcontentpopupComponent, ConceptContentPopupData } from '../conceptcontentpopup/conceptcontentpopup.component';

@Component({
  selector: 'app-conceptcontent',
  templateUrl: './conceptcontent.component.html',
  styleUrls: ['./conceptcontent.component.css']
})
export class ConceptcontentComponent implements OnInit {

  @Input() conceptData$?: ConceptNode = { label: "Laden", type: [], uri: "" };
  @Input() conceptSchemeData$?: ConceptSchemeNode;

  constructor(public database: DynamicDatabase,
    protected dialog: MatDialog) { };

  ngOnInit(): void {
    this.database.selectedNodeSubject.subscribe((node) => {
      if (this.database.getNode(node) !== undefined) {
        switch (this.database.getNode(node)?.__typename) {
          case "Concept":
            this.database.loadConcept(node).then((result) => {
              this.conceptData$ = result;
              this.conceptSchemeData$ = undefined;
            });
            break;

          case "ConceptScheme":
            this.conceptData$ = undefined;
            this.conceptSchemeData$ = this.database.getNode(node) as ConceptSchemeNode;
            // console.log("toon conceptscheme",  this.conceptSchemeData$ )
            break;

          default:
            return;
        }
      }
    });
  }

  nodeClicked(node: RDFNode) {
      this.database.loadConcept(node.uri).then((result) => {
        this.showPopup(result);
      });
  }

  protected showPopup(node: RDFNode) {
    if (this.conceptData$ === undefined) return;
    const config = new MatDialogConfig();
    config.disableClose = false;
    config.autoFocus = true;
    config.maxWidth = "80vw";
    config.maxHeight = "80vh";
    config.data = new ConceptContentPopupData (node, this.conceptData$);
    let dialogRef = this.dialog.open(ConceptcontentpopupComponent, config);
    dialogRef.afterClosed().subscribe(data => {
      console.log(`Dialoog gesloten: ${data}`);
    })
  }

}
