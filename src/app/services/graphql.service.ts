import { MatTreeFlatDataSource } from '@angular/material/tree';
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConceptSchemeNode, SkosNode, TreeRenderNode } from '../list-resources/list-resources.component';

@Injectable({
  providedIn: 'root'
})
export class GraphqlService {

  loading$ = new BehaviorSubject(true);
  error: any;

  constructor(private apollo: Apollo) { }

  loadConceptSchemes(dataSource: MatTreeFlatDataSource<ConceptSchemeNode, TreeRenderNode>): void {
    this.apollo.watchQuery<Query>({
      query: GET_ConceptSchemes,
      variables: {},
    })
      .valueChanges.subscribe((result) => {
        dataSource.data = result?.data?.conceptSchemes
console.log(result);
        this.loading$.next(result.loading);
        this.error = result.error;
      });
  }

  loadConcepts(dataSource: MatTreeFlatDataSource<SkosNode, TreeRenderNode>): void {
    this.apollo.watchQuery<Query>({
      query: GET_Concepts,
      variables: {},
    })
    .valueChanges.subscribe((result) => {
      dataSource.data = result?.data?.concepts;
      this.loading$.next(result.loading);
      this.error = result.error;
    });
  }
}


export type Query = {
  conceptSchemes: ConceptSchemeNode[];
  concepts: SkosNode[];
}

export const GET_ConceptSchemes = gql`
  query getSearchResults($limit: Int) {
    conceptSchemes(first: $limit) {
      uri
      label
      type {
        uri
        label
      }
      rdfs_label {
        string
        datatype
        lang
      }
      hasTopConcept {
        uri
        label
        narrower {
          uri
          label
        }
      }
      subject {
        uri
        label
      }
  }
}
`;

export const GET_Concepts = gql`
 query getSearchResults($limit: Int, $filter_broader: ID) {
    concepts(first: $limit, where: {broader: {hasValue: $filter_broader}}) {
    uri
    label
    type {
      uri
      label
    }
    broader {
      uri
    }
    narrower {
      uri
      label
    }
  }
}
`;
