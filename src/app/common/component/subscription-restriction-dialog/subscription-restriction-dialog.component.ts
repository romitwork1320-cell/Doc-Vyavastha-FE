import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MaterialModule } from 'src/app/material.module'; // Ensure material modules are imported
import { TablerIconsModule } from 'angular-tabler-icons';

@Component({
  selector: 'app-subscription-restriction-dialog',
  standalone: true,
  imports: [MaterialModule, TablerIconsModule],
  templateUrl: './subscription-restriction-dialog.component.html',
  styleUrls: ['./subscription-restriction-dialog.component.scss']
})
export class SubscriptionRestrictionDialogComponent {
  
  constructor(
    public dialogRef: MatDialogRef<SubscriptionRestrictionDialogComponent>,
    private router: Router
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onBuyNow(): void {
    this.dialogRef.close(true);
    this.router.navigate(['/subscription']); // Redirect to subscription page
  }
}