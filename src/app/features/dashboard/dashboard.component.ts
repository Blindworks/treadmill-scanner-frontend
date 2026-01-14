import {
  ChangeDetectionStrategy,
  Component,
  effect,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ChartConfiguration } from 'chart.js';
import { toSignal } from '@angular/core/rxjs-interop';
import { TreadmillDataService } from '../../core/services/treadmill-data.service';
import { SessionStateService } from '../../core/services/session-state.service';
import {
  ConnectionStatus,
  TreadmillSample
} from '../../core/models/treadmill.models';
import { MetricCardComponent } from '../../shared/components/metric-card.component';
import { MiniChartComponent } from '../../shared/components/mini-chart.component';

const HISTORY_LIMIT = 600;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSnackBarModule,
    MetricCardComponent,
    MiniChartComponent
  ],
  template: `
    <section class="dashboard">
      <div class="status-row">
        <div>
          <h2>Live Dashboard</h2>
          <p class="subtitle">
            Echtzeitwerte vom Laufband – optimiert für Sichtbarkeit in Bewegung.
          </p>
        </div>
        <div class="session-info">
          <span class="session-pill">{{ sessionStateLabel() }}</span>
          <span class="timestamp">Letztes Update: {{ lastTimestamp() }}</span>
        </div>
      </div>

      <div class="grid grid-3">
        <app-metric-card
          label="Speed"
          [value]="formatNumber(currentSample()?.speed)"
          unit="km/h"
          icon="speed"
          [subtext]="rollingAverage() + ' Ø (30s)'"
        />
        <app-metric-card
          label="Incline"
          [value]="formatNumber(currentSample()?.incline)"
          unit="%"
          icon="trending_up"
        />
        <app-metric-card
          label="Distance"
          [value]="formatNumber(currentSample()?.distance)"
          unit="km"
          icon="route"
        />
        <app-metric-card
          label="Pace"
          [value]="paceDisplay()"
          unit="min/km"
          icon="timer"
        />
        <app-metric-card
          label="Time"
          [value]="sessionDuration()"
          unit=""
          icon="schedule"
        />
        <app-metric-card
          label="Calories"
          [value]="formatNumber(currentSample()?.calories)"
          unit="kcal"
          icon="local_fire_department"
        />
      </div>

      <div class="grid grid-2 charts">
        <mat-card>
          <h3 class="section-title">Speed · letzte 10 Minuten</h3>
          <app-mini-chart [data]="speedChartData()" />
        </mat-card>
        <mat-card>
          <h3 class="section-title">Incline · letzte 10 Minuten</h3>
          <app-mini-chart [data]="inclineChartData()" />
        </mat-card>
      </div>

      <mat-card class="session-controls">
        <h3 class="section-title">Session Controls</h3>
        <div class="controls">
          <button
            mat-raised-button
            color="primary"
            class="large-button"
            (click)="startSession()"
            [disabled]="sessionState() !== 'inactive'"
          >
            Start
          </button>
          <button
            mat-raised-button
            color="accent"
            class="large-button"
            (click)="togglePause()"
            [disabled]="sessionState() === 'inactive'"
          >
            {{ sessionState() === 'paused' ? 'Resume' : 'Pause' }}
          </button>
          <button
            mat-stroked-button
            color="primary"
            class="large-button"
            (click)="addLap()"
            [disabled]="sessionState() !== 'running'"
          >
            Lap
          </button>
          <button
            mat-raised-button
            color="warn"
            class="large-button"
            (click)="stopSession()"
            [disabled]="sessionState() === 'inactive'"
          >
            Stop
          </button>
          <button mat-button class="large-button" (click)="resetSession()">
            Reset
          </button>
        </div>
        <mat-form-field appearance="outline" class="note-field">
          <mat-label>Notizen</mat-label>
          <input matInput [(ngModel)]="note" placeholder="z.B. Intervalltraining" />
        </mat-form-field>
      </mat-card>

      <mat-card class="insights">
        <h3 class="section-title">Session Insights</h3>
        <div class="grid grid-2">
          <div class="insight">
            <span>Dauer</span>
            <strong>{{ sessionDuration() }}</strong>
          </div>
          <div class="insight">
            <span>Ø Speed</span>
            <strong>{{ averageSpeed() }} km/h</strong>
          </div>
          <div class="insight">
            <span>Ø Pace</span>
            <strong>{{ averagePace() }} min/km</strong>
          </div>
          <div class="insight">
            <span>Max Speed</span>
            <strong>{{ maxSpeed() }} km/h</strong>
          </div>
          <div class="insight">
            <span>Max Incline</span>
            <strong>{{ maxIncline() }} %</strong>
          </div>
        </div>
      </mat-card>
    </section>
  `,
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  note = '';
  readonly sessionState = this.sessionStateService.state;
  readonly currentSample = signal<TreadmillSample | null>(null);
  readonly connectionState = toSignal(this.treadmillService.connection$, {
    initialValue: {
      status: 'connecting' as ConnectionStatus,
      transport: 'sse',
      retryInSeconds: null
    }
  });
  private readonly history = signal<TreadmillSample[]>([]);
  private sessionStart?: number;
  private pausedAt?: number;
  private pausedDuration = 0;

  constructor(
    private treadmillService: TreadmillDataService,
    private sessionStateService: SessionStateService,
    private snackbar: MatSnackBar
  ) {
    this.treadmillService.sample$.subscribe((sample) => {
      this.currentSample.set(sample);
      this.history.update((history) => {
        const next = [...history, sample].slice(-HISTORY_LIMIT);
        return next;
      });
    });

    effect(() => {
      const connection = this.connectionState();
      const status = connection.status;
      if (status === 'connected') {
        this.snackbar.open('Backend verbunden', 'OK', { duration: 2000 });
      }
      if (status === 'disconnected') {
        if (connection.lastError === 'not_found') {
          this.snackbar.open('Live-Daten nicht gefunden (404). Polling gestoppt.', 'OK', {
            duration: 4000
          });
          return;
        }
        this.snackbar.open('Backend getrennt – reconnect läuft', 'OK', {
          duration: 3000
        });
      }
    });
  }

  startSession(): void {
    this.sessionStateService.start();
    this.sessionStart = Date.now();
    this.pausedDuration = 0;
    this.pausedAt = undefined;
  }

  togglePause(): void {
    if (this.sessionState() === 'running') {
      this.sessionStateService.pause();
      this.pausedAt = Date.now();
      return;
    }

    if (this.sessionState() === 'paused') {
      this.sessionStateService.resume();
      if (this.pausedAt) {
        this.pausedDuration += Date.now() - this.pausedAt;
      }
      this.pausedAt = undefined;
    }
  }

  stopSession(): void {
    this.sessionStateService.stop();
    this.sessionStart = undefined;
    this.pausedAt = undefined;
    this.pausedDuration = 0;
  }

  resetSession(): void {
    this.history.set([]);
    this.currentSample.set(null);
    this.stopSession();
  }

  addLap(): void {
    this.snackbar.open('Lap gespeichert', 'OK', { duration: 2000 });
  }

  sessionStateLabel(): string {
    const state = this.sessionState();
    if (state === 'running') {
      return 'Aktiv';
    }
    if (state === 'paused') {
      return 'Pausiert';
    }
    return 'Inaktiv';
  }

  lastTimestamp(): string {
    const timestamp = this.currentSample()?.timestamp;
    if (!timestamp) {
      return '--';
    }
    return new Date(timestamp).toLocaleTimeString('de-DE');
  }

  rollingAverage(): string {
    const samples = this.history().slice(-30);
    if (!samples.length) {
      return '--';
    }
    const avg = samples.reduce((sum, sample) => sum + sample.speed, 0) / samples.length;
    return avg.toFixed(1);
  }

  paceDisplay(): string {
    const speed = this.currentSample()?.speed ?? 0;
    if (!speed) {
      return '--';
    }
    const pace = 60 / speed;
    return pace.toFixed(1);
  }

  sessionDuration(): string {
    if (!this.sessionStart) {
      return '00:00';
    }
    const now = this.sessionState() === 'paused' && this.pausedAt ? this.pausedAt : Date.now();
    const elapsedMs = now - this.sessionStart - this.pausedDuration;
    const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  averageSpeed(): string {
    const samples = this.history();
    if (!samples.length) {
      return '--';
    }
    const avg = samples.reduce((sum, sample) => sum + sample.speed, 0) / samples.length;
    return avg.toFixed(1);
  }

  averagePace(): string {
    const avgSpeed = Number(this.averageSpeed());
    if (!avgSpeed) {
      return '--';
    }
    const pace = 60 / avgSpeed;
    return pace.toFixed(1);
  }

  maxSpeed(): string {
    const samples = this.history();
    if (!samples.length) {
      return '--';
    }
    const max = Math.max(...samples.map((sample) => sample.speed));
    return max.toFixed(1);
  }

  maxIncline(): string {
    const samples = this.history();
    if (!samples.length) {
      return '--';
    }
    const max = Math.max(...samples.map((sample) => sample.incline));
    return max.toFixed(1);
  }

  formatNumber(value?: number): string {
    if (value === undefined || value === null) {
      return '--';
    }
    return value.toFixed(1);
  }

  speedChartData(): ChartConfiguration<'line'>['data'] {
    const samples = this.history();
    return {
      labels: samples.map((sample) => sample.timestamp),
      datasets: [
        {
          data: samples.map((sample) => sample.speed),
          borderColor: '#5ce1e6',
          backgroundColor: 'rgba(92, 225, 230, 0.15)',
          fill: true
        }
      ]
    };
  }

  inclineChartData(): ChartConfiguration<'line'>['data'] {
    const samples = this.history();
    return {
      labels: samples.map((sample) => sample.timestamp),
      datasets: [
        {
          data: samples.map((sample) => sample.incline),
          borderColor: '#ffb74d',
          backgroundColor: 'rgba(255, 183, 77, 0.15)',
          fill: true
        }
      ]
    };
  }
}
