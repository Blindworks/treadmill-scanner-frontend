import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-mini-chart',
  standalone: true,
  imports: [NgChartsModule],
  template: `
    <div class="chart-container">
      <canvas
        baseChart
        [data]="data"
        [options]="options"
        [type]="'line'"
      ></canvas>
    </div>
  `,
  styleUrls: ['./mini-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MiniChartComponent {
  @Input({ required: true }) data!: ChartConfiguration<'line'>['data'];

  readonly options: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: {
        borderWidth: 2,
        tension: 0.3
      },
      point: {
        radius: 0
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      x: {
        display: false
      },
      y: {
        display: true,
        ticks: {
          color: '#9fb0bf'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.08)'
        }
      }
    }
  };
}
