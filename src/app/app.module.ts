import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { GraphQLModule } from './graphql.module';
import { HttpClientModule } from '@angular/common/http';
import { ListResourcesComponent } from './list-resources/list-resources.component';

@NgModule({
  declarations: [
    AppComponent,
    ListResourcesComponent
  ],
  imports: [
    BrowserModule,
    GraphQLModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
