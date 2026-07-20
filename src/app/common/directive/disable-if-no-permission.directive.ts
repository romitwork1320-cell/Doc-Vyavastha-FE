import { Directive, Input, OnDestroy, OnInit, HostBinding, HostListener } from '@angular/core';
import { Router, NavigationEnd, Event as RouterEvent } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil, startWith } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth.service';

type PermissionType = 'CanView' | 'CanAdd' | 'CanEdit' | 'CanDelete';

@Directive({
  selector: '[disableIfNoPermission]',
  standalone: true,
})
export class DisableIfNoPermissionDirective implements OnInit, OnDestroy {
  private permission: PermissionType;
  private currentUrl: string;
  private hasPermission: boolean = true;
  private destroy$ = new Subject<void>();

  @HostBinding('class.permission-disabled') get isDisabledClass() { return !this.hasPermission; }
  @HostBinding('attr.aria-disabled') get isDisabledAria() { return !this.hasPermission; }
  @HostBinding('attr.tabindex') get tabIndex() { return this.hasPermission ? null : '-1'; }

  @HostListener('click', ['$event'])
  onClick(event: Event) {
    if (!this.hasPermission) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  @Input('disableIfNoPermission') set disableIfNoPermission(permission: PermissionType) {
    this.permission = permission;
  }

  ngOnInit(): void {
    const routeEvents$ = this.router.events.pipe(
      filter((event: RouterEvent): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(this.router)
    );

    this.authService.permissions$.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateView());
    routeEvents$.pipe(takeUntil(this.destroy$)).subscribe(event => {
      const url = ('urlAfterRedirects' in event) ? event.urlAfterRedirects : this.router.url;
      this.currentUrl = url.split('?')[0];
      this.updateView();
    });
  }

  private updateView(): void { 
    if (this.currentUrl) {
      this.hasPermission = this.authService.hasPermission(this.currentUrl, this.permission);
    } else {
      this.hasPermission = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}