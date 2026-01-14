import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { ConnectionStatus, DataTransport } from '../../core/models/treadmill.models';

@Component({
  selector: 'app-connection-status-chip',
  standalone: true,
  imports: [MatChipsModule, MatIconModule],
  template: `
    <mat-chip [class.connected]="status === 'connected'">
      <mat-icon>{{ icon }}</mat-icon>
      {{ label }}
      <span class="transport" *ngIf="transport">{{ transport }}</span>
    </mat-chip>
  `,
  styleUrls: ['./connection-status-chip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConnectionStatusChipComponent {
  @Input({ required: true }) status!: ConnectionStatus;
  @Input() transport: DataTransport | null = null;

  get label(): string {
    switch (this.status) {
      case 'connected':
        return 'Online';
      case 'connecting':
        return 'Verbinde…';
      case 'offline':
        return 'Offline';
      default:
        return 'Getrennt';
    }
  }

  get icon(): string {
    switch (this.status) {
      case 'connected':
        return 'wifi';
      case 'offline':
        return 'wifi_off';
      case 'connecting':
        return 'sync';
      default:
        return 'cloud_off';
    }
  }
}
