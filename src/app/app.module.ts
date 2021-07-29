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


@NgModule({
  declarations: [
    AppComponent,
    ConceptlistComponent,
    ConceptcontentComponent
  ],
  imports: [
    MatToolbarModule,
    MatProgressBarModule,
    BrowserModule,
    MatButtonModule,
    MatTreeModule,
    MatIconModule,
    GraphQLModule,
    HttpClientModule,
    BrowserAnimationsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
