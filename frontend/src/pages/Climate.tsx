import { useMemo, useRef, useState, type DragEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, Droplets, Download, FileSpreadsheet, Sun, Thermometer, Upload, Wind } from 'lucide-react'
import { Card, CardHeader } from '../components/common/Card'
import { Notice } from '../components/common/Badges'
import { FieldError } from '../components/common/Field'
import { Segmented } from '../components/common/Segmented'
import { Term } from '../components/common/Term'
import { toast } from '../components/common/Toaster'
import { WEATHER_META, Sparkline, WeatherChart, type WeatherMetric } from '../components/charts/WeatherChart'
import { PageHeader } from '../components/layout/PageHeader'
import { StepNav } from '../components/layout/StepNav'
import { useVisit } from '../components/layout/useStepStatus'
import { CSV_TEMPLATE, LOCATION_PRESETS, weatherFromCsv, weatherFromManual, weatherFromPreset } from '../data/weather'
import { useProjectStore } from '../store/useProjectStore'
import { clock } from '../utils/format'
import { summarizeWeather, sunPosition } from '../utils/thermal'

type Source = 'sample' | 'csv' | 'manual'

const manualSchema = z.object({
  meanTemp: z.number({ error: 'Enter a number.' }).min(-60, 'Min −60 °C').max(60, 'Max 60 °C'),
  tempSwing: z.number({ error: 'Enter a number.' }).min(0, 'Min 0').max(25, 'Max 25 °C'),
  peakSolar: z.number({ error: 'Enter a number.' }).min(0, 'Min 0').max(1200, 'Max 1200 W/m²'),
  meanWind: z.number({ error: 'Enter a number.' }).min(0, 'Min 0').max(30, 'Max 30 m/s'),
  meanHumidity: z.number({ error: 'Enter a number.' }).min(0, 'Min 0').max(100, 'Max 100 %'),
})
type ManualValues = z.infer<typeof manualSchema>

