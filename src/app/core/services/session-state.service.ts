import { Injectable, signal } from '@angular/core';

export type SessionState = 'inactive' | 'running' | 'paused';

@Injectable({
  providedIn: 'root'
})
export class SessionStateService {
  readonly state = signal<SessionState>('inactive');

  start(): void {
    this.state.set('running');
  }

  pause(): void {
    this.state.set('paused');
  }

  resume(): void {
    this.state.set('running');
  }

  stop(): void {
    this.state.set('inactive');
  }
}
