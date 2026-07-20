import { Component, NgZone, OnDestroy, OnInit, ElementRef, ViewChildren, QueryList, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

// Material Imports
import { MaterialModule } from '../../../material.module';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Services
import { AuthService } from 'src/app/services/auth.service';
import { finalize } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { SignalRService } from 'src/app/services/signalr.service';

declare const google: any;

interface Slide {
  title: string;
  description: string;
  image: string;
  backgroundColor: string;
}

@Component({
  selector: 'app-boxed-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule, 
    MatProgressSpinnerModule
  ],
  templateUrl: './boxed-login.component.html',
  styleUrls: ['./boxed-login.component.scss']
})
export class AppBoxedLoginComponent implements OnInit, OnDestroy, AfterViewInit {
  // --- STATE MANAGEMENT ---
  currentStep: number = 1; 
  isLoading: boolean = false;
  errorMessage: string = '';
  
  // --- FORMS ---
  // Initialize with empty groups to prevent "undefined" errors in HTML
  emailForm: FormGroup = this.fb.group({
     email: ['', [Validators.required, Validators.email]]
  });
  
  profileForm: FormGroup = this.fb.group({
     firstName: ['', Validators.required],
     lastName: ['', Validators.required],
     companyName: ['', Validators.required],
     mobileNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]]
  });

  // --- OTP STATE ---
  otpDigits: string[] = ['', '', '', '', '', '']; 
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef>;
  resendTimer: number = 300; 
  resendInterval: any;
  userEmail: string = '';

  // --- SLIDER STATE ---
  currentSlideIndex = 0;
  slideInterval: any;
  slides: Slide[] = [
    {
      title: 'Sales Pipeline Management',
      description: 'Track every deal from lead generation to successfully closing, all in one intuitive kanban view.',
      backgroundColor: '#eef2ff',
      image: 'assets/images/login/1.png' 
    },
    {
      title: 'Activity Tracking',
      description: 'Log calls, emails, and meetings effortlessly to keep your entire sales team in sync.',
      backgroundColor: '#ecfdf5',
      image: 'assets/images/login/2.png'
    },
    {
      title: 'Campaign Analytics',
      description: 'Gain powerful insights into email campaigns, open rates, and conversion metrics.',
      backgroundColor: '#fff7ed',
      image: 'assets/images/login/3.png'
    },
    {
      title: 'Team Collaboration',
      description: 'Empower your agents to collaborate effectively and manage their daily tasks seamlessly.',
      backgroundColor: '#f5f3ff',
      image: 'assets/images/login/4.png'
    }
  ];

  isInviteFlow: boolean = false;
  inviteToken: string | null = null;
  invitedCompanyName: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private zone: NgZone,
    private signalRService: SignalRService
  ) {}

  ngOnInit(): void {
    // 1. Check Login Status
    if (this.authService.getAccessToken()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // 2. CHECK FOR INVITATION PARAMS
    this.route.queryParams.subscribe(params => {
      const email = params['email'];
      const token = params['token']; // or 'inviteId'

      if (token) {
        this.isInviteFlow = true;
        this.inviteToken = token;
        
        // If it's an invite, the Company Name is irrelevant (they are joining one), 
        // so we remove the validator or set a dummy value to keep the form valid.
        this.profileForm.get('companyName')?.clearValidators();
        this.profileForm.get('companyName')?.updateValueAndValidity();
      }

      if (email) {
        // Pre-fill email and disable the input if you don't want them changing it
        this.emailForm.patchValue({ email: email });
        
        // Optional: specific logic if you want to lock the email field
        // this.emailForm.get('email')?.disable(); 
      }
    });

    // 3. Load External Scripts
    this.loadGoogleSignInScript();
    this.startSlider();
  }

  ngOnDestroy(): void {
    this.stopSlider(); 
    this.stopResendTimer();
  }

  ngAfterViewInit() {
    // Initial Render
    if (this.currentStep === 1) {
        this.initializeGoogleSignIn();
    }
  }

  // --- RESIZE LISTENER ---
  // Ensures Google button stays aligned if device rotates or window resizes
  private resizeTimeout: any;

  @HostListener('window:resize')
  onResize() {
    if (this.currentStep === 1) {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.initializeGoogleSignIn();
        }, 150);
    }
  }

  // ==========================================
  // STEP 1: SEND OTP
  // ==========================================
  onSendOtp() {
    if (this.emailForm.invalid) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    this.userEmail = this.emailForm.get('email')?.value;

    this.authService.sendLoginOtp(this.userEmail)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.currentStep = 2;
            this.startResendTimer();
            // Focus first OTP input after view updates
            setTimeout(() => {
                if(this.otpInputs && this.otpInputs.first) {
                    this.otpInputs.first.nativeElement.focus();
                }
            }, 100);
          } else {
            this.errorMessage = res.message;
          }
        },
        error: (err) => this.errorMessage = err.error?.message || 'Failed to send OTP'
      });
  }

  // ==========================================
  // STEP 2: VERIFY OTP
  // ==========================================

  onOtpInput(event: any, index: number) {
    const input = event.target;
    const value = input.value;

    // Allow only numbers
    if (!/^[0-9]$/.test(value) && value !== '') {
      this.otpDigits[index] = '';
      input.value = '';
      return;
    }

    this.otpDigits[index] = value;

    // Move to next input if value exists
    if (value && index < 5) {
      this.otpInputs.toArray()[index + 1].nativeElement.focus();
    }
  }

  onOtpKeyDown(event: KeyboardEvent, index: number) {
    // Move to previous input on Backspace if current is empty
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      this.otpInputs.toArray()[index - 1].nativeElement.focus();
    }
  }

  onVerifyOtp() {
    const otpCode = this.otpDigits.join('');
    if (otpCode.length < 6) {
      this.errorMessage = "Please enter the complete 6-digit code.";
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.verifyLoginOtp({ email: this.userEmail, otpCode })
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            if (res.data.isNewUser) {
              this.currentStep = 3;
            } 
            this.signalRService.startConnection();
          } else {
            this.errorMessage = res.message;
          }
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Invalid OTP';
          this.otpDigits = ['', '', '', '', '', ''];
        }
      });
  }

  resendOtp() {
    this.otpDigits = ['', '', '', '', '', ''];
    this.onSendOtp();
  }

  goBackToEmail() {
    this.currentStep = 1;
    this.stopResendTimer();
    this.errorMessage = '';
    this.otpDigits = ['', '', '', '', '', ''];
    
    // ✨ FIX: Re-initialize Google Button when going back
    // We wait 100ms to let *ngIf="currentStep === 1" render the div
    this.initializeGoogleSignIn();
  }

  // ==========================================
  // STEP 3: COMPLETE PROFILE
  // ==========================================
  onCompleteProfile() {
    if (this.profileForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const payload: any = {
      email: this.userEmail,
      firstName: this.profileForm.get('firstName')?.value,
      lastName: this.profileForm.get('lastName')?.value,
      mobileNumber: this.profileForm.get('mobileNumber')?.value
    };

    // If it's NOT an invite flow, we send the company name
    if (!this.isInviteFlow) {
        payload.companyName = this.profileForm.get('companyName')?.value;
    } else {
        // If it IS an invite flow, pass the token so backend links them to the right team
        payload.inviteToken = this.inviteToken;
    }

    // You might need a specific service method for accepting invites, 
    // or update 'completeUserProfile' to handle the 'inviteToken'
    this.authService.completeUserProfile(payload)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (res) => {
          if (!res.success) {
            this.errorMessage = res.message;
          }
          // Success logic here (redirect to dashboard)
        },
        error: (err) => this.errorMessage = err.error?.message || 'Failed to update profile'
      });
  }

  // ==========================================
  // UTILS
  // ==========================================

  startResendTimer() {
    this.resendTimer = 300; 
    this.stopResendTimer();
    this.resendInterval = setInterval(() => {
      if (this.resendTimer > 0) {
        this.resendTimer--;
      } else {
        this.stopResendTimer();
      }
    }, 1000);
  }

  stopResendTimer() {
    if (this.resendInterval) clearInterval(this.resendInterval);
  }

  get formattedTimer() {
    const minutes = Math.floor(this.resendTimer / 60);
    const seconds = this.resendTimer % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  startSlider() {
    this.slideInterval = setInterval(() => {
      this.nextSlide();
    }, 5000); 
  }

  stopSlider() {
    if (this.slideInterval) clearInterval(this.slideInterval);
  }

  nextSlide() {
    this.currentSlideIndex = (this.currentSlideIndex + 1) % this.slides.length;
  }

  goToSlide(index: number) {
    this.stopSlider(); 
    this.currentSlideIndex = index;
    this.startSlider(); 
  }

  private loadGoogleSignInScript(): void {
    if (document.getElementById('google-signin-script')) {
      setTimeout(() => this.initializeGoogleSignIn(), 50);
      return;
    }
    
    const script = document.createElement('script');
    script.id = 'google-signin-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => this.zone.run(() => this.initializeGoogleSignIn());
    document.body.appendChild(script);
  }
  
  private initializeGoogleSignIn(): void {
    // 1. Safety Check: Is Google Library loaded?
    if (typeof google === 'undefined' || !google.accounts?.id) {
        // Retry shortly if library is still loading
        setTimeout(() => this.initializeGoogleSignIn(), 200);
        return;
    }

    // 2. Safety Check: Are we on the right step?
    if (this.currentStep !== 1) return;

    // 3. Initialize Config (Required every time we re-render)
    google.accounts.id.initialize({
      client_id: '111899420643-ismd8b48ech4lsdm76i2hedfe45f8qgv.apps.googleusercontent.com', 
      callback: (response: any) => this.zone.run(() => this.onGoogleSignInSuccess(response)),
      auto_select: false
    });

    // 4. Render Button
    // Use a retry mechanism to ensure CSS layout is fully settled before measuring width
    const tryRender = (attempts: number = 0) => {
        const googleBtnElement = document.getElementById('google-btn');
        if (!googleBtnElement || this.currentStep !== 1) return;
        
        const formElement = document.querySelector('form');
        const formWidth = formElement ? formElement.clientWidth : 0;
        const parentWidth = googleBtnElement.parentElement?.clientWidth || 0;
        
        const containerWidth = formWidth > 0 ? formWidth : parentWidth;
        
        // If layout hasn't painted yet (width is 0), wait and retry
        if (containerWidth === 0 && attempts < 20) {
            setTimeout(() => tryRender(attempts + 1), 50);
            return;
        }

        const finalWidth = containerWidth > 0 ? containerWidth : 400;
        
        // Prevent unnecessary re-renders if the width is already perfectly matching
        const currentIframe = googleBtnElement.querySelector('iframe');
        if (currentIframe && currentIframe.style.width === finalWidth.toString() + 'px') {
            return; 
        }
        
        googleBtnElement.innerHTML = '';
        google.accounts.id.renderButton(googleBtnElement, {
            theme: 'outline',
            size: 'large',
            width: finalWidth.toString(), 
            type: 'standard',
            text: 'continue_with', 
        }); 
    };

    setTimeout(() => tryRender(0), 50);
  }

  onGoogleSignInSuccess(response: any): void {
    if (!response.credential) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    const rememberMe = true; 
    
    this.authService.loginWithGoogle(response.credential, rememberMe)
    .pipe(finalize(() => this.isLoading = false))
    .subscribe({
      next: (apiResponse) => {
        const data = apiResponse.data;
        
        if (apiResponse.success && data) {
          
          // 1. Is this a new/incomplete user? (Service returns early for this case)
          if (data.isNewUser || !data.isProfileComplete) {
             const googleToken: any = jwtDecode(response.credential);
             this.userEmail = googleToken.email;
             
             this.profileForm.patchValue({
               firstName: googleToken.given_name || '',
               lastName: googleToken.family_name || ''
             });

             this.currentStep = 3;
             return; 
          }

          this.signalRService.startConnection();

          // 2. Standard Login
          // ✅ FIX: We do NOT navigate here. We let AuthService.handleLoginResponse 
          // (which ran inside the pipe) handle the session storage and redirection.
          
          if (data.requiresSelection) {
             // Exception: Workspace selection is a UI state, so we handle it here if needed,
             // but usually AuthService handles the redirect to /workspace-selection too.
             // If your AuthService redirects, you don't need this block either.
             // But keeping it harmless if the Service logic matches.
          } 
          
          // 🛑 REMOVED: this.router.navigate(['/replacements']); 
          // This line was causing the bug.
        } else {
          this.errorMessage = apiResponse.message;
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Google login failed.';
      }
    });
  }

  onOtpPaste(event: ClipboardEvent) {
    event.preventDefault();
    const clipboardData = event.clipboardData || (window as any).clipboardData;
    const pastedText = clipboardData.getData('text').trim();

    // Check if it's a number
    if (/^\d+$/.test(pastedText)) {
      const digits = pastedText.split('').slice(0, 6); // Take first 6 digits
      
      // ✨ FIX: Added ': string' and ': number' types here
      digits.forEach((digit: string, index: number) => {
        if (index < 6) this.otpDigits[index] = digit;
      });

      // Focus the last filled input or the next empty one
      const focusIndex = Math.min(digits.length, 5);
      setTimeout(() => {
          if (this.otpInputs && this.otpInputs.toArray()[focusIndex]) {
            this.otpInputs.toArray()[focusIndex].nativeElement.focus();
          }
          // Optional: Trigger verify automatically if full code pasted
          if (digits.length === 6) this.onVerifyOtp();
      }, 50);
    }
  }
}