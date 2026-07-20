import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TablerIconsModule } from 'angular-tabler-icons';
import { HealthService, SystemHealth } from 'src/app/services/health.service';
import { finalize } from 'rxjs';

const saveFile = (blob: Blob, fileName: string) => {
  const a = document.createElement('a');
  const url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
};

@Component({
  selector: 'app-system-health',
  templateUrl: './system-health.component.html',
  styleUrls: ['./system-health.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TablerIconsModule
  ],
})

export class SystemHealthComponent implements OnInit {
  healthData: SystemHealth | null = null;
  isLoading = false;
  lastChecked: Date = new Date();
  isDownloading: { [key: string]: boolean } = {};

  constructor(private healthService: HealthService) {}

  ngOnInit(): void {
    this.refreshHealth();
  }

  refreshHealth(): void {
    this.isLoading = true;
    this.healthService.checkHealth()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (data) => {
          this.healthData = data;
          this.lastChecked = new Date();
        },
        error: (err) => {
          console.error('Health Check Failed', err);
          // Show error state if API is down
          this.healthData = {
            status: 'Unhealthy',
            totalDuration: 0,
            checkedAt: new Date(),
            results: []
          };
        }
      });
  }

  getStatusColor(status: string): string {
    return status === 'Healthy' ? 'text-success' : 'text-error';
  }

  // Returns color based on latency (ms)
  getDurationColor(ms: number): string {
    if (ms < 200) return 'text-success'; // Fast
    if (ms < 1000) return 'text-warning'; // Slow
    return 'text-error'; // Critical lag
  }

  // Choose icon based on the check name (Database vs System)
  getIcon(key: string): string {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('database') || lowerKey.includes('sql') || lowerKey.includes('db')) {
      return 'database';
    }
    return 'server';
  }

  downloadDbBackup(check: any): void {
    const dbName = check.data?.dbName;

    if (!dbName) {
      console.error('Database Name not found');
      return;
    }

    this.isDownloading[check.key] = true;

    this.healthService.downloadBackup(dbName).subscribe({
      next: (blob) => {
        // 1. Save the file
        saveFile(blob, `${dbName}_Backup.bak`);
        
        // 2. Stop the specific card spinner
        this.isDownloading[check.key] = false;

        // ✅ [ADDED] Trigger a fresh Health Check immediately
        // This re-runs the SQL query, finds the new backup date, and updates the UI
        this.refreshHealth();
      },
      error: (err) => {
        console.error('Download failed', err);
        this.isDownloading[check.key] = false;
      }
    });
  }
}