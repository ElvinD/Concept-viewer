import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConceptlistComponent } from './conceptlist.component';

describe('ConceptlistComponent', () => {
  let component: ConceptlistComponent;
  let fixture: ComponentFixture<ConceptlistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConceptlistComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConceptlistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
