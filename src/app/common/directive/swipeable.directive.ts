import { Directive, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[appSwipeable]',
  standalone: true
})
export class SwipeableDirective {
  
  @Output() swipeLeft = new EventEmitter<void>();
  @Output() swipeRight = new EventEmitter<void>();

  private swipeCoord?: [number, number];
  private swipeTime?: number;

  constructor() { }

  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent): void {
    this.swipeCoord = [e.changedTouches[0].clientX, e.changedTouches[0].clientY];
    this.swipeTime = new Date().getTime();
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(e: TouchEvent): void {
    const coord: [number, number] = [e.changedTouches[0].clientX, e.changedTouches[0].clientY];
    const time = new Date().getTime();

    if (this.swipeCoord && this.swipeTime && (time - this.swipeTime < 1000)) {
      const direction = [coord[0] - this.swipeCoord[0], coord[1] - this.swipeCoord[1]];
      const absX = Math.abs(direction[0]);
      const absY = Math.abs(direction[1]);

      // Check for horizontal swipe (X > 30px and X > 3x Y movement)
      if (absX > 30 && absX > absY * 3) {
        if (direction[0] < 0) {
          // Swipe Left -> Open
          this.swipeLeft.emit();
        } else {
          // Swipe Right -> Close
          this.swipeRight.emit();
        }
      }
    }
  }
}