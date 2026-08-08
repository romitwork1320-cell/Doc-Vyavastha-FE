import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequirementCreateDialogComponent } from './requirement-create-dialog.component';

describe('RequirementCreateDialogComponent', () => {
  let component: RequirementCreateDialogComponent;
  let fixture: ComponentFixture<RequirementCreateDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequirementCreateDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequirementCreateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
