import { Component, Inject, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DynamicDatabase } from '../conceptlist/conceptlist.component';
import { ConceptNode, RDFNode } from '../model/types';

@Component({
  selector: 'app-conceptcontentpopup',
  templateUrl: './conceptcontentpopup.component.html',
  styleUrls: ['./conceptcontentpopup.component.css']
})
export class ConceptcontentpopupComponent implements OnInit {

  data: ConceptContentPopupData;

  constructor(public database: DynamicDatabase,
    protected dialog: MatDialog,
    private dialogRef: MatDialogRef<ConceptcontentpopupComponent>,
    @Inject(MAT_DIALOG_DATA) data: ConceptContentPopupData) {
      this.data = data;
  }

  ngOnInit(): void {
  }

  nodeClicked(node:RDFNode) {
    if (node.uri === this.data.parentConceptData.uri) {
      this.dialogRef.close();
      return;
    } else {
      this.dialogRef.close();
      this.database.loadConcept(node.uri).then((result) => {
        this.showPopup(result);
      });
    }
  };

  protected showPopup(node: RDFNode) {
    
    const config = new MatDialogConfig();
    config.disableClose = false;
    config.autoFocus = true;
    config.maxWidth = "80vw";
    config.maxHeight = "80vh";
    config.data = new ConceptContentPopupData (node, this.data.parentConceptData);
    this.dialogRef = this.dialog.open(ConceptcontentpopupComponent, config);
    this.dialogRef.afterClosed().subscribe(data => {
      console.log(`Dialoog gesloten: ${data}`);
    })
  }

}


export class ConceptContentPopupData {
  constructor (public conceptData: ConceptNode  = { label: "Laden", type: [], uri: "" }, public parentConceptData: ConceptNode) {}
}
