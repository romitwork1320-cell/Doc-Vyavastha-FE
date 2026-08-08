import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationEditDialogComponent } from './application-edit-dialog.component';

describe('ApplicationEditDialogComponent', () => {
  let component: ApplicationEditDialogComponent;
  let fixture: ComponentFixture<ApplicationEditDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationEditDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApplicationEditDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
