import { FlatTreeControl } from '@angular/cdk/tree';
import { Component, OnInit } from '@angular/core';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { Apollo, gql } from 'apollo-angular';
import { GET_Concepts, GraphqlService } from '../services/graphql.service';

export class DynamicFlatNode {
  constructor (public node:RDFNode, public level = 1, public expandable = false, public isLoading = false) {}
}

export interface RDFNode{
  label:string;
  uri:string;
}

export interface SkosNode extends RDFNode {
    narrower?: SkosNode[];
}

export interface ConceptSchemeNode extends RDFNode {
  hasTopConcept?: SkosNode[];
}

export interface TreeRenderNode {
  expandable: boolean;
  name: string;
  level: number;
}

@Component({
  selector: 'app-list-resources',
  templateUrl: './list-resources.component.html',
  styleUrls: ['./list-resources.component.css']
})
export class ListResourcesComponent implements OnInit {
  loading = true;
  error: any;

  constructor(public graphqlService: GraphqlService, private apollo:Apollo) {
    this.dataSource.data = [];
  }
  hasChild = (_: number, node: TreeRenderNode) => node.expandable;

  ngOnInit() {
    this.graphqlService.loadConceptSchemes(this.dataSource);
    // this.graphqlService.loadConcepts(this.dataSource);
    // this.apollo
    //   .watchQuery({
    //     query: GET_Concepts
      
    //   })
    //   .valueChanges.subscribe((result: any) => {
    //     this.dataSource.data = result?.data?.concepts;
    //     console.log("results: ", this.dataSource.data);
    //     this.loading = result.loading;
    //     this.error = result.error;
    //   });
  }

  private _conceptSchemeTransformer = (node: ConceptSchemeNode, level: number) => {
    return {
      expandable: !!node.hasTopConcept && node.hasTopConcept.length > 0,
      name: node.label,
      level: level,
    };
  }

  private _conceptTransformer = (node: SkosNode, level: number) => {
    return {
      expandable: !!node.narrower && node.narrower.length > 0,
      name: node.label,
      level: level,
    };
  }

  treeControl = new FlatTreeControl<TreeRenderNode>(
    node => node.level, node => node.expandable);

  treeFlattener = new MatTreeFlattener(
    this._conceptSchemeTransformer, node => node.level, node => node.expandable, node => node.hasTopConcept);

  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

}


