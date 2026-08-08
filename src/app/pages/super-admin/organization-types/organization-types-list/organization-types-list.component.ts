import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TablerIconsModule } from 'angular-tabler-icons';

import { OrganizationTypeService, OrganizationType } from '../../../../services/organization-type.service';
import { OrganizationTypeDialogComponent } from '../organization-type-dialog/organization-type-dialog.component';

@Component({
  selector: 'app-organization-types-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    TablerIconsModule
  ],
  templateUrl: './organization-types-list.component.html',
  styleUrls: ['./organization-types-list.component.scss']
})
export class OrganizationTypesListComponent implements OnInit {
  organizationTypes: OrganizationType[] = [];
  dataSource = new MatTableDataSource<OrganizationType>([]);
  displayedColumns: string[] = ['name', 'description', 'actions'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private orgTypeService: OrganizationTypeService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadOrganizationTypes();
  }

  applySearch(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  loadOrganizationTypes() {
    this.orgTypeService.listOrganizationTypes().subscribe({
      next: (res) => {
        if (res.data) {
          this.organizationTypes = res.data;
          this.dataSource = new MatTableDataSource(this.organizationTypes);
          this.dataSource.paginator = this.paginator;
        }
      },
      error: (err) => {
        console.error('Error loading organization types', err);
      }
    });
  }

  openCreateDialog() {
    const dialogRef = this.dialog.open(OrganizationTypeDialogComponent, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadOrganizationTypes();
      }
    });
  }

  openEditDialog(orgType: OrganizationType) {
    const dialogRef = this.dialog.open(OrganizationTypeDialogComponent, {
      width: '400px',
      data: orgType
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadOrganizationTypes();
      }
    });
  }

  deleteOrganizationType(id: number) {
    if (confirm('Are you sure you want to delete this organization type?')) {
      this.orgTypeService.deleteOrganizationType(id).subscribe({
        next: () => {
          this.loadOrganizationTypes();
        },
        error: (err) => {
          console.error('Error deleting organization type', err);
        }
      });
    }
  }
}
