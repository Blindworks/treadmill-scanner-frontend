import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      )
  },
  {
    path: 'sessions',
    loadComponent: () =>
      import('./features/sessions/sessions.component').then(
        (m) => m.SessionsComponent
      )
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then(
        (m) => m.SettingsComponent
      )
  },
  {
    path: '**',
    redirectTo: ''
  }
];
