import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject } from 'rxjs'; 
import { environment } from '../environments/environments';
import { AuthService } from './auth.service';

export interface ChatMessageDto {
  ticketId: number;
  message: string;
  isAdminReply: boolean;
  createdOn: string;
  attachmentUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubUrl = environment.apiUrl + '/supportHub';
  private hubConnection!: signalR.HubConnection;
  private currentTicketId: number | null = null;

  public messageReceived$ = new BehaviorSubject<ChatMessageDto | null>(null);
  public listRefreshRequired$ = new BehaviorSubject<boolean>(false);
  public notificationReceived$ = new Subject<any>(); 
  public connectionRestored$ = new Subject<boolean>(); 

  constructor(private authService: AuthService) { }

  public startConnection = () => {
    if (this.hubConnection) {
      return;
    }

    const currentToken = this.authService.getAccessToken();

    if (!currentToken) {
      console.warn('SIGNALR ABORT: No token found. Delaying connection...');
      return; 
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        // ✨ FIX 1: Stop fighting the Interceptor! Just grab whatever token is currently active.
        accessTokenFactory: () => this.authService.getAccessToken() || ''
      })
      .withAutomaticReconnect() 
      .build();

    // ✨ FIX 2: Smart Startup that WAITS for your Interceptor to fix 401s
    const attemptStart = () => {
      this.hubConnection.start()
        .then(() => {
          this.addListeners();
          this.connectionRestored$.next(true);
        })
        .catch(err => {
          console.error('❌ SignalR Start Error: ', err);
          
          const errorString = err.toString();
          // If we hit a 401 (or the Interceptor's fake error), wait for the refresh to finish!
          if (errorString.includes('401') || errorString.includes('no longer active')) {
            console.warn('SIGNALR: Caught 401. Waiting 2 seconds for Interceptor to secure a new token, then retrying...');
            setTimeout(() => attemptStart(), 2000);
          }
        });
    };

    // Kick off the first connection attempt
    attemptStart();

    this.hubConnection.onreconnected(() => {
      if (this.currentTicketId) {
          this.hubConnection.invoke('JoinTicketGroup', this.currentTicketId)
              .catch(err => console.error('Failed to rejoin ticket group', err));
      }
      this.listRefreshRequired$.next(true);
      this.connectionRestored$.next(true);
    });

    this.hubConnection.onclose(() => {
       console.warn('❌ SignalR Connection closed permanently due to long idle. Attempting manual restart in 5s...');
       (this.hubConnection as any) = undefined;
       setTimeout(() => {
           if (this.authService.getAccessToken()) {
               this.startConnection();
           }
       }, 5000);
    });
  }

  public stopConnection = () => {
    if (this.hubConnection) {
      this.hubConnection.stop();
      (this.hubConnection as any) = undefined; 
    }
  }

  private addListeners() {
    this.hubConnection.off('ReceiveMessage');
    this.hubConnection.off('RefreshList');
    this.hubConnection.off('ReceiveNotification');
    this.hubConnection.off('ReceiveAdminNotification');

    this.hubConnection.on('ReceiveMessage', (data: ChatMessageDto) => {
      this.messageReceived$.next(data);
    });

    this.hubConnection.on('RefreshList', () => {
      this.listRefreshRequired$.next(true);
    });

    this.hubConnection.on('ReceiveNotification', (data: any) => {
      this.notificationReceived$.next(data);
    });

    this.hubConnection.on('ReceiveAdminNotification', (data: any) => {
      this.notificationReceived$.next(data);
    });
  }

  public joinTicketGroup(ticketId: number) {
    this.currentTicketId = ticketId; 

    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('JoinTicketGroup', ticketId);
    } else {
      setTimeout(() => this.joinTicketGroup(ticketId), 1000);
    }
  }

  public leaveTicketGroup(ticketId: number) {
    this.currentTicketId = null; 

    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('LeaveTicketGroup', ticketId);
    }
  }
}