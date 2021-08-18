import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConceptcontentComponent } from './conceptcontent.component';

describe('ConceptcontentComponent', () => {
  let component: ConceptcontentComponent;
  let fixture: ComponentFixture<ConceptcontentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConceptcontentComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConceptcontentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
