import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { QRCodeModule } from 'angularx-qrcode';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatRippleModule } from '@angular/material/core';
import { ProfileService } from 'src/app/services/profile.service';

@Component({
  selector: 'app-qr-code-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, QRCodeModule, TablerIconsModule, MatRippleModule],
  templateUrl: './qr-code-dialog.component.html',
  styleUrls: ['./qr-code-dialog.component.scss']
})
export class QrCodeDialogComponent implements OnInit {
  companyName: string = 'Scan for Support'; // Default title

  constructor(
    public dialogRef: MatDialogRef<QrCodeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { url: string },
    private clipboard: Clipboard,
    private snackBar: MatSnackBar,
    private profileService: ProfileService
  ) {}

  ngOnInit(): void {
    // Fetch Company Name immediately to show on the dialog UI
    this.profileService.getProfile().subscribe({
      next: (res) => {
        if (res.data?.companyProfile?.companyName) {
          this.companyName = res.data.companyProfile.companyName;
        }
      }
    });
  }

  copyLink() {
    if (this.clipboard.copy(this.data.url)) {
      this.snackBar.open('Link copied!', 'Close', { duration: 2000, panelClass: 'success-snackbar' });
    }
  }

  downloadQrImage() {
    this.generateCanvas(this.companyName);
  }

  private generateCanvas(headerText: string) {
    const container = document.getElementById('qr-container');
    const canvasElement = container?.querySelector('canvas');
    const imgElement = container?.querySelector('img');

    let qrSource = '';
    if (canvasElement) qrSource = canvasElement.toDataURL('image/png');
    else if (imgElement) qrSource = imgElement.src;
    else return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- Dynamic Sizing Logic ---
    const qrSize = 240;
    const padding = 40;
    const canvasWidth = qrSize + (padding * 2); 
    
    // Header Text Wrapping Calculation
    ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
    const words = headerText.split(' ');
    let line = '';
    const lines = [];
    
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > (canvasWidth - 40) && n > 0) {
        lines.push(line);
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    // Calculate dynamic height based on text lines
    const lineHeight = 28;
    const headerHeight = (lines.length * lineHeight) + 20; 
    const footerHeight = 80;

    canvas.width = canvasWidth;
    canvas.height = 40 + headerHeight + qrSize + footerHeight; // 40 is top padding

    // --- Drawing ---
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header Text
    ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#2a3547';
    ctx.textAlign = 'center';
    
    let textY = 40;
    lines.forEach(l => {
      ctx.fillText(l, canvas.width / 2, textY);
      textY += lineHeight;
    });

    // QR Image
    const img = new Image();
    img.src = qrSource;
    img.onload = () => {
      const qrY = textY + 10;
      ctx.drawImage(img, padding, qrY, qrSize, qrSize);

      // Footer Text
      const footerY = qrY + qrSize + 35;
      ctx.font = 'normal 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#7c8fac';
      ctx.fillText('Scan to open request form', canvas.width / 2, footerY);

      ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif'; 
      ctx.fillStyle = '#635bff';
      ctx.fillText('Powered by Replezy', canvas.width / 2, footerY + 24);

      // Download
      const link = document.createElement('a');
      link.download = `Support_QR.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      this.snackBar.open('QR Image downloaded!', 'Close', { duration: 2000, panelClass: 'success-snackbar' });
    };
  }
}