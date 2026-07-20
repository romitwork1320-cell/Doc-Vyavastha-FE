import { Directive, Input, OnDestroy, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { Router, NavigationEnd, Event as RouterEvent } from '@angular/router'; // Import RouterEvent
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth.service';

type PermissionType = 'CanView' | 'CanAdd' | 'CanEdit' | 'CanDelete';

@Directive({
  selector: '[ifHasPermission]',
  standalone: true,
})
export class IfHasPermissionDirective implements OnInit, OnDestroy {
  private permission: PermissionType;
  private currentUrl: string;
  private destroy$ = new Subject<void>();

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService,
    private router: Router
  ) {}

  @Input('ifHasPermission') set ifHasPermission(permission: PermissionType) {
    this.permission = permission;
  }

  ngOnInit(): void {
    // Subscribe to permission changes
    this.authService.permissions$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.updateView();
    });

    // Subscribe to route changes
    this.router.events
      .pipe(
        // ✨ FIX: Use a type guard to inform TypeScript of the event type
        filter((event: RouterEvent): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        // Now TypeScript knows 'event' is of type NavigationEnd
        this.currentUrl = event.urlAfterRedirects.split('?')[0];
        this.updateView();
      });
  }

  private updateView(): void {
    if (this.currentUrl && this.authService.hasPermission(this.currentUrl, this.permission)) {
      if (this.viewContainer.length === 0) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    } else {
      this.viewContainer.clear();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}