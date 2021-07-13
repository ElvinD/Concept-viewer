import { Component, OnInit } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';

@Component({
  selector: 'app-list-resources',
  templateUrl: './list-resources.component.html',
  styleUrls: ['./list-resources.component.css']
})
export class ListResourcesComponent implements OnInit {
  resources:any[] = [];
  loading = true;
  error:any;


  constructor(private apollo: Apollo) { }

  ngOnInit() {
    this.apollo
      .watchQuery({
        query: gql`
          {
            concepts {
               uri
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
        console.log("results: ", result);
        this.resources = result?.data?.concepts;
        this.loading = result.loading;
        this.error = result.error;
      });
  }

}
