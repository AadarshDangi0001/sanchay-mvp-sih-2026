# ClimaForge — Climate-Aware Passive Shelter Design (frontend MVP)

React + TypeScript + Vite + Tailwind v4 · React Three Fiber / drei / three · Recharts · React Hook Form + Zod · Zustand · Lucide.

> **Frontend only.** There is no backend, database, weather API, Python service, ANSYS or ML model.
> Weather, materials, simulation and "AI" optimization are deterministic in-browser mocks and are labelled
> *Demo Simulation – Illustrative Results* / *AI Optimization Demo* throughout the UI.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Product principle: one parametric design object

`ShelterDesign` (`src/types/shelter.ts`) is the single source of truth. The same object drives the procedural 3D model,
the thermal simulation inputs, comparison, optimization, the what-if analysis and the recommendation.

```
design ──► utils/geometry.ts  deriveGeometry()   areas, volume, surfaces, window/door layout
      ├──► components/shelter3d  generators + Shelter3D   procedural meshes (real cut-out openings)
      ├──► data/mockSimulation.ts                         hourly thermal results
      └──► utils/optimization.ts                          seeded search over the same object
```

## Layout

| Path | Purpose |
|---|---|
| `src/pages` | Dashboard, CreateProject, Climate, ShelterDesigner, Materials, Simulation, Results, Comparison, Optimization, Recommendation, Report, + WhatIf |
| `src/components/shelter3d` | `Shelter3D`, `RectangularShelter`, `AFrameShelter`, `DomeShelter`, `Walls`, `Roof`, `Floor`, `Windows`, `Door`, `ThermalHeatmap`, `generators`, viewer + scene extras |
| `src/data` | `materials.ts` (mock DB), `weather.ts` (sample datasets, CSV/manual input), `mockSimulation.ts` (engine), `seed.ts` (demo projects) |
| `src/services/api.ts` | **The seam for a real backend** — `fetchWeather`, `runSimulation`, `runOptimization` |
| `src/store/useProjectStore.ts` | Zustand store, persisted to `localStorage` (debounced); per-project workspaces |
| `src/utils` | `geometry`, `thermal` (sun position, irradiance), `optimization`, `progress`, `format` |

## Connecting real services later

Replace the bodies of the functions in `src/services/api.ts` (same signatures / return types) with calls to your weather API,
Python/ANSYS solver and ML optimizer. No page or component imports the mock engines directly for running work.

## The demo thermal model (not validated engineering)

Lumped-capacity model: one air node + effective thermal mass, steady conduction per component (U from layer conductivity and
film coefficients that depend on wind), transmitted solar through glazing using real sun geometry for the site latitude and
design day, sol-air absorption and long-wave loss on opaque surfaces, infiltration loss, and internal gains. The daily
cycle is iterated to a periodic steady state. Energy requirement comes from a parallel thermostat-controlled run.

## Highlights

- Live parametric 3D: A-frame / rectangular / dome, real window & door holes, orientation-aware sun + shadows, sun-path arc, compass, dimension lines, section cut.
- Thermal view: temperature / heat-loss (with animated heat-flow particles) / solar-exposure, hour scrubber, Low–Medium–High legend.
- What-if: two linked 3D viewers with synchronized cameras and a live metric diff.
- Optimization: 1,200 candidates evaluated live on a scatter canvas with Pareto front; three distinct recommendations with explanations.
- Printable report with captured 3D snapshots (`Export Report` → browser print → PDF).
