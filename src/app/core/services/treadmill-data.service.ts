import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  Subject,
  catchError,
  debounceTime,
  filter,
  map,
  of,
  switchMap,
  takeUntil,
  tap,
  timer
} from 'rxjs';
import {
  ConnectionStatus,
  DataTransport,
  TreadmillSample
} from '../models/treadmill.models';
import { environment } from '../../../environments/environment';

interface LiveConnectionState {
  status: ConnectionStatus;
  transport: DataTransport;
  retryInSeconds: number | null;
  lastError?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TreadmillDataService {
  private readonly sampleSubject = new BehaviorSubject<TreadmillSample | null>(
    null
  );
  private readonly connectionSubject = new BehaviorSubject<LiveConnectionState>({
    status: 'connecting',
    transport: 'sse',
    retryInSeconds: null
  });
  private readonly destroy$ = new Subject<void>();
  private readonly reconnect$ = new Subject<void>();
  private eventSource?: EventSource;
  private retryAttempt = 0;
  private pollingIntervalMs = 1000;

  readonly sample$ = this.sampleSubject
    .asObservable()
    .pipe(filter((sample): sample is TreadmillSample => sample !== null));
  readonly connection$ = this.connectionSubject.asObservable();

  constructor(private http: HttpClient, private zone: NgZone) {
    this.initOnlineListener();
    this.reconnect$
      .pipe(
        debounceTime(200),
        tap(() => this.disconnect()),
        switchMap(() => timer(250))
      )
      .subscribe(() => this.connect());
    this.connect();
  }

  setPollingInterval(ms: number): void {
    this.pollingIntervalMs = Math.max(500, ms);
    if (this.connectionSubject.value.transport === 'polling') {
      this.reconnect$.next();
    }
  }

  connect(): void {
    if (this.isOffline()) {
      this.updateStatus({ status: 'offline', retryInSeconds: null });
      return;
    }

    if (this.supportsSse()) {
      this.connectSse();
    } else {
      this.connectPolling();
    }

  }

  disconnect(): void {
    this.destroy$.next();
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
  }

  private connectSse(): void {
    this.retryAttempt = 0;
    this.updateStatus({ status: 'connecting', transport: 'sse' });

    this.zone.runOutsideAngular(() => {
      const url = `${environment.apiBaseUrl}/api/live/stream`;
      const eventSource = new EventSource(url, { withCredentials: true });
      this.eventSource = eventSource;

      eventSource.onmessage = (event) => {
        this.zone.run(() => {
          this.retryAttempt = 0;
          this.updateStatus({ status: 'connected', transport: 'sse' });
          this.pushSample(JSON.parse(event.data) as TreadmillSample);
        });
      };

      eventSource.onerror = () => {
        this.zone.run(() => {
          this.updateStatus({ status: 'disconnected', transport: 'sse' });
          this.scheduleReconnect();
        });
      };
    });
  }

  private connectPolling(): void {
    this.retryAttempt = 0;
    this.updateStatus({ status: 'connecting', transport: 'polling' });

    timer(0, this.pollingIntervalMs)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() =>
          this.http
            .get<TreadmillSample>(
              `${environment.apiBaseUrl}/api/live/latest`,
              { withCredentials: true }
            )
            .pipe(
              catchError((error: Error) => {
                this.updateStatus({
                  status: 'disconnected',
                  transport: 'polling',
                  lastError: error.message
                });
                this.scheduleReconnect();
                return of(null);
              })
            )
        ),
        filter((sample): sample is TreadmillSample => sample !== null)
      )
      .subscribe((sample) => {
        this.updateStatus({ status: 'connected', transport: 'polling' });
        this.pushSample(sample);
      });
  }

  private scheduleReconnect(): void {
    if (this.isOffline()) {
      this.updateStatus({ status: 'offline', retryInSeconds: null });
      return;
    }

    this.retryAttempt += 1;
    const backoffSeconds = Math.min(30, 2 ** this.retryAttempt);
    this.updateStatus({ retryInSeconds: backoffSeconds });

    timer(backoffSeconds * 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.reconnect$.next());
  }

  private updateStatus(partial: Partial<LiveConnectionState>): void {
    this.connectionSubject.next({
      ...this.connectionSubject.value,
      ...partial
    });
  }

  private pushSample(sample: TreadmillSample): void {
    this.sampleSubject.next({
      ...sample,
      timestamp: sample.timestamp ?? new Date().toISOString()
    });
  }

  private initOnlineListener(): void {
    window.addEventListener('online', () => this.reconnect$.next());
    window.addEventListener('offline', () => {
      this.disconnect();
      this.updateStatus({ status: 'offline', retryInSeconds: null });
    });
  }

  private supportsSse(): boolean {
    return typeof EventSource !== 'undefined';
  }

  private isOffline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  }
}
