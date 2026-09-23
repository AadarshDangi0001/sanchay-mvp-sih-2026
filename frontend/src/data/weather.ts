import type { ClimateType, HourlyWeather, WeatherData } from '../types/project'
import { clamp } from '../utils/geometry'
import { sunPosition } from '../utils/thermal'

export interface LocationPreset {
  id: string
  name: string
  latitude: number
  longitude: number
  elevation: number
  climate: ClimateType
  season: string
  dayOfYear: number
  meanTemp: number
  tempSwing: number
  peakSolar: number
  meanWind: number
  meanHumidity: number
  albedo: number
  groundTemp: number
}

export const LOCATION_PRESETS: LocationPreset[] = [
  {
    id: 'leh', name: 'Leh, Ladakh', latitude: 34.15, longitude: 77.58, elevation: 3500,
    climate: 'High Altitude Cold', season: 'Winter design day (15 Jan)', dayOfYear: 15,
    meanTemp: -8, tempSwing: 8, peakSolar: 620, meanWind: 4.2, meanHumidity: 28, albedo: 0.35, groundTemp: 3,
  },
  {
    id: 'jaisalmer', name: 'Jaisalmer, Rajasthan', latitude: 26.91, longitude: 70.92, elevation: 225,
    climate: 'Hot Arid Desert', season: 'Summer design day (20 May)', dayOfYear: 140,
    meanTemp: 35, tempSwing: 8, peakSolar: 900, meanWind: 3.6, meanHumidity: 20, albedo: 0.3, groundTemp: 30,
  },
  {
    id: 'shimla', name: 'Shimla, Himachal Pradesh', latitude: 31.1, longitude: 77.17, elevation: 2200,
    climate: 'Temperate Mountain', season: 'Winter design day (21 Dec)', dayOfYear: 355,
    meanTemp: 4, tempSwing: 5, peakSolar: 520, meanWind: 2.4, meanHumidity: 55, albedo: 0.25, groundTemp: 9,
  },
  {
    id: 'yakutsk', name: 'Yakutsk, Sakha', latitude: 62.03, longitude: 129.73, elevation: 100,
    climate: 'Cold Continental', season: 'Winter design day (15 Jan)', dayOfYear: 15,
    meanTemp: -32, tempSwing: 4, peakSolar: 140, meanWind: 1.4, meanHumidity: 75, albedo: 0.8, groundTemp: -4,
  },
  {
    id: 'mawsynram', name: 'Mawsynram, Meghalaya', latitude: 25.3, longitude: 91.58, elevation: 1400,
    climate: 'Warm Humid', season: 'Monsoon design day (15 Jul)', dayOfYear: 196,
    meanTemp: 23, tempSwing: 3.5, peakSolar: 480, meanWind: 2, meanHumidity: 92, albedo: 0.2, groundTemp: 22,
  },
]

export const CLIMATES: ClimateType[] = [
  'High Altitude Cold',
  'Hot Arid Desert',
  'Temperate Mountain',
  'Cold Continental',
  'Warm Humid',
]

export interface ClimateArchetype {
  climate: ClimateType
  headline: string
  strategies: string[]
  presetId: string
}

export const ARCHETYPES: Record<ClimateType, ClimateArchetype> = {
  'High Altitude Cold': {
    climate: 'High Altitude Cold',
    headline: 'Intense sun, freezing nights, thin air.',
    strategies: ['Face large glazing toward the equator', 'Heavy insulation on every surface', 'Thermal mass to carry sun into the night'],
    presetId: 'leh',
  },
  'Hot Arid Desert': {
    climate: 'Hot Arid Desert',
    headline: 'Extreme daytime heat with large day–night swings.',
    strategies: ['Small, shaded openings', 'Thermal mass to buffer the swing', 'Reflective, insulated roof'],
    presetId: 'jaisalmer',
  },
  'Temperate Mountain': {
    climate: 'Temperate Mountain',
    headline: 'Cool winters, moderate sun, moist air.',
    strategies: ['Balanced glazing and insulation', 'Steep roofs shed snow', 'Wind-tight envelope'],
    presetId: 'shimla',
  },
  'Cold Continental': {
    climate: 'Cold Continental',
    headline: 'Deep cold, very low winter sun.',
    strategies: ['Compact form, low surface-to-volume', 'Triple glazing, minimal openings', 'Insulate the floor from permafrost'],
    presetId: 'yakutsk',
  },
  'Warm Humid': {
    climate: 'Warm Humid',
    headline: 'Warm all day, very humid, heavy rain.',
    strategies: ['Cross-ventilation and shading', 'Light, low-mass construction', 'Raised, well-drained floor'],
    presetId: 'mawsynram',
  },
}

export const getPreset = (id: string) => LOCATION_PRESETS.find((p) => p.id === id) ?? LOCATION_PRESETS[0]

export function presetForClimate(c: ClimateType): LocationPreset {
  return getPreset(ARCHETYPES[c].presetId)
}

/** Match free-text location to a preset (e.g. "leh" → Leh). */
export function matchPreset(location: string, climate: ClimateType): LocationPreset {
  const q = location.toLowerCase()
  return (
    LOCATION_PRESETS.find((p) => q.includes(p.id) || q.includes(p.name.split(',')[0].toLowerCase())) ??
    presetForClimate(climate)
  )
}

