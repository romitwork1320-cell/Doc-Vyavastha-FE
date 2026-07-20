import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { RouterModule } from '@angular/router'; 
import { BrandingComponent } from './branding.component';
import { MaterialModule } from 'src/app/material.module';
import { NavItem } from './nav-item/nav-item';
import { navItems } from './sidebar-data';
import { CoreService } from 'src/app/services/core.service';
import { IconsModule } from 'src/app/icons.module';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,      
    RouterModule,     
    BrandingComponent, 
    IconsModule,
    MaterialModule
  ],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent implements OnInit {
  public accessibleNavItems: NavItem[] = [];

  constructor(
    public settings: CoreService,
    private authService: AuthService
  ) {}

  @Input() showToggle = true;
  @Output() toggleMobileNav = new EventEmitter<void>();
  @Output() toggleCollapsed = new EventEmitter<void>();
  @Input() toggleChecked = false;

  ngOnInit(): void {
    // Filter navItems based on user permissions
    const filteredItems: NavItem[] = [];

    for (let i = 0; i < navItems.length; i++) {
      const item = navItems[i];

      // If it's a section header, we will add it tentatively.
      // We will only keep it if the items following it (before the next header) are accessible.
      if (item.navCap) {
        let hasAccessibleChild = false;
        // Look ahead to see if any child item before the next header is accessible
        for (let j = i + 1; j < navItems.length; j++) {
          const nextItem = navItems[j];
          if (nextItem.navCap) break; // Reached the next section header
          
          if (nextItem.route && this.authService.hasPermission(nextItem.route, 'CanView')) {
            hasAccessibleChild = true;
            break;
          } else if (!nextItem.route) {
            // It's a non-route item (maybe another type of header/divider?), consider it accessible for now
            hasAccessibleChild = true;
            break;
          }
        }

        if (hasAccessibleChild) {
          filteredItems.push(item);
        }
      } else if (item.route) {
        // If it's a regular route item, check permissions
        if (this.authService.hasPermission(item.route, 'CanView')) {
          filteredItems.push(item);
        }
      } else {
        // For any other items (e.g. dividers), just add them
        filteredItems.push(item);
      }
    }

    this.accessibleNavItems = filteredItems;
  }
}