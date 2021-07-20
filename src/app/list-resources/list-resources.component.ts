import {FlatTreeControl} from '@angular/cdk/tree';
import { Component, OnInit } from '@angular/core';
import {MatTreeFlatDataSource, MatTreeFlattener} from '@angular/material/tree';
import {MatButtonModule} from '@angular/material/button';
import { Apollo, gql } from 'apollo-angular';

interface SkosNode {
  label: string;
  uri:string;
  narrower?: SkosNode[];
}

interface TreeRenderNode {
  expandable:boolean;
  name:string;
  level:number;
}

@Component({
  selector: 'app-list-resources',
  templateUrl: './list-resources.component.html',
  styleUrls: ['./list-resources.component.css']
})
export class ListResourcesComponent implements OnInit {
  loading = true;
  error:any;

  constructor(private apollo: Apollo) { 
    this.dataSource.data = [];
  }
  hasChild = (_: number, node: TreeRenderNode) => node.expandable;

  ngOnInit() {
    this.apollo
      .watchQuery({
        query: gql`
          {
            concepts {
              definition { 
                string
              }
               uri
               narrower {
                 uri
                 label
                 narrower {
                   uri
                   label
                 }
               }
              label
              type {
                uri
                label
              }
          }
      }
        `,
      })
      .valueChanges.subscribe((result: any) => {
        this.dataSource.data = result?.data?.concepts;
        console.log("results: ", this.dataSource.data);
        this.loading = result.loading;
        this.error = result.error;
      });
  }

  private _transformer = (node: SkosNode, level: number) => {
    return {
      expandable: !!node.narrower && node.narrower.length > 0,
      name: node.label,
      level: level,
    };
  }

  treeControl = new FlatTreeControl<TreeRenderNode>(
    node => node.level, node => node.expandable);

  treeFlattener = new MatTreeFlattener(
      this._transformer, node => node.level, node => node.expandable, node => node.narrower);

  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

}
