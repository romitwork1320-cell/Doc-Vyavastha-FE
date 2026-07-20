import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common'; // Import CommonModule for async pipe
import { DashboardService, StatusCountsDto } from 'src/app/services/dashboard.service';
import { Router } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';

interface topcards {
  id: number;
  icon: string;
  color: string;
  title: string;
  subtitle: string;
}

@Component({
  selector: 'app-top-cards',
  templateUrl: './top-cards.component.html',
  styleUrls: ['./top-cards.component.scss'],
  standalone: true,
  imports: [MaterialModule, TablerIconsModule, CommonModule, MatRippleModule],
})
export class AppTopCardsComponent implements OnInit {

  // A property to hold the data from the API
  statusData: StatusCountsDto[] = [];

  // Define the structure of your dashboard cards.
  // The icons and colors are pre-defined here.
  // The `title` and `subtitle` will be updated from the API response.
  topcards: topcards[] = [
    {
      id: 1,
      color: 'warning',
      icon: 'tabler:clock-hour-4',
      title: 'Pending',
      subtitle: '0', // Initial value, will be updated
    },
    {
      id: 2,
      color: 'primary',
      icon: 'tabler:refresh',
      title: 'In Progress',
      subtitle: '0', // Initial value, will be updated
    },
    {
      id: 3,
      color: 'accent',
      icon: 'tabler:clipboard-check',
      title: 'Ready',
      subtitle: '0', // Initial value, will be updated
    },
    {
      id: 4,
      color: 'success',
      icon: 'tabler:circle-check',
      title: 'Completed',
      subtitle: '0', // Initial value, will be updated
    },
  ];

  // Inject the new DashboardService
  constructor(private dashboardService: DashboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Call the service method to fetch the data when the component initializes.
    this.dashboardService.getStatusCounts().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.statusData = response.data;
          this.updateTopCards();
        } else {
          console.error('Failed to load status counts:', response.message);
          // Handle API error gracefully, e.g., show a user-friendly message.
        }
      },
      error: (err) => {
        console.error('An error occurred while fetching status counts:', err);
        // Handle network or other errors.
      },
    });
  }

  // This method updates the topcards array with the new data from the API.
  private updateTopCards(): void {
    this.topcards.forEach(card => {
      const apiData = this.statusData.find(d => d.groupStatus === card.title);
      if (apiData) {
        card.subtitle = apiData.totalCount?.toString() || '0';
      }
    });
  }

  /**
   * Navigates to the replacement products page with a filter for the selected status.
   * @param status The status to filter by (e.g., 'Pending', 'In Progress').
   */
  viewDetails(status: string): void {
    // Navigate to the replacement-products route and pass the status as a query parameter.
    // Ensure you have a route configured for 'replacement-products'.
    this.router.navigate(['/replacements'], {
      queryParams: { groupStatus: status }
    });
  }
}
