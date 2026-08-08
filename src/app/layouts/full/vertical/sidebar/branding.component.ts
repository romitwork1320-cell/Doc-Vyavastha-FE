import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CoreService } from 'src/app/services/core.service';
import { ProfileService } from 'src/app/services/profile.service';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-branding',
  standalone: true,
  imports: [RouterModule, CommonModule],
  template: `
    <div class="branding">
      <a [routerLink]="['/dashboard']">
        <img
          [src]="defaultLogoUrl"
          (error)="$any($event.target).src = defaultLogoUrl"

          class="align-middle m-2"
          alt="logo"
          style="width: 155px; height: auto; object-fit: contain;"
        />
      </a>
    </div>
  `,
})
export class BrandingComponent {
  options = this.settings.getOptions();

  companyLogoUrl$: Observable<string>;

  defaultLogoUrl = './assets/images/logos/logo.png';

  private profileService = inject(ProfileService);

  constructor(private settings: CoreService) {
    this.companyLogoUrl$ = this.profileService.companyLogoUrl$;
  }
}