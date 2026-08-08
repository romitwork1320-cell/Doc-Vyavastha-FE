import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrganizationTypeDialogComponent } from './organization-type-dialog.component';

describe('OrganizationTypeDialogComponent', () => {
  let component: OrganizationTypeDialogComponent;
  let fixture: ComponentFixture<OrganizationTypeDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationTypeDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrganizationTypeDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
