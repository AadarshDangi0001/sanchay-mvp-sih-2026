import type { HourlyWeather, WeatherData, WeatherSummary } from '../types/project'
import type { Vec3 } from '../types/shelter'
import { DEG, localToWorld } from './geometry'

export interface SunPosition {
  /** rad above the horizon (negative = below) */
  altitude: number
  /** rad, clockwise from north */
  azimuth: number
  /** world unit vector toward the sun (x = east, y = up, −z = north) */
  dir: Vec3
}

export function declination(dayOfYear: number): number {
  return 23.45 * DEG * Math.sin((360 / 365) * (284 + dayOfYear) * DEG)
}

/** Textbook solar geometry on solar time. */
export function sunPosition(latitude: number, dayOfYear: number, hour: number): SunPosition {
  const phi = latitude * DEG
  const dec = declination(dayOfYear)
  const H = 15 * (hour - 12) * DEG
  const sinAlt = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)))
  const cosAlt = Math.cos(alt)
  let az = 0
  if (cosAlt > 1e-4) {
    const c = (Math.sin(dec) - sinAlt * Math.sin(phi)) / (cosAlt * Math.cos(phi))
    const a = Math.acos(Math.max(-1, Math.min(1, c)))
    az = H <= 0 ? a : 2 * Math.PI - a
  }
  return {
    altitude: alt,
    azimuth: az,
    dir: [Math.sin(az) * cosAlt, sinAlt, -Math.cos(az) * cosAlt],
  }
}

export interface Sky {
  ghi: number
  sun: SunPosition
  albedo: number
}

const DIFFUSE_FRACTION = 0.3

/** Plane-of-array irradiance (W/m²) for a world-space outward normal. Simple isotropic-sky model. */
export function irradianceOnSurface(n: Vec3, sky: Sky): number {
  const { ghi, sun, albedo } = sky
  if (ghi <= 0 || sun.altitude <= 0) return 0
  const sinAlt = Math.max(Math.sin(sun.altitude), 0.09)
  const dni = Math.min(((1 - DIFFUSE_FRACTION) * ghi) / sinAlt, 1100)
  const cosInc = n[0] * sun.dir[0] + n[1] * sun.dir[1] + n[2] * sun.dir[2]
  const beam = dni * Math.max(0, cosInc)
  const diffuse = DIFFUSE_FRACTION * ghi * (1 + n[1]) * 0.5
  const ground = albedo * ghi * (1 - n[1]) * 0.5
  return beam + diffuse + ground
}

/** Irradiance for a shelter-local normal given the shelter orientation. */
export function irradianceLocal(nLocal: Vec3, orientation: number, sky: Sky): number {
  return irradianceOnSurface(localToWorld(nLocal, orientation), sky)
}

/** Linear interpolation over the 24-hour weather profile (wraps at midnight). */
export function sampleWeather(w: WeatherData, hour: number): HourlyWeather {
  const h = ((hour % 24) + 24) % 24
  const i0 = Math.floor(h)
  const i1 = (i0 + 1) % 24
  const f = h - i0
  const a = w.hourly[i0]
  const b = w.hourly[i1]
  const l = (x: number, y: number) => x + (y - x) * f
  return {
    hour: h,
    temperature: l(a.temperature, b.temperature),
    solar: l(a.solar, b.solar),
    wind: l(a.wind, b.wind),
    humidity: l(a.humidity, b.humidity),
  }
}

export function summarizeWeather(w: WeatherData): WeatherSummary {
  const t = w.hourly.map((h) => h.temperature)
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
  return {
    meanTemp: mean(t),
    minTemp: Math.min(...t),
    maxTemp: Math.max(...t),
    peakSolar: Math.max(...w.hourly.map((h) => h.solar)),
    dailySolarKWh: w.hourly.reduce((s, h) => s + h.solar, 0) / 1000,
    meanWind: mean(w.hourly.map((h) => h.wind)),
    meanHumidity: mean(w.hourly.map((h) => h.humidity)),
  }
}

/** Sky for a given clock hour, using the weather's location and design day. */
export function skyAt(w: WeatherData, hour: number): Sky {
  return {
    ghi: sampleWeather(w, hour).solar,
    sun: sunPosition(w.latitude, w.dayOfYear, hour),
    albedo: w.albedo,
  }
}

/** Surface film resistances (m²K/W). Exterior film depends on wind speed. */
export const R_SI = { wall: 0.13, roof: 0.1, floor: 0.17, window: 0.13, door: 0.13 }
export const exteriorFilm = (wind: number) => 5.8 + 3.9 * Math.min(wind, 12)
export const SKY_LONGWAVE_DELTA = 63 // W/m² clear-sky net long-wave loss for a horizontal surface

