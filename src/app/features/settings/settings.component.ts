import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { toSignal } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { TreadmillDataService } from '../../core/services/treadmill-data.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  template: `
    <section class="settings">
      <mat-card>
        <h2>Settings</h2>
        <p class="subtitle">Backend- und Anzeigeeinstellungen.</p>

        <div class="settings-grid">
          <mat-form-field appearance="outline">
            <mat-label>API Base URL</mat-label>
            <input matInput [value]="apiBaseUrl" readonly />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Transport</mat-label>
            <input
              matInput
              [value]="connectionState().transport.toUpperCase()"
              readonly
            />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Polling Interval</mat-label>
            <input
              matInput
              type="number"
              [value]="pollingInterval"
              (change)="updateInterval(($event.target as HTMLInputElement).value)"
            />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Units</mat-label>
            <mat-select>
              <mat-option value="kmh">km/h</mat-option>
              <mat-option value="mph">mph</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </mat-card>
    </section>
  `,
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent {
  readonly apiBaseUrl = environment.apiBaseUrl;
  readonly connectionState = toSignal(this.treadmillService.connection$, {
    initialValue: {
      status: 'connecting',
      transport: 'sse',
      retryInSeconds: null
    }
  });
  pollingInterval = 1000;

  constructor(private treadmillService: TreadmillDataService) {}

  updateInterval(value: string): void {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return;
    }
    this.pollingInterval = parsed;
    this.treadmillService.setPollingInterval(parsed);
  }
}
