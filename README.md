# Treadmill Scanner Frontend

Modernes Angular-Frontend (Standalone API, Angular Material) für Live-Laufbanddaten aus einem Spring-Boot-Backend.

## Setup

```bash
npm install
npm start
```

Die App läuft lokal auf `http://localhost:4200`.

## Konfiguration

Die API-Basis-URL wird über die Environment-Dateien gesteuert:

- `src/environments/environment.development.ts` (Default für `ng serve`)
- `src/environments/environment.ts` (Production)

Beispiel:

```ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080'
};
```

## Live-Datenfluss (SSE + Polling)

Primär wird SSE genutzt:

- `GET {API_BASE_URL}/api/live/stream`

Wenn SSE nicht verfügbar ist, fällt die App automatisch auf Polling zurück:

- `GET {API_BASE_URL}/api/live/latest` alle 1000 ms (konfigurierbar in Settings)

Die Verbindung versucht bei Fehlern automatisch zu reconnecten (Exponential Backoff bis 30s).

## Erwartete DTOs (erweiterbar)

**TreadmillSample**

```json
{
  "speed": 10.2,
  "incline": 2.5,
  "distance": 5.1,
  "calories": 320,
  "heartRate": 150,
  "cadence": 165,
  "steps": 6800,
  "timestamp": "2024-05-16T06:30:00.000Z"
}
```

**TreadmillSession** (optional, History)

```json
{
  "id": "session-123",
  "startedAt": "2024-05-16T06:00:00.000Z",
  "endedAt": "2024-05-16T06:45:00.000Z",
  "samples": [],
  "stats": {
    "durationSeconds": 2700,
    "distance": 6.8,
    "averageSpeed": 9.2,
    "averagePace": 6.5,
    "maxSpeed": 12.0,
    "maxIncline": 6.0
  },
  "note": "Intervalltraining"
}
```

## Projektstruktur

```
src/app/
  core/
    models/
    services/
  features/
    dashboard/
    sessions/
    settings/
  shared/
    components/
```

## Scripts

- `npm start` – Entwicklungsserver
- `npm run build` – Production-Build
