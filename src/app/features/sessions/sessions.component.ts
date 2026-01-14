import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface SessionRow {
  id: string;
  date: string;
  duration: string;
  distance: string;
  avgSpeed: string;
}

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatButtonModule, MatIconModule],
  template: `
    <section class="sessions">
      <mat-card>
        <div class="header">
          <div>
            <h2>Session History</h2>
            <p class="subtitle">
              Backend History ist optional – aktuell wird ein Mock angezeigt.
            </p>
          </div>
          <button mat-raised-button color="primary">
            <mat-icon>cloud_download</mat-icon>
            Export
          </button>
        </div>

        <table mat-table [dataSource]="sessions" class="mat-elevation-z0">
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Datum</th>
            <td mat-cell *matCellDef="let session">{{ session.date }}</td>
          </ng-container>

          <ng-container matColumnDef="duration">
            <th mat-header-cell *matHeaderCellDef>Dauer</th>
            <td mat-cell *matCellDef="let session">{{ session.duration }}</td>
          </ng-container>

          <ng-container matColumnDef="distance">
            <th mat-header-cell *matHeaderCellDef>Distanz</th>
            <td mat-cell *matCellDef="let session">{{ session.distance }}</td>
          </ng-container>

          <ng-container matColumnDef="avgSpeed">
            <th mat-header-cell *matHeaderCellDef>Ø Speed</th>
            <td mat-cell *matCellDef="let session">{{ session.avgSpeed }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Details</th>
            <td mat-cell *matCellDef="let session">
              <button mat-icon-button color="primary">
                <mat-icon>chevron_right</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </mat-card>
    </section>
  `,
  styleUrls: ['./sessions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SessionsComponent {
  readonly displayedColumns = ['date', 'duration', 'distance', 'avgSpeed', 'actions'];
  readonly sessions: SessionRow[] = [
    {
      id: 'mock-1',
      date: '15.05.2024 · 07:15',
      duration: '00:42:12',
      distance: '6.4 km',
      avgSpeed: '9.2 km/h'
    },
    {
      id: 'mock-2',
      date: '13.05.2024 · 18:40',
      duration: '00:28:05',
      distance: '4.1 km',
      avgSpeed: '8.7 km/h'
    }
  ];
}
