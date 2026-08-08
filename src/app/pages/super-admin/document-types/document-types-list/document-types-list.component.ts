import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TablerIconsModule } from 'angular-tabler-icons';

import { TemplateService, DocumentType } from '../../../../services/template.service';
import { DocumentTypeDialogComponent } from '../document-type-dialog/document-type-dialog.component';

@Component({
  selector: 'app-document-types-list',
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
  templateUrl: './document-types-list.component.html',
  styleUrls: ['./document-types-list.component.scss']
})
export class DocumentTypesListComponent implements OnInit {
  documentTypes: DocumentType[] = [];
  dataSource = new MatTableDataSource<DocumentType>([]);
  displayedColumns: string[] = ['name', 'description', 'actions'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private templateService: TemplateService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadDocumentTypes();
  }

  applySearch(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  loadDocumentTypes() {
    this.templateService.getDocumentTypes().subscribe({
      next: (res) => {
        if (res.data) {
          this.documentTypes = res.data;
          this.dataSource = new MatTableDataSource(this.documentTypes);
          this.dataSource.paginator = this.paginator;
        }
      },
      error: (err) => {
        console.error('Error loading document types', err);
      }
    });
  }

  openCreateDialog() {
    const dialogRef = this.dialog.open(DocumentTypeDialogComponent, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDocumentTypes();
      }
    });
  }

  openEditDialog(docType: DocumentType) {
    const dialogRef = this.dialog.open(DocumentTypeDialogComponent, {
      width: '400px',
      data: docType
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDocumentTypes();
      }
    });
  }

  deleteDocumentType(id: number) {
    if (confirm('Are you sure you want to delete this document type? It will be removed from all application templates that use it.')) {
      this.templateService.deleteDocumentType(id).subscribe({
        next: () => {
          this.loadDocumentTypes();
        },
        error: (err) => {
          console.error('Error deleting document type', err);
        }
      });
    }
  }
}
