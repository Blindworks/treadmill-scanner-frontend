import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-running-mode-toggle',
  standalone: true,
  imports: [MatSlideToggleModule],
  template: `
    <mat-slide-toggle
      [checked]="enabled"
      (change)="toggle.emit($event.checked)"
    >
      Running Mode
    </mat-slide-toggle>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RunningModeToggleComponent {
  @Input() enabled = false;
  @Output() toggle = new EventEmitter<boolean>();
}
