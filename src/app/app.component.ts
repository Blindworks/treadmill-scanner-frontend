import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  effect,
  signal
} from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConnectionStatusChipComponent } from './shared/components/connection-status-chip.component';
import { RunningModeToggleComponent } from './shared/components/running-mode-toggle.component';
import { TreadmillDataService } from './core/services/treadmill-data.service';
import { SessionStateService } from './core/services/session-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    AsyncPipe,
    NgIf,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    ConnectionStatusChipComponent,
    RunningModeToggleComponent
  ],
  template: `
    <mat-toolbar color="primary" class="app-toolbar">
      <div class="toolbar-left">
        <span class="app-title">Treadmill Live</span>
        <nav class="nav-links">
          <a mat-button routerLink="/">Dashboard</a>
          <a mat-button routerLink="/sessions">Sessions</a>
          <a mat-button routerLink="/settings">Settings</a>
        </nav>
      </div>
      <div class="toolbar-right">
        <app-connection-status-chip
          *ngIf="connection$ | async as connection"
          [status]="connection.status"
          [transport]="connection.transport"
          (retry)="retryPolling()"
        />
        <span class="session-state">Session: {{ sessionState() }}</span>
        <app-running-mode-toggle
          [enabled]="runningMode()"
          (toggle)="setRunningMode($event)"
        />
        <button
          mat-icon-button
          (click)="toggleTheme()"
          matTooltip="Theme wechseln"
        >
          <mat-icon>{{ lightTheme() ? 'dark_mode' : 'light_mode' }}</mat-icon>
        </button>
      </div>
    </mat-toolbar>

    <main class="app-shell">
      <router-outlet />
    </main>
  `,
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  readonly runningMode = signal(false);
  readonly lightTheme = signal(false);
  readonly connection$ = this.treadmillService.connection$;

  @HostBinding('class.light-theme')
  get lightThemeClass(): boolean {
    return this.lightTheme();
  }

  constructor(
    private treadmillService: TreadmillDataService,
    private sessionStateService: SessionStateService
  ) {
    effect(() => {
      const enabled = this.runningMode();
      document.body.classList.toggle('running-mode', enabled);
    });
  }

  sessionState(): string {
    return this.sessionStateService.state();
  }

  setRunningMode(enabled: boolean): void {
    this.runningMode.set(enabled);
  }

  toggleTheme(): void {
    this.lightTheme.update((state) => !state);
  }

  retryPolling(): void {
    this.treadmillService.retryPolling();
  }
}
