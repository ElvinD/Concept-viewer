import { Component, ElementRef, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { EngineService } from '../engine/engine.service';


@Component({
  selector: 'app-explorer',
  templateUrl: './explorer.component.html',
  styleUrls: ['./explorer.component.css']
})
export class ExplorerComponent implements OnInit {

  @ViewChild('rendererCanvas', { static: true })
  public rendererCanvas!: ElementRef<HTMLCanvasElement>;
  constructor(private engServ: EngineService, private hostElement: ElementRef<HTMLDivElement>) {
    // console.log(this.hostElement);
   }

  ngOnInit(): void {
    this.engServ.createScene(this.rendererCanvas, this.hostElement);
    this.engServ.animate();
  }

}
