import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InteractionService {

  private _event: CustomInteractionEvent = new CustomInteractionEvent(InteractionEventTypes.NONE, this, "");

  public eventSubmitter = new BehaviorSubject(this._event);

  constructor() { }

  emitEvent(event:CustomInteractionEvent) {
    this.eventSubmitter.next(event);
  }
}

export enum InteractionEventTypes {
  OVER,
  OUT,
  SELECT,
  NONE
}

export class CustomInteractionEvent {
  constructor(public type: InteractionEventTypes, public source:any, public value:string) {}
}
