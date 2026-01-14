import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { ConnectionStatus, DataTransport } from '../../core/models/treadmill.models';

@Component({
  selector: 'app-connection-status-chip',
  standalone: true,
  imports: [MatChipsModule, MatIconModule],
  template: `
    <mat-chip
      [class.connected]="status === 'connected'"
      [class.connecting]="status === 'connecting'"
      [class.offline]="status === 'offline'"
      [class.disconnected]="status === 'disconnected'"
      [class.retry]="canRetry"
      [attr.role]="canRetry ? 'button' : null"
      [attr.tabindex]="canRetry ? 0 : null"
      (click)="handleRetry()"
      (keydown.enter)="handleRetry()"
      (keydown.space)="handleRetry()"
    >
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
  @Output() retry = new EventEmitter<void>();

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

  get canRetry(): boolean {
    return this.status === 'disconnected' && this.transport === 'polling';
  }

  handleRetry(): void {
    if (!this.canRetry) {
      return;
    }
    this.retry.emit();
  }
}
