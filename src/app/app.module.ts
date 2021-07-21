import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { GraphQLModule } from './graphql.module';
import { HttpClientModule } from '@angular/common/http';
import { ListResourcesComponent } from './list-resources/list-resources.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon'
import { MatTreeModule } from '@angular/material/tree';
import { MatButtonModule  } from '@angular/material/button';

@NgModule({
  declarations: [
    AppComponent,
    ListResourcesComponent
  ],
  imports: [
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
