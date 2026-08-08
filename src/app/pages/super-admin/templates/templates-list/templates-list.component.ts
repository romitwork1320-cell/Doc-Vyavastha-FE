import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TablerIconsModule } from 'angular-tabler-icons';

import { TemplateService, ApplicationType } from '../../../../services/template.service';
import { TemplateDialogComponent } from '../template-dialog/template-dialog.component';

@Component({
  selector: 'app-templates-list',
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
  templateUrl: './templates-list.component.html',
  styleUrls: ['./templates-list.component.scss']
})
export class TemplatesListComponent implements OnInit {
  templates: ApplicationType[] = [];
  dataSource = new MatTableDataSource<ApplicationType>([]);
  displayedColumns: string[] = ['name', 'description', 'documentCount', 'actions'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private templateService: TemplateService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadTemplates();
  }

  applySearch(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  loadTemplates() {
    this.templateService.getTemplatesAdmin().subscribe({
      next: (res) => {
        if (res.data) {
          this.templates = res.data;
          this.dataSource = new MatTableDataSource(this.templates);
          this.dataSource.paginator = this.paginator;
        }
      },
      error: (err) => {
        console.error('Error loading templates', err);
      }
    });
  }

  openCreateDialog() {
    const dialogRef = this.dialog.open(TemplateDialogComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTemplates();
      }
    });
  }

  openEditDialog(template: ApplicationType) {
    const dialogRef = this.dialog.open(TemplateDialogComponent, {
      width: '600px',
      data: template
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTemplates();
      }
    });
  }

  deleteTemplate(id: number) {
    if (confirm('Are you sure you want to delete this template?')) {
      this.templateService.deleteTemplate(id).subscribe({
        next: () => {
          this.loadTemplates();
        },
        error: (err) => {
          console.error('Error deleting template', err);
        }
      });
    }
  }
}
