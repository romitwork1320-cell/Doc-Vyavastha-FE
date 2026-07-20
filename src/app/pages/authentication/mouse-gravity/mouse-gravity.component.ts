import { Component, ElementRef, HostListener, AfterViewInit, ViewChild, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mouse-gravity',
  standalone: true,
  imports: [CommonModule],
  template: `
    <canvas #canvas class="gravity-canvas"></canvas>
  `,
  styles: [`
    .gravity-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0; 
      pointer-events: none; 
    }
  `]
})
export class AppMouseGravityComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private ctx!: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationFrameId: number = 0;
  private mouse = { x: -1000, y: -1000 };
  private width = 0;
  private height = 0;

  // Config Tweaks for Better Look
  private particleCount = 90; // Increased count
  private connectionDistance = 140; // Longer lines
  private mouseDistance = 250; // Stronger gravity range
  
  // Softer Colors (Blues/Purples)
  private colors = ['#a5b4fc', '#818cf8', '#c4b5fd', '#6366f1'];

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.initCanvas();
    this.createParticles();
    this.zone.runOutsideAngular(() => {
      this.animate();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationFrameId);
  }

  @HostListener('window:resize')
  onResize() {
    this.initCanvas();
    this.createParticles();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.mouse.x = event.clientX - rect.left;
    this.mouse.y = event.clientY - rect.top;
  }

  private initCanvas() {
    const canvas = this.canvasRef.nativeElement;
    // Ensure we get the full dimensions of the container
    this.width = canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
    this.height = canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;
    this.ctx = canvas.getContext('2d')!;
  }

  private createParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(new Particle(this.width, this.height, this.colors));
    }
  }

  private animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    this.particles.forEach(particle => {
      particle.update(this.mouse, this.mouseDistance);
      particle.draw(this.ctx);
    });

    this.drawConnections();

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  private drawConnections() {
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.connectionDistance) {
          this.ctx.beginPath();
          // Softer line color
          this.ctx.strokeStyle = `rgba(165, 180, 252, ${1 - distance / this.connectionDistance})`;
          this.ctx.lineWidth = 1;
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.stroke();
        }
      }
    }
  }
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  baseX: number;
  baseY: number;
  
  constructor(width: number, height: number, colors: string[]) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * 0.8; // Slower movement
    this.vy = (Math.random() - 0.5) * 0.8;
    this.size = Math.random() * 2 + 1;
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.baseX = this.x;
    this.baseY = this.y;
  }

  update(mouse: {x: number, y: number}, mouseRadius: number) {
    this.x += this.vx;
    this.y += this.vy;

    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < mouseRadius) {
        const forceDirectionX = dx / distance;
        const forceDirectionY = dy / distance;
        const force = (mouseRadius - distance) / mouseRadius;
        // Gentle repulsion/attraction mix
        const directionX = forceDirectionX * force * 1.5; 
        const directionY = forceDirectionY * force * 1.5;

        this.x += directionX;
        this.y += directionY;
    }

    if (this.x < 0 || this.x > window.innerWidth) this.vx *= -1;
    if (this.y < 0 || this.y > window.innerHeight) this.vy *= -1;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}