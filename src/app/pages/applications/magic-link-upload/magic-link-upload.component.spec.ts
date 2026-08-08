import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MagicLinkUploadComponent } from './magic-link-upload.component';

describe('MagicLinkUploadComponent', () => {
  let component: MagicLinkUploadComponent;
  let fixture: ComponentFixture<MagicLinkUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MagicLinkUploadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MagicLinkUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