export interface WeatherParams {
  meanTemp: number
  tempSwing: number
  peakSolar: number
  meanWind: number
  meanHumidity: number
  latitude: number
  dayOfYear: number
}

/**
 * Deterministic 24 h profile from a handful of parameters:
 *  - temperature: sinusoid peaking at 15:00
 *  - solar: clear-sky shape from real sun geometry, normalised to the peak value
 *  - wind: afternoon-breezy sinusoid
 *  - humidity: inverse of temperature
 */
export function generateHourly(p: WeatherParams): HourlyWeather[] {
  const altMax = Math.max(sunPosition(p.latitude, p.dayOfYear, 12).altitude, 0.05)
  return Array.from({ length: 24 }, (_, h) => {
    const alt = sunPosition(p.latitude, p.dayOfYear, h).altitude
    const shape = alt > 0 ? Math.pow(Math.sin(alt) / Math.sin(altMax), 1.2) : 0
    return {
      hour: h,
      temperature: +(p.meanTemp + p.tempSwing * Math.cos(((h - 15) / 24) * 2 * Math.PI)).toFixed(2),
      solar: Math.round(p.peakSolar * shape),
      wind: +Math.max(0.2, p.meanWind * (1 + 0.3 * Math.sin(((h - 9) / 24) * 2 * Math.PI))).toFixed(2),
      humidity: +clamp(p.meanHumidity - 0.3 * p.tempSwing * 2 * Math.cos(((h - 15) / 24) * 2 * Math.PI), 5, 100).toFixed(1),
    }
  })
}

export function weatherFromPreset(p: LocationPreset, locationName?: string): WeatherData {
  return {
    id: `sample-${p.id}`,
    location: locationName ?? p.name,
    latitude: p.latitude,
    longitude: p.longitude,
    elevation: p.elevation,
    climate: p.climate,
    source: 'sample',
    sourceLabel: `Sample dataset · ${p.season}`,
    dayOfYear: p.dayOfYear,
    season: p.season,
    albedo: p.albedo,
    groundTemp: p.groundTemp,
    hourly: generateHourly({
      meanTemp: p.meanTemp, tempSwing: p.tempSwing, peakSolar: p.peakSolar, meanWind: p.meanWind,
      meanHumidity: p.meanHumidity, latitude: p.latitude, dayOfYear: p.dayOfYear,
    }),
  }
}

export interface ManualWeatherInput {
  meanTemp: number
  tempSwing: number
  peakSolar: number
  meanWind: number
  meanHumidity: number
}

export function weatherFromManual(base: WeatherData, m: ManualWeatherInput): WeatherData {
  return {
    ...base,
    id: `manual-${base.id.replace(/^(sample|manual|csv)-/, '')}`,
    source: 'manual',
    sourceLabel: 'Manual input · generated 24 h profile',
    groundTemp: +(m.meanTemp + 3).toFixed(1),
    hourly: generateHourly({ ...m, latitude: base.latitude, dayOfYear: base.dayOfYear }),
  }
}

export const CSV_TEMPLATE = `hour,temperature,solar,wind,humidity
${Array.from({ length: 24 }, (_, h) => `${h},-8,0,4,30`).join('\n')}
`

export interface CsvResult {
  weather: WeatherData
  rows: number
  mocked: boolean
  note: string
}

/**
 * MVP CSV ingestion. Tries to read hour,temperature,solar,wind,humidity rows; if the file
 * can't be parsed, falls back to the sample dataset and says so. A real backend would
 * replace this function without touching the UI.
 */
export function weatherFromCsv(text: string, fileName: string, base: WeatherData): CsvResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const rows = lines
    .map((l) => l.split(/[,;\t]/).map((c) => parseFloat(c)))
    .filter((r) => r.length >= 4 && r.slice(0, 4).every((n) => Number.isFinite(n)))
  if (rows.length >= 24) {
    const hourly: HourlyWeather[] = Array.from({ length: 24 }, (_, h) => {
      const r = rows.find((x) => Math.round(x[0]) === h) ?? rows[h]
      return {
        hour: h,
        temperature: r[1],
        solar: Math.max(0, r[2]),
        wind: Math.max(0, r[3]),
        humidity: clamp(Number.isFinite(r[4]) ? r[4] : 40, 0, 100),
      }
    })
    return {
      rows: rows.length,
      mocked: false,
      note: `Parsed ${rows.length} rows from ${fileName}.`,
      weather: {
        ...base,
        id: `csv-${fileName}`,
        source: 'csv',
        sourceLabel: `Uploaded CSV · ${fileName}`,
        groundTemp: +(hourly.reduce((s, h) => s + h.temperature, 0) / 24 + 3).toFixed(1),
        hourly,
      },
    }
  }
  const fallback = matchPreset(base.location, base.climate)
  const sample = weatherFromPreset(fallback, base.location)
  return {
    rows: 0,
    mocked: true,
    note: `${fileName} didn't match the expected hour,temperature,solar,wind,humidity layout — using mock sample data (CSV processing is mocked in this MVP).`,
    weather: { ...sample, id: `csv-mock-${fileName}`, source: 'csv', sourceLabel: `Uploaded CSV (mocked) · ${fileName}` },
  }
}

