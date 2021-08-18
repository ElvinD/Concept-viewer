import { Injectable } from '@angular/core';
import { MatTreeFlatDataSource } from '@angular/material/tree';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject } from 'rxjs';

@Injectable({
      providedIn: 'root'
})
export class GraphqlService {

      loading$ = new BehaviorSubject(true);
      error: any;

      constructor(private apollo: Apollo) { }
}




