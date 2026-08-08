import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrganizationTypesListComponent } from './organization-types-list.component';

describe('OrganizationTypesListComponent', () => {
  let component: OrganizationTypesListComponent;
  let fixture: ComponentFixture<OrganizationTypesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationTypesListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrganizationTypesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
