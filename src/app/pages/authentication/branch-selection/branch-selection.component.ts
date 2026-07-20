import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from 'src/app/services/auth.service';
import { MaterialModule } from 'src/app/material.module'; 

@Component({
  selector: 'app-branch-selection',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule],
  templateUrl: './branch-selection.component.html',
  styleUrls: ['./branch-selection.component.scss']
})
export class BranchSelectionComponent implements OnInit {
  branches: any[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(private router: Router, private authService: AuthService) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { branches: any[] };
    
    if (state?.branches) {
      this.branches = state.branches;
    } else {
      // If state is lost (refresh), try to fetch again or redirect
      this.authService.getUserBranches().subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.branches = res.data;
          } else {
            this.router.navigate(['/login']);
          }
        },
        error: () => this.router.navigate(['/login'])
      });
    }
  }

  ngOnInit(): void {}

  selectBranch(branch: any): void {
    if (branch.status !== 'Active') return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.setActiveBranch(branch.id);
    this.router.navigate(['/dashboard']);
  }
}
