import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-label">{{ label }}</span>
        <mat-icon *ngIf="icon">{{ icon }}</mat-icon>
      </div>
      <div class="metric-value">{{ value }} <span>{{ unit }}</span></div>
      <div class="metric-sub" *ngIf="subtext">{{ subtext }}</div>
    </div>
  `,
  styleUrls: ['./metric-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetricCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() unit = '';
  @Input() icon = '';
  @Input() subtext = '';
}
