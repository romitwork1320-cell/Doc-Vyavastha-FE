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
  mode: 'login' | 'register' = 'login';
  registerType: 'client' | 'org' = 'client';
  isLoading: boolean = false;
  isGoogleSignup: boolean = false;
  errorMessage: string = '';
  
  // --- FORMS ---
  loginForm: FormGroup = this.fb.group({
     email: ['', [Validators.required, Validators.email]],
     otp: [''], // Will add validators when in otp mode
     password: [''],
     rememberMe: [true]
  });

  // --- OTP STATE ---
  otpMode = false;
  passwordMode = false;

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
      }

      if (email) {
        this.loginForm.patchValue({ email: email });
      }
    });

    // 3. Load External Scripts
    this.loadGoogleSignInScript();
    this.startSlider();
  }

  ngOnDestroy(): void {
    this.stopSlider(); 
  }

  ngAfterViewInit() {
    // Initial Render
    if (this.mode === 'login') {
        this.initializeGoogleSignIn();
    }
  }

  // --- RESIZE LISTENER ---
  // Ensures Google button stays aligned if device rotates or window resizes
  private resizeTimeout: any;

  @HostListener('window:resize')
  onResize() {
    if (this.mode === 'login') {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.initializeGoogleSignIn();
        }, 150);
    }
  }

  // ==========================================
  // AUTH LOGIC
  // ==========================================

  onSubmit() {
    if (this.loginForm.invalid) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    
    const email = this.loginForm.value.email;

    if (this.passwordMode) {
      const password = this.loginForm.value.password;
      this.authService.login(email, password, true)
        .pipe(finalize(() => this.isLoading = false))
        .subscribe({
          next: (res) => {
            if (res.success && res.data) {
               this.signalRService.startConnection();
            } else {
               this.errorMessage = res.message;
            }
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Invalid credentials';
          }
        });
    } else if (!this.otpMode) {
      // Send OTP
      this.authService.sendLoginOtp(email)
        .pipe(finalize(() => this.isLoading = false))
        .subscribe({
          next: (res) => {
            if (res.success) {
               this.otpMode = true;
               this.loginForm.get('otp')?.setValidators([Validators.required, Validators.minLength(6)]);
               this.loginForm.get('otp')?.updateValueAndValidity();
            } else {
               this.errorMessage = res.message;
            }
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Failed to send OTP';
          }
        });
    } else {
      // Verify OTP
      const otpCode = this.loginForm.value.otp;
      this.authService.verifyLoginOtp({ email, otpCode })
        .pipe(finalize(() => this.isLoading = false))
        .subscribe({
          next: (res) => {
            if (res.success && res.data) {
               this.signalRService.startConnection();
               // Routing is handled by authService.handleAuthResponse
            } else {
               this.errorMessage = res.message;
            }
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Invalid or expired OTP';
          }
        });
    }
  }

  togglePasswordMode() {
    this.passwordMode = !this.passwordMode;
    if (this.passwordMode) {
      this.otpMode = false;
      this.loginForm.get('otp')?.clearValidators();
      this.loginForm.get('otp')?.updateValueAndValidity();
      this.loginForm.patchValue({ otp: '' });
      this.loginForm.get('password')?.setValidators([Validators.required]);
      this.loginForm.get('password')?.updateValueAndValidity();
    } else {
      this.loginForm.get('password')?.clearValidators();
      this.loginForm.get('password')?.updateValueAndValidity();
      this.loginForm.patchValue({ password: '' });
    }
  }

  resetOtpMode() {
    this.otpMode = false;
    this.loginForm.get('otp')?.clearValidators();
    this.loginForm.get('otp')?.updateValueAndValidity();
    this.loginForm.patchValue({ otp: '' });
    this.errorMessage = '';
  }

  // ==========================================
  // UTILS
  // ==========================================

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
    if (this.mode !== 'login') return;

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
        if (!googleBtnElement || this.mode !== 'login') return;
        
        const formElement = document.querySelector('form');
        const formWidth = formElement ? formElement.clientWidth : 0;
        const parentWidth = googleBtnElement.parentElement?.clientWidth || 0;
        
        const containerWidth = formWidth > 0 ? formWidth : parentWidth;
        
        // If layout hasn't painted yet (width is 0), wait and retry
        if (containerWidth === 0 && attempts < 20) {
            setTimeout(() => tryRender(attempts + 1), 50);
            return;
        }

        let finalWidth = containerWidth > 0 ? containerWidth : 400;
        if (finalWidth > 400) finalWidth = 400; // Google's renderButton API accepts a maximum width of 400px
        
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
        if (apiResponse.success && apiResponse.data) {
           this.signalRService.startConnection();
        } else {
          this.errorMessage = apiResponse.message;
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Google login failed.';
      }
    });
  }
}