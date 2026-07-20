import { Injectable, inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class ApiNotificationInterceptor implements HttpInterceptor {

  private snackBar = inject(MatSnackBar);

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      tap((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          const body = event.body;
          
          if (body) {
            // 1. Handle Logical Errors (Backend returns HTTP 200 but success = false)
            if (body.success === false && body.message) {
              this.snackBar.open(body.message, 'Close', {
                duration: 4000,
                horizontalPosition: 'right',
                verticalPosition: 'top',
                panelClass: ['error-snackbar']
              });
            }
            // 2. Handle Success Messages
            else if (body.success === true && body.message && typeof body.message === 'string') {
              // Only automatically show success messages for create/update/delete actions
              const isMutatingRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method.toUpperCase());
              
              if (isMutatingRequest && body.message.trim() !== '' && body.message !== 'Success') {
                this.snackBar.open(body.message, 'Close', {
                  duration: 3000,
                  horizontalPosition: 'right',
                  verticalPosition: 'top',
                  panelClass: ['success-snackbar']
                });
              }
            }
          }
        }
      }),
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An error occurred';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        this.snackBar.open(errorMessage, 'Close', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        
        return throwError(() => error);
      })
    );
  }
}
