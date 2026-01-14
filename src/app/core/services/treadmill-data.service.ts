import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
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
  private readonly apiKeyStorageKey = 'treadmillApiKey';
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

  getCurrentApiKey(): string {
    return this.readApiKey() ?? '';
  }

  updateApiKey(nextKey: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const trimmedKey = nextKey.trim();
    if (trimmedKey) {
      localStorage.setItem(this.apiKeyStorageKey, trimmedKey);
    } else {
      localStorage.removeItem(this.apiKeyStorageKey);
    }
    this.reconnect$.next();
  }

  setPollingInterval(ms: number): void {
    this.pollingIntervalMs = Math.max(500, ms);
    if (this.connectionSubject.value.transport === 'polling') {
      this.reconnect$.next();
    }
  }

  retryPolling(): void {
    if (this.isOffline()) {
      this.updateStatus({ status: 'offline', retryInSeconds: null });
      return;
    }
    this.disconnect();
    this.connectPolling();
  }

  connect(): void {
    if (this.isOffline()) {
      this.updateStatus({ status: 'offline', retryInSeconds: null });
      return;
    }

    if (this.supportsSse() && !this.hasApiKey()) {
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
      const url = new URL(
        `${environment.apiBaseUrl}/api/live/stream`
      );
      const apiKey = this.readApiKey();
      if (apiKey) {
        url.searchParams.set('apiKey', apiKey);
      }
      const eventSource = new EventSource(url.toString(), {
        withCredentials: true
      });
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
              {
                withCredentials: true,
                headers: this.buildHeaders()
              }
            )
            .pipe(
              catchError((error: HttpErrorResponse) => {
                if (error.status === 404) {
                  this.updateStatus({
                    status: 'disconnected',
                    transport: 'polling',
                    retryInSeconds: null,
                    lastError: 'not_found'
                  });
                  this.disconnect();
                  return of(null);
                }
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

  private buildHeaders(): HttpHeaders {
    const apiKey = this.readApiKey();
    if (!apiKey) {
      return new HttpHeaders();
    }
    return new HttpHeaders({
      'X-API-Key': apiKey
    });
  }

  private readApiKey(): string | null {
    const storedKey = this.getStoredApiKey();
    const envKey = environment.apiKey?.trim();
    const resolvedKey = storedKey ?? envKey;
    return resolvedKey ? resolvedKey : null;
  }

  private getStoredApiKey(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const storedKey = localStorage.getItem(this.apiKeyStorageKey)?.trim();
    return storedKey ? storedKey : null;
  }

  private hasApiKey(): boolean {
    return this.readApiKey() !== null;
  }

  private supportsSse(): boolean {
    return typeof EventSource !== 'undefined';
  }

  private isOffline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  }
}