function Reticle({ lat, lon }: { lat: number; lon: number }) {
  const W = 360
  const H = 180
  const x = ((lon + 180) / 360) * W
  const y = ((90 - lat) / 180) * H
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Location ${lat}°, ${lon}°`}>
      <rect width={W} height={H} rx="12" fill="#f5f8fd" />
      {Array.from({ length: 11 }).map((_, i) => <line key={`v${i}`} x1={(i + 1) * 30} y1="0" x2={(i + 1) * 30} y2={H} stroke="#dbe5f4" />)}
      {Array.from({ length: 5 }).map((_, i) => <line key={`h${i}`} x1="0" y1={(i + 1) * 30} x2={W} y2={(i + 1) * 30} stroke="#dbe5f4" />)}
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#b8cbe8" strokeDasharray="4 3" />
      <line x1="0" y1={((90 - 23.44) / 180) * H} x2={W} y2={((90 - 23.44) / 180) * H} stroke="#f0d38a" strokeDasharray="2 3" />
      <line x1="0" y1={((90 + 23.44) / 180) * H} x2={W} y2={((90 + 23.44) / 180) * H} stroke="#f0d38a" strokeDasharray="2 3" />
      <line x1={x} y1="0" x2={x} y2={H} stroke="#2f6fe8" strokeOpacity="0.45" />
      <line x1="0" y1={y} x2={W} y2={y} stroke="#2f6fe8" strokeOpacity="0.45" />
      <circle cx={x} cy={y} r="14" fill="#2f6fe8" opacity="0.12" />
      <circle cx={x} cy={y} r="6.5" fill="#1d55d6" stroke="white" strokeWidth="2.5" />
      <text x={Math.min(x + 12, W - 90)} y={Math.max(y - 10, 14)} className="num" fontSize="9.5" fontWeight="700" fill="#1a44b0">
        {Math.abs(lat).toFixed(2)}°{lat >= 0 ? 'N' : 'S'} {Math.abs(lon).toFixed(2)}°{lon >= 0 ? 'E' : 'W'}
      </text>
      <text x="6" y={H / 2 - 4} className="num" fontSize="8" fill="#8194b0">EQUATOR</text>
      <text x="6" y={((90 - 23.44) / 180) * H - 3} className="num" fontSize="8" fill="#b98a1c">TROPIC OF CANCER</text>
    </svg>
  )
}

export default function Climate() {
  useVisit('climate')
  const weather = useProjectStore((s) => s.weather)
  const setWeather = useProjectStore((s) => s.setWeather)
  const project = useProjectStore((s) => s.project)
  const [source, setSource] = useState<Source>(weather.source)
  const [metric, setMetric] = useState<WeatherMetric>('temperature')
  const [presetId, setPresetId] = useState(() => LOCATION_PRESETS.find((p) => weather.id.endsWith(p.id))?.id ?? LOCATION_PRESETS[0].id)
  const [csvNote, setCsvNote] = useState<{ text: string; mocked: boolean } | null>(null)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const sum = useMemo(() => summarizeWeather(weather), [weather])
  const sunTimes = useMemo(() => {
    const day: number[] = []
    for (let h = 0; h <= 24; h += 0.1) if (sunPosition(weather.latitude, weather.dayOfYear, h).altitude > 0) day.push(h)
    return day.length ? { rise: day[0], set: day[day.length - 1], len: day[day.length - 1] - day[0] } : null
  }, [weather])

  const { register, handleSubmit, formState: { errors } } = useForm<ManualValues>({
    resolver: zodResolver(manualSchema),
    defaultValues: { meanTemp: +sum.meanTemp.toFixed(1), tempSwing: +((sum.maxTemp - sum.minTemp) / 2).toFixed(1), peakSolar: sum.peakSolar, meanWind: +sum.meanWind.toFixed(1), meanHumidity: +sum.meanHumidity.toFixed(0) },
  })

  const tiles: { id: WeatherMetric; label: string; value: string; unit: string; icon: typeof Sun; hint: string; term?: string }[] = [
    { id: 'temperature', label: 'Temperature', value: sum.meanTemp.toFixed(0), unit: '°C', icon: Thermometer, hint: `${sum.minTemp.toFixed(0)} to ${sum.maxTemp.toFixed(0)} °C daily range` },
    { id: 'solar', label: 'Solar irradiance', value: sum.peakSolar.toFixed(0), unit: 'W/m²', icon: Sun, hint: `${sum.dailySolarKWh.toFixed(1)} kWh/m² per day`, term: 'irradiance' },
    { id: 'wind', label: 'Wind speed', value: sum.meanWind.toFixed(1), unit: 'm/s', icon: Wind, hint: 'daily mean' },
    { id: 'humidity', label: 'Humidity', value: sum.meanHumidity.toFixed(0), unit: '%', icon: Droplets, hint: 'daily mean' },
  ]
  const colors: Record<WeatherMetric, string> = { temperature: WEATHER_META.temperature.color, solar: WEATHER_META.solar.color, wind: WEATHER_META.wind.color, humidity: WEATHER_META.humidity.color }

  const readFile = async (file: File) => {
    if (!/\.(csv|txt)$/i.test(file.name)) {
      toast('Please choose a .csv file.', 'error')
      return
    }
    const text = await file.text()
    const r = weatherFromCsv(text, file.name, weather)
    setWeather(r.weather)
    setCsvNote({ text: r.note, mocked: r.mocked })
    toast(r.mocked ? 'CSV not recognised — loaded mock data.' : `Loaded ${r.rows} rows from ${file.name}.`, r.mocked ? 'info' : 'success')
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) void readFile(f)
  }

  return (
    <>
      <PageHeader step="climate" title="Location & climate data" subtitle="The weather this shelter must live through. Everything downstream — sun angles, heat loss, comfort — is driven by this 24-hour profile." />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="p-4 pb-0"><Reticle lat={weather.latitude} lon={weather.longitude} /></div>
            <div className="p-5">
              <div className="eyebrow mb-1">Location</div>
              <h2 className="text-xl font-extrabold tracking-tight">{weather.location}</h2>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {[
                  ['Latitude', `${weather.latitude.toFixed(2)}°`],
                  ['Longitude', `${weather.longitude.toFixed(2)}°`],
                  ['Elevation', `${weather.elevation.toLocaleString()} m`],
                  ['Design day', weather.season.replace(/ design day/, '')],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">{k}</dt>
                    <dd className="num font-bold">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <span className="chip !border-brand-200 !bg-brand-50 !text-brand-700">{weather.climate}</span>
                {sunTimes && <span className="chip num">☀ {clock(sunTimes.rise)}–{clock(sunTimes.set)} · {sunTimes.len.toFixed(1)} h</span>}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader eyebrow="Weather source" title="Where should the data come from?" />
            <div className="p-5">
              <Segmented<Source>
                value={source} onChange={setSource} className="mb-5 w-full [&>button]:flex-1"
                options={[{ id: 'sample', label: 'Sample' }, { id: 'csv', label: 'Upload CSV' }, { id: 'manual', label: 'Manual' }]}
              />

              {source === 'sample' && (
                <div className="space-y-3">
                  <label className="label" htmlFor="preset">Bundled dataset</label>
                  <select id="preset" className="input" value={presetId} onChange={(e) => setPresetId(e.target.value)}>
                    {LOCATION_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.climate}</option>)}
                  </select>
                  <button
                    className="btn-primary w-full"
                    onClick={() => {
                      const p = LOCATION_PRESETS.find((x) => x.id === presetId)!
                      setWeather(weatherFromPreset(p, p.id === 'leh' && project?.location ? project.location : p.name))
                      toast(`Loaded sample weather for ${p.name}.`)
                    }}
                  >
                    <CheckCircle2 size={16} /> Use sample weather data
                  </button>
                </div>
              )}

              {source === 'csv' && (
                <div className="space-y-3">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
                    onClick={() => fileRef.current?.click()} role="button" tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}
                    className={`grid cursor-pointer place-items-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${drag ? 'border-brand-500 bg-brand-50' : 'border-line bg-slate-50 hover:border-brand-300'}`}
                  >
                    <Upload size={22} className="mb-2 text-brand-600" />
                    <div className="text-sm font-bold">Drop a CSV here or click to browse</div>
                    <div className="mt-1 text-xs font-medium text-ink-mute">hour, temperature, solar, wind, humidity</div>
                    <input ref={fileRef} type="file" accept=".csv,.txt,text/csv" hidden onChange={(e) => e.target.files?.[0] && void readFile(e.target.files[0])} />
                  </div>
                  <a
                    className="btn-ghost btn-sm w-full" download="climaforge-weather-template.csv"
                    href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`}
                  >
                    <Download size={14} /> Download template
                  </a>
                  {csvNote && <Notice tone={csvNote.mocked ? 'warn' : 'info'}>{csvNote.text}</Notice>}
                </div>
              )}

              {source === 'manual' && (
                <form
                  className="space-y-3.5" noValidate
                  onSubmit={handleSubmit((v) => { setWeather(weatherFromManual(weather, v)); toast('Manual weather profile applied.') })}
                >
                  {([
                    ['meanTemp', 'Mean temperature (°C)'],
                    ['tempSwing', 'Daily swing ± (°C)'],
                    ['peakSolar', 'Peak irradiance (W/m²)'],
                    ['meanWind', 'Mean wind (m/s)'],
                    ['meanHumidity', 'Mean humidity (%)'],
                  ] as const).map(([k, label]) => (
                    <div key={k} className="grid grid-cols-[1fr_120px] items-start gap-3">
                      <label htmlFor={k} className="pt-2 text-[13px] font-semibold text-ink-soft">{label}</label>
                      <div>
                        <input id={k} type="number" step="any" className={`input num !py-1.5 text-right ${errors[k] ? 'input-error' : ''}`} {...register(k, { valueAsNumber: true })} />
                        <FieldError message={errors[k]?.message} />
                      </div>
                    </div>
                  ))}
                  <button className="btn-primary w-full" type="submit"><FileSpreadsheet size={15} /> Generate 24 h profile</button>
                </form>
              )}
              <p className="mt-4 text-[11px] font-medium leading-snug text-ink-mute">
                Active: <span className="font-bold text-ink-soft">{weather.sourceLabel}</span>. CSV processing is mocked in this MVP.
              </p>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
            {tiles.map((t) => {
              const active = metric === t.id
              return (
                <button
                  key={t.id} onClick={() => setMetric(t.id)} aria-pressed={active}
                  className={`card overflow-hidden p-4 text-left transition hover:-translate-y-0.5 ${active ? '!border-brand-500 ring-2 ring-brand-100' : 'hover:border-brand-300'}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-ink-mute">{t.term ? <Term k={t.term}>{t.label}</Term> : t.label}</span>
                    <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `${colors[t.id]}1f`, color: colors[t.id] }}><t.icon size={15} /></span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="num text-[30px] font-bold leading-none tracking-tight">{t.value}</span>
                    <span className="text-sm font-semibold text-ink-mute">{t.unit}</span>
                  </div>
                  <div className="mb-1.5 mt-1 text-[11px] font-semibold text-ink-mute">{t.hint}</div>
                  <Sparkline data={weather.hourly} metric={t.id} color={colors[t.id]} />
                </button>
              )
            })}
          </div>

          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-[15px] font-bold tracking-tight">24-hour {WEATHER_META[metric].label.toLowerCase()}</h3>
                <p className="text-xs font-medium text-ink-mute">{weather.location} · {weather.season}</p>
              </div>
              <Segmented<WeatherMetric>
                size="sm" value={metric} onChange={setMetric}
                options={[{ id: 'temperature', label: 'Temp' }, { id: 'solar', label: 'Solar' }, { id: 'wind', label: 'Wind' }, { id: 'humidity', label: 'RH' }]}
              />
            </div>
            <WeatherChart data={weather.hourly} metric={metric} />
          </Card>

          <Notice tone="info">
            <strong className="font-bold">What this means for the design:</strong> at {weather.latitude.toFixed(0)}°N in this season the sun climbs to about{' '}
            {(sunPosition(weather.latitude, weather.dayOfYear, 12).altitude / (Math.PI / 180)).toFixed(0)}° at noon, so a shelter that faces south and stores midday heat can carry
            it into the {sum.minTemp.toFixed(0)} °C night.
          </Notice>
        </div>
      </div>

      <StepNav back="/create" next="/design" nextLabel="Design the shelter" backLabel="Project" />
    </>
  )
}
