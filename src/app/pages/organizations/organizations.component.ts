import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { InvitationsListComponent } from '../invitations/invitations-list/invitations-list.component';

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [CommonModule, MatTabsModule, MatCardModule, InvitationsListComponent],
  template: `
    <mat-card class="cardWithShadow">
      <mat-card-header>
        <mat-card-title>Organizations</mat-card-title>
        <mat-card-subtitle>Manage your connected organizations and requests</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content class="p-24">
        <mat-tab-group animationDuration="0ms">
          <mat-tab label="Connected">
            <div class="m-t-24">
              <!-- We can build a dedicated active connections list for clients later -->
              <p>Active organization connections will appear here.</p>
            </div>
          </mat-tab>
          <mat-tab label="Pending Requests">
            <div class="m-t-24">
              <!-- <app-connection-requests-list></app-connection-requests-list> -->
            </div>
          </mat-tab>
          <mat-tab label="Invitations">
            <div class="m-t-24">
              <app-invitations-list></app-invitations-list>
            </div>
          </mat-tab>
          <mat-tab label="History">
            <div class="m-t-24">
              <p>Connection history will appear here.</p>
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-card-content>
    </mat-card>
  `
})
export class OrganizationsComponent implements OnInit {
  constructor() { }
  ngOnInit(): void { }
}
