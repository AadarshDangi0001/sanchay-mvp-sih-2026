import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Droplets, MapPin, Snowflake, Sun, Thermometer, Wand2, Wind } from 'lucide-react'
import { Card } from '../components/common/Card'
import { FieldError } from '../components/common/Field'
import { PageHeader } from '../components/layout/PageHeader'
import { ARCHETYPES, CLIMATES, LOCATION_PRESETS, matchPreset } from '../data/weather'
import { useProjectStore } from '../store/useProjectStore'
import type { ClimateType } from '../types/project'
import { toast } from '../components/common/Toaster'

const schema = z.object({
  name: z.string().trim().min(3, 'Project name needs at least 3 characters.').max(60, 'Keep the name under 60 characters.'),
  description: z.string().trim().max(240, 'Keep the description under 240 characters.'),
  location: z.string().trim().min(2, 'Enter a location, e.g. “Leh, Ladakh”.').max(80, 'Location is too long.'),
  climate: z.enum(CLIMATES as [ClimateType, ...ClimateType[]], { error: 'Pick a climate type.' }),
})
type FormValues = z.infer<typeof schema>

const CLIMATE_ICON: Record<ClimateType, typeof Snowflake> = {
  'High Altitude Cold': Snowflake, 'Hot Arid Desert': Sun, 'Temperate Mountain': Thermometer, 'Cold Continental': Wind, 'Warm Humid': Droplets,
}

export default function CreateProject() {
  const nav = useNavigate()
  const create = useProjectStore((s) => s.createProject)
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { name: '', description: '', location: '', climate: 'High Altitude Cold' },
  })
  const climate = watch('climate')
  const location = watch('location')
  const arche = ARCHETYPES[climate]
  const preset = matchPreset(location ?? '', climate)

  useEffect(() => {
    document.title = 'New project · ClimaForge'
  }, [])

  const fill = (name: string, loc: string, c: ClimateType, desc = '') => {
    setValue('name', name, { shouldValidate: true })
    setValue('location', loc, { shouldValidate: true })
    setValue('climate', c, { shouldValidate: true })
    if (desc) setValue('description', desc, { shouldValidate: true })
  }

  const onSubmit = async (v: FormValues) => {
    create(v)
    toast(`Project “${v.name}” created.`)
    nav('/climate')
  }

  return (
    <>
      <PageHeader step="create" title="Start a new shelter project" subtitle="Name it, place it, and pick the climate it must survive. ClimaForge loads matching weather data and a sensible starting design." />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="p-6 md:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold tracking-tight">Project details</h2>
            <button type="button" className="btn-ghost btn-sm" onClick={() => fill('Ladakh Winter Shelter', 'Leh, Ladakh', 'High Altitude Cold', 'Passive-solar shelter that must stay near 18 °C through a Leh winter.')}>
              <Wand2 size={14} /> Fill with example
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="name" className="label">Project name</label>
              <input id="name" className={`input ${errors.name ? 'input-error' : ''}`} placeholder="Ladakh Winter Shelter" {...register('name')} aria-invalid={!!errors.name} />
              <FieldError message={errors.name?.message} />
            </div>
            <div>
              <label htmlFor="description" className="label">Description <span className="font-medium text-ink-mute">(optional)</span></label>
              <textarea id="description" rows={3} className={`input resize-none ${errors.description ? 'input-error' : ''}`} placeholder="What is this shelter for, and who will use it?" {...register('description')} />
              <FieldError message={errors.description?.message} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="location" className="label">Location</label>
                <div className="relative">
                  <MapPin size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="location" className={`input !pl-10 ${errors.location ? 'input-error' : ''}`} placeholder="Leh, Ladakh" {...register('location')} aria-invalid={!!errors.location} />
                </div>
                <FieldError message={errors.location?.message} />
              </div>
              <div>
                <label htmlFor="climate" className="label">Climate type</label>
                <select id="climate" className="input appearance-none bg-[length:16px] pr-9" {...register('climate')}>
                  {CLIMATES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <FieldError message={errors.climate?.message} />
              </div>
            </div>

            <div>
              <div className="eyebrow mb-2">Quick locations</div>
              <div className="flex flex-wrap gap-2">
                {LOCATION_PRESETS.map((p) => (
                  <button
                    key={p.id} type="button"
                    onClick={() => { setValue('location', p.name, { shouldValidate: true }); setValue('climate', p.climate, { shouldValidate: true }) }}
                    className="chip transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <MapPin size={12} /> {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-7 flex items-center justify-between border-t border-line pt-5">
            <span className="text-xs font-medium text-ink-mute">You can change everything later.</span>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              Create & set climate <ArrowRight size={16} />
            </button>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="bp-lines overflow-hidden p-6">
            <div className="mb-4 flex items-center gap-3">
              {(() => { const I = CLIMATE_ICON[climate]; return <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-white"><I size={22} /></span> })()}
              <div>
                <div className="eyebrow">Climate archetype</div>
                <div className="text-lg font-extrabold leading-tight tracking-tight">{climate}</div>
              </div>
            </div>
            <p className="mb-4 text-sm font-semibold text-ink-soft">{arche.headline}</p>
            <ul className="space-y-2.5">
              {arche.strategies.map((s, i) => (
                <li key={s} className="flex items-start gap-3 rounded-xl border border-line bg-white/90 px-3.5 py-3 text-sm font-semibold">
                  <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-md bg-aqua-50 text-[11px] font-bold text-aqua-700">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <div className="eyebrow mb-3">Sample weather that will load</div>
            <div className="mb-4 text-sm font-bold">{preset.name} <span className="font-medium text-ink-mute">· {preset.season}</span></div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Mean temperature', `${preset.meanTemp}°C`, Thermometer],
                ['Peak solar', `${preset.peakSolar} W/m²`, Sun],
                ['Mean wind', `${preset.meanWind} m/s`, Wind],
                ['Humidity', `${preset.meanHumidity}%`, Droplets],
              ].map(([k, v, I]) => {
                const Icon = I as typeof Sun
                return (
                  <div key={k as string} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-3">
                    <Icon size={17} className="text-brand-600" />
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">{k as string}</div>
                      <div className="num text-sm font-bold">{v as string}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </form>
    </>
  )
}
