export type ClimateType =
  | 'High Altitude Cold'
  | 'Hot Arid Desert'
  | 'Temperate Mountain'
  | 'Cold Continental'
  | 'Warm Humid'

export interface Project {
  id: string
  name: string
  description: string
  location: string
  climate: ClimateType
  createdAt: string
  updatedAt: string
}

export interface HourlyWeather {
  hour: number
  /** °C */
  temperature: number
  /** W/m² global horizontal */
  solar: number
  /** m/s */
  wind: number
  /** % */
  humidity: number
}

export type WeatherSource = 'sample' | 'csv' | 'manual'

export interface WeatherData {
  id: string
  location: string
  latitude: number
  longitude: number
  elevation: number
  climate: ClimateType
  source: WeatherSource
  sourceLabel: string
  dayOfYear: number
  season: string
  /** ground reflectance 0–1 */
  albedo: number
  /** °C undisturbed ground temperature */
  groundTemp: number
  hourly: HourlyWeather[]
}

export interface WeatherSummary {
  meanTemp: number
  minTemp: number
  maxTemp: number
  peakSolar: number
  dailySolarKWh: number
  meanWind: number
  meanHumidity: number
}
