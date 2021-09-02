import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { GraphQLModule } from './graphql.module';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon'
import { MatTreeModule } from '@angular/material/tree';
import { MatButtonModule } from '@angular/material/button';
import { ConceptlistComponent } from './conceptlist/conceptlist.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ConceptcontentComponent } from './conceptcontent/conceptcontent.component';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { ConceptcontentpopupComponent } from './conceptcontentpopup/conceptcontentpopup.component';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';


@NgModule({
  declarations: [
    AppComponent,
    ConceptlistComponent,
    ConceptcontentComponent,
    ConceptcontentpopupComponent
  ],
  imports: [
    MatChipsModule,
    MatCardModule,
    MatDividerModule,
    MatButtonToggleModule,
    MatToolbarModule,
    MatProgressBarModule,
    BrowserModule,
    MatButtonModule,
    MatDialogModule,
    MatTreeModule,
    MatIconModule,
    GraphQLModule,
    HttpClientModule,
    BrowserAnimationsModule,
    RouterModule.forRoot([
      { path: '', pathMatch:'prefix' ,component: ConceptlistComponent },
      { path: 'esdm/im/begrippen/id/:uri', pathMatch: 'prefix' , component: ConceptcontentComponent },
    ])
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
