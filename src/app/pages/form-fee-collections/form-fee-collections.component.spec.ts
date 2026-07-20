import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormFeeCollectionsComponent } from './form-fee-collections.component';

describe('FormFeeCollectionsComponent', () => {
  let component: FormFeeCollectionsComponent;
  let fixture: ComponentFixture<FormFeeCollectionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormFeeCollectionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormFeeCollectionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
