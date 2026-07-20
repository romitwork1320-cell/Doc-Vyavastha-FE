import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApplicationFeeCollectionService, ApplicationFeeCollectionDto } from '../../services/application-fee-collection.service';
import { AuthService } from '../../services/auth.service';
import { UserService, User } from '../../services/user.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-form-fee-collections',
  standalone: true,
  imports: [CommonModule, FormsModule, TablerIconsModule],
  templateUrl: './form-fee-collections.component.html',
  styles: [`
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .summary-card { background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
    .summary-label { font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; }
    .summary-val { font-size: 24px; font-weight: 700; color: #0f172a; }
    .val-success { color: #22c55e; }
    .val-warning { color: #f59e0b; }
    
    .filter-bar { display: flex; gap: 16px; margin-bottom: 24px; background: #fff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; align-items: flex-end; }
    .filter-item { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .filter-item label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; }
    .filter-item select, .filter-item input { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; outline: none; }
    .filter-item select:focus, .filter-item input:focus { border-color: #6366f1; }
    
    .fee-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
    .fee-table th { background: #f8fafc; padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    .fee-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; }
    .fee-table tr:last-child td { border-bottom: none; }
    .fee-table th.text-right, .fee-table td.text-right { text-align: right; }
    
    .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status-pending { background: #fef3c7; color: #d97706; }
    .status-verified { background: #dcfce3; color: #16a34a; }
    
    .btn-verify { background: #16a34a; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .btn-verify:hover { background: #15803d; }
    .btn-filter { background: #6366f1; color: white; border: none; padding: 9px 16px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-filter:hover { background: #4f46e5; }
  `]
})
export class FormFeeCollectionsComponent implements OnInit {
  collections = signal<ApplicationFeeCollectionDto[]>([]);
  users = signal<User[]>([]);
  
  isLoading = true;
  isAdmin = false;
  
  filters = {
    staffId: '',
    status: '',
    startDate: '',
    endDate: '',
    pageIndex: 0
  };

  totalCollected = signal(0);
  totalPending = signal(0);
  totalVerified = signal(0);

  constructor(
    private collectionService: ApplicationFeeCollectionService,
    private userService: UserService,
    public authService: AuthService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const role = this.authService.getUserRole();
    this.isAdmin = role === 'Admin' || role === 'Super Admin';
    
    if (this.isAdmin) {
      this.loadUsers();
    }
    
    // Set default dates to today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    this.filters.startDate = todayStr;
    this.filters.endDate = todayStr;
    
    this.route.queryParams.subscribe(params => {
      if (params['status']) {
        this.filters.status = params['status'];
      }
    });
    
    this.authService.activeBranchId$.subscribe(branchId => {
      if (branchId) {
        this.loadData();
      }
    });
  }

  loadUsers() {
    this.userService.getUsers({ pageIndex: 0, pageSize: 1000 }).subscribe(res => {
      console.log('USERS RESPONSE:', res);
      if (res.success && res.data) {
        this.users.set(res.data);
      }
    });
  }

  loadData() {
    this.isLoading = true;
    this.collectionService.listCollections(this.filters).subscribe(res => {
      if (res.success && res.data) {
        this.collections.set(res.data);
        this.calculateSummaries(res.data);
      }
      this.isLoading = false;
    });
  }

  calculateSummaries(data: ApplicationFeeCollectionDto[]) {
    let collected = 0;
    let pending = 0;
    let verified = 0;
    
    data.forEach(c => {
      collected += c.collegeFeeAmount;
      if (c.adminVerificationStatus === 'Pending') {
        pending += c.collegeFeeAmount;
      } else if (c.adminVerificationStatus === 'Verified') {
        verified += c.collegeFeeAmount;
      }
    });
    
    this.totalCollected.set(collected);
    this.totalPending.set(pending);
    this.totalVerified.set(verified);
  }

  verifyCollection(c: ApplicationFeeCollectionDto) {
    if (!confirm('Are you sure you have received and verified this payment?')) return;
    
    const updateDto = {
      status: 'Verified',
      remarks: 'Verified by Admin', // basic placeholder, can be extended to open a dialog if needed
    };
    this.collectionService.updateStatus(c.id, updateDto).subscribe(res => {
      if (res.success) {
        this.snackBar.open('Status updated successfully', 'Close', { duration: 3000 });
        this.loadData();
      } else {
        this.snackBar.open('Error verifying collection', 'Close', { duration: 3000 });
      }
    });
  }

  filterByPending() {
    this.filters.status = 'Pending';
    this.loadData();
  }
}
