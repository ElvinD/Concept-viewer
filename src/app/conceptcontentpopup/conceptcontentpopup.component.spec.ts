import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConceptcontentpopupComponent } from './conceptcontentpopup.component';

describe('ConceptcontentpopupComponent', () => {
  let component: ConceptcontentpopupComponent;
  let fixture: ComponentFixture<ConceptcontentpopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConceptcontentpopupComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConceptcontentpopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
