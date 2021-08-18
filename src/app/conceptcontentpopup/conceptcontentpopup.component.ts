import { Component, Inject, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
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
      this.dialog.closeAll();
    }
  };

}

export class ConceptContentPopupData {
  constructor (public conceptData: ConceptNode  = { label: "Laden", type: [], uri: "" }, public parentConceptData: ConceptNode) {}
}
