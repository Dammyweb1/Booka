'use client'

import { useState } from 'react'
import {
  Check,
  Plus,
  Scissors,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react'
import {
  deleteServiceAddon,
  saveServiceAddons,
  setServiceAddonActive,
} from '@/lib/supabase-data'
import { Service, ServiceAddon } from '@/types'
import { cn } from '@/lib/utils'

const coreOfferings: Array<{
  category: Service['category']
  name: string
  description: string
  icon: typeof Scissors
  color: string
}> = [
  {
    category: 'barbing',
    name: 'Barbing',
    description: 'Cuts, fades, beard care and grooming.',
    icon: Scissors,
    color: 'bg-[#eee7ff] text-[#7253cb]',
  },
  {
    category: 'spa',
    name: 'Spa',
    description: 'Treatments, massage and wellness.',
    icon: Sparkles,
    color: 'bg-[#ffe7df] text-[#d46b4f]',
  },
  {
    category: 'hair',
    name: 'Hairdressing',
    description: 'Styling, braids, colour and hair care.',
    icon: WandSparkles,
    color: 'bg-[#e7f2ea] text-[#528361]',
  },
]

function isCoreOffering(service: Service, category: Service['category'], label: string) {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z]/g, '')
  return service.category === category && normalize(service.name) === normalize(label)
}

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString('en-NG')}`
}

type ServicesPanelProps = {
  services: Service[]
  businessId: string
  onAddService: (category: Service['category'], suggestedName?: string) => void
  onEditService: (service: Service) => void
  onDeleteService: (id: string) => void
  onUpdateServiceActive: (serviceId: string, isActive: boolean) => Promise<void>
  onUpdateAddons: (serviceId: string, update: (addons: ServiceAddon[]) => ServiceAddon[]) => void
  onError: (message: string) => void
}

export function ServicesPanel({
  services,
  businessId,
  onAddService,
  onEditService,
  onDeleteService,
  onUpdateServiceActive,
  onUpdateAddons,
  onError,
}: ServicesPanelProps) {
  const [addonEditor, setAddonEditor] = useState<{ service: Service; addon?: ServiceAddon } | null>(null)
  const [addonName, setAddonName] = useState('')
  const [addonPrice, setAddonPrice] = useState('')
  const [addonDuration, setAddonDuration] = useState('0')
  const [isSavingAddon, setIsSavingAddon] = useState(false)
  const [busyAddonId, setBusyAddonId] = useState<string | null>(null)
  const [busyCategoryId, setBusyCategoryId] = useState<string | null>(null)

  const activeCount = services.reduce(
    (total, service) => total + (service.isActive
      ? service.addons.filter((addon) => addon.isActive && addon.price > 0).length
      : 0),
    0
  )
  const addonCount = services.reduce((total, service) => total + service.addons.length, 0)
  const coreServiceIds = new Set(
    coreOfferings.flatMap((offering) => {
      const service = services.find((item) =>
        isCoreOffering(item, offering.category, offering.name) ||
        (offering.category === 'hair' && isCoreOffering(item, offering.category, 'Hair dressing'))
      )
      return service ? [service.id] : []
    })
  )
  const customServices = services.filter((service) => !coreServiceIds.has(service.id))

  const handleToggleService = async (service: Service) => {
    const isActive = !service.isActive
    setBusyCategoryId(service.id)
    try {
      await onUpdateServiceActive(service.id, isActive)
      onError('')
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not update category visibility.')
    } finally {
      setBusyCategoryId(null)
    }
  }

  const openAddonEditor = (service: Service, addon?: ServiceAddon) => {
    setAddonEditor({ service, addon })
    setAddonName(addon?.name ?? '')
    setAddonPrice(addon ? String(addon.price) : '')
    setAddonDuration(addon ? String(addon.durationMinutes) : '0')
    onError('')
  }

  const closeAddonEditor = () => {
    if (isSavingAddon) return
    setAddonEditor(null)
    setAddonName('')
    setAddonPrice('')
    setAddonDuration('0')
  }

  const handleSaveAddon = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!addonEditor) return

    const name = addonName.trim()
    const price = Number(addonPrice)
    const durationMinutes = Number(addonDuration)
    if (
      !name ||
      name.length > 80 ||
      !Number.isInteger(price) ||
      price <= 0 ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 0 ||
      durationMinutes > 600
    ) {
      onError('Enter an item name, a price greater than zero, and a duration from 0 to 600 minutes.')
      return
    }

    const addon: ServiceAddon = {
      id: addonEditor.addon?.id ?? `addon-${Date.now()}`,
      name,
      price,
      durationMinutes,
      isActive: addonEditor.addon?.isActive ?? true,
    }

    setIsSavingAddon(true)
    try {
      await saveServiceAddons([addon], addonEditor.service.id, businessId)
      onUpdateAddons(addonEditor.service.id, (current) => [
        ...current.filter((item) => item.id !== addon.id),
        addon,
      ])
      onError('')
      setAddonEditor(null)
      setAddonName('')
      setAddonPrice('')
      setAddonDuration('0')
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not save this item.')
    } finally {
      setIsSavingAddon(false)
    }
  }

  const handleToggleAddon = async (service: Service, addon: ServiceAddon) => {
    if (!addon.isActive && addon.price <= 0) {
      openAddonEditor(service, addon)
      onError('Set a price greater than zero before publishing this bookable item.')
      return
    }

    setBusyAddonId(addon.id)
    try {
      await setServiceAddonActive(addon.id, service.id, businessId, !addon.isActive)
      onUpdateAddons(service.id, (current) => current.map((item) =>
        item.id === addon.id ? { ...item, isActive: !addon.isActive } : item
      ))
      onError('')
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not update this item.')
    } finally {
      setBusyAddonId(null)
    }
  }

  const handleDeleteAddon = async (service: Service, addon: ServiceAddon) => {
    if (!window.confirm(`Remove "${addon.name}" from ${service.name}?`)) return
    setBusyAddonId(addon.id)
    try {
      await deleteServiceAddon(addon.id, service.id, businessId)
      onUpdateAddons(service.id, (current) => current.filter((item) => item.id !== addon.id))
      onError('')
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not remove this item.')
    } finally {
      setBusyAddonId(null)
    }
  }

  const renderOfferingCard = (service: Service, title: string, color: string, icon: typeof Scissors) => {
    const Icon = icon
    return (
      <article
        key={service.id}
        className="flex min-w-0 flex-col overflow-hidden rounded-[26px] border border-[#e5ddd4] bg-[#fffdf9] shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#caa08f] hover:shadow-[0_18px_40px_rgba(54,39,29,.09)]"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <span className={cn('grid size-12 place-items-center rounded-2xl', color)}>
              <Icon size={21} />
            </span>
            <span className="rounded-full bg-[#f1ece5] px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#81786f]">
              Category
            </span>
          </div>
          <div className="mt-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#a39a91]">{title}</p>
              <h3 className="mt-1 truncate text-xl font-semibold tracking-[-.04em] text-[#211f1c]">
                {service.name}
              </h3>
            </div>
          </div>
          <p className="mt-2 min-h-10 text-xs leading-5 text-[#81786f]">
            {service.detail || 'Add a short description to help clients know what to expect.'}
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-[#eee7df] pt-3 text-xs">
            <span className="text-[#81786f]">{service.addons.length} bookable items configured</span>
            <span className="text-[#528361]">
              {service.isActive
                ? service.addons.filter((addon) => addon.isActive && addon.price > 0).length
                : 0} available
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#eee7df] pt-3">
            <div>
              <p className="text-xs font-semibold text-[#302c27]">Show category on booking page</p>
              <p className="mt-0.5 text-[10px] text-[#a39a91]">Items must also be enabled to book</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={service.isActive}
              aria-label={`${service.isActive ? 'Hide' : 'Show'} ${service.name} on the booking page`}
              disabled={busyCategoryId === service.id}
              onClick={() => void handleToggleService(service)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:cursor-wait disabled:opacity-50',
                service.isActive ? 'bg-[#528361]' : 'bg-[#d7d0c8]'
              )}
            >
              <span className={cn(
                'inline-block size-4 rounded-full bg-white shadow transition-transform',
                service.isActive ? 'translate-x-6' : 'translate-x-1'
              )} />
            </button>
          </div>
        </div>

        <div className="flex-1 border-t border-[#eee7df] bg-[#fbfaf7] px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#302c27]">Bookable items</p>
              <p className="mt-0.5 text-[10px] text-[#a39a91]">Customers can book these items directly</p>
            </div>
            <button
              type="button"
              onClick={() => openAddonEditor(service)}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#211f1c] px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-[#d46b4f]"
            >
              <Plus size={12} /> Add item
            </button>
          </div>

          {service.addons.length > 0 ? (
            <ul className="mt-3 divide-y divide-[#eee7df]">
              {service.addons.map((addon) => (
                <li key={addon.id} className="flex items-center gap-2 py-2.5">
                  <button
                    type="button"
                    aria-label={`${addon.isActive ? 'Disable' : 'Enable'} ${addon.name}`}
                    aria-pressed={addon.isActive}
                    disabled={busyAddonId === addon.id}
                    onClick={() => void handleToggleAddon(service, addon)}
                    className={cn(
                      'grid size-5 shrink-0 place-items-center rounded-full border transition disabled:opacity-50',
                      addon.isActive
                        ? 'border-[#528361] bg-[#528361] text-white'
                        : 'border-[#d7d0c8] bg-white text-transparent'
                    )}
                  >
                    <Check size={11} strokeWidth={3} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-xs font-medium', addon.isActive ? 'text-[#302c27]' : 'text-[#a39a91]')}>
                      {addon.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#a39a91]">
                      {addon.durationMinutes ? `${addon.durationMinutes} min · ` : ''}{formatNaira(addon.price)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAddonEditor(service, addon)}
                    className="rounded-full px-2 py-1 text-[10px] font-semibold text-[#81786f] transition hover:bg-white hover:text-[#211f1c]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${addon.name}`}
                    disabled={busyAddonId === addon.id}
                    onClick={() => void handleDeleteAddon(service, addon)}
                    className="grid size-7 place-items-center rounded-full text-[#a39a91] transition hover:bg-[#ffe7df] hover:text-[#d46b4f] disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-[#ded8cf] px-3 py-3 text-center">
              <p className="text-[11px] font-medium text-[#81786f]">No bookable items yet</p>
              <p className="mt-0.5 text-[10px] text-[#a39a91]">Add a priced item for customers to book.</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-[#eee7df] p-4">
          <button
            type="button"
            onClick={() => onEditService(service)}
            className="flex-1 rounded-full border border-[#ded8cf] py-2.5 text-xs font-semibold text-[#514a44] transition hover:bg-[#f5f1eb]"
          >
            Edit category
          </button>
          <button
            type="button"
            onClick={() => onDeleteService(service.id)}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-[#ded8cf] text-[#8c847c] transition hover:border-[#d46b4f]/30 hover:bg-[#ffe7df] hover:text-[#d46b4f]"
            title={`Delete ${service.name}`}
            aria-label={`Delete ${service.name} category`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </article>
    )
  }

  return (
    <div className="space-y-6">
      <section className="relative isolate overflow-hidden rounded-[30px] bg-[#211f1c] px-6 py-7 text-white shadow-sm sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-20 -top-32 -z-10 size-80 rounded-full bg-[#d46b4f]/25 blur-3xl" />
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow text-[#efb49f]">Booking page setup</p>
            <h1 className="mt-2 text-3xl font-medium tracking-[-.06em] sm:text-4xl">Categories &amp; bookable items</h1>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Organize your menu into categories, then add priced items customers can book directly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onAddService('general')}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#f3efe9] px-5 py-3 text-xs font-semibold text-[#211f1c] transition hover:bg-white"
          >
            <Plus size={15} /> Add category
          </button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[22px] border border-[#e5ddd4] bg-[#fffdf9] p-5 shadow-sm">
          <p className="text-xs text-[#8c847c]">Published bookable items</p>
          <p className="mt-2 text-3xl font-medium tracking-[-.06em] text-[#211f1c]">{activeCount}</p>
          <p className="mt-1 text-[11px] text-[#528361]">Visible on your booking page</p>
        </div>
        <div className="rounded-[22px] border border-[#e5ddd4] bg-[#fffdf9] p-5 shadow-sm">
          <p className="text-xs text-[#8c847c]">Items configured</p>
          <p className="mt-2 text-3xl font-medium tracking-[-.06em] text-[#211f1c]">{addonCount}</p>
          <p className="mt-1 text-[11px] text-[#8c847c]">Bookable items across your categories</p>
        </div>
        <div className="rounded-[22px] border border-[#e5ddd4] bg-[#fffdf9] p-5 shadow-sm sm:col-span-2 xl:col-span-1">
          <p className="text-xs text-[#8c847c]">Core offerings</p>
          <p className="mt-2 text-3xl font-medium tracking-[-.06em] text-[#211f1c]">03</p>
          <p className="mt-1 text-[11px] text-[#8c847c]">Barbing · Spa · Hairdressing</p>
        </div>
      </div>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="eyebrow text-[#d46b4f]">Your categories</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-.04em] text-[#211f1c]">Organize your bookable items</h2>
          </div>
            <p className="text-xs text-[#8c847c]">Categories group items and are not bookable themselves.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {coreOfferings.map((offering) => {
            const service = services.find((item) =>
              isCoreOffering(item, offering.category, offering.name) ||
              (offering.category === 'hair' && isCoreOffering(item, offering.category, 'Hair dressing'))
            )
            const Icon = offering.icon
            return service ? (
              renderOfferingCard(service, offering.name, offering.color, offering.icon)
            ) : (
              <article
                key={offering.category}
                className="flex min-h-[310px] flex-col justify-between rounded-[26px] border border-dashed border-[#d9cfc5] bg-[#faf7f2] p-6 transition hover:border-[#d46b4f]/60 hover:bg-[#fffdf9]"
              >
                <div>
                  <span className={cn('grid size-12 place-items-center rounded-2xl', offering.color)}>
                    <Icon size={21} />
                  </span>
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[.18em] text-[#a39a91]">Not set up</p>
                  <h3 className="mt-1 text-xl font-semibold tracking-[-.04em] text-[#211f1c]">{offering.name}</h3>
                  <p className="mt-2 text-xs leading-5 text-[#81786f]">{offering.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onAddService(offering.category, offering.name)}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-[#ded8cf] bg-white px-4 py-3 text-xs font-semibold text-[#514a44] transition hover:border-[#d46b4f] hover:text-[#d46b4f]"
                >
                  <Plus size={14} /> Set up {offering.name} category
                </button>
              </article>
            )
          })}
        </div>
      </section>

      {customServices.length > 0 && (
        <section>
          <div className="mb-4">
            <p className="eyebrow text-[#d46b4f]">More from your menu</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-.04em] text-[#211f1c]">Additional categories</h2>
            <p className="mt-1 text-xs text-[#8c847c]">Manage your custom item groups here.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {customServices.map((service) => {
              const offering = coreOfferings.find((item) => item.category === service.category) ?? coreOfferings[2]
              return renderOfferingCard(service, service.category, offering.color, offering.icon)
            })}
          </div>
        </section>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-[#e5ddd4] bg-[#f8f5f0] p-4 text-xs leading-5 text-[#756f69]">
        <Sparkles size={16} className="mt-0.5 shrink-0 text-[#d46b4f]" />
        <p>
          <strong className="text-[#302c27]">Build your menu your way.</strong> Categories cannot be booked directly. Add priced items under a category and enable each item to show it on your booking page.
        </p>
      </div>

      {addonEditor && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="addon-editor-title"
            className="w-full max-w-lg rounded-[28px] border border-[#e5ddd4] bg-[#fffdf9] p-6 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#eee7df] pb-4">
              <div>
                <p className="eyebrow text-[#d46b4f]">{addonEditor.service.name} / Bookable item</p>
                <h2 id="addon-editor-title" className="mt-1 text-2xl font-semibold tracking-[-.05em]">
                  {addonEditor.addon ? 'Edit item' : 'Add a bookable item'}
                </h2>
                <p className="mt-1 text-xs text-[#8c847c]">Customers can book this item on its own.</p>
              </div>
              <button
                type="button"
                onClick={closeAddonEditor}
                aria-label="Close bookable item form"
                className="grid size-9 shrink-0 place-items-center rounded-full text-[#8c847c] transition hover:bg-[#f1ece5]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAddon} className="mt-5 space-y-4">
              <label className="block text-xs font-semibold text-[#514a44]">
                Item name
                <input
                  required
                  maxLength={80}
                  value={addonName}
                  onChange={(event) => setAddonName(event.target.value)}
                  placeholder="e.g. Beard trim"
                  className="mt-2 w-full rounded-xl border border-[#ded8cf] bg-white px-4 py-3 text-sm font-normal text-[#211f1c] outline-none transition focus:border-[#d46b4f]"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-[#514a44]">
                  Price (₦)
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={addonPrice}
                    onChange={(event) => setAddonPrice(event.target.value)}
                    placeholder="Enter your price"
                    className="mt-2 w-full rounded-xl border border-[#ded8cf] bg-white px-4 py-3 text-sm font-normal text-[#211f1c] outline-none transition focus:border-[#d46b4f]"
                  />
                </label>
                <label className="block text-xs font-semibold text-[#514a44]">
                  Duration (minutes)
                  <input
                    required
                    type="number"
                    min="0"
                    max="600"
                    step="5"
                    value={addonDuration}
                    onChange={(event) => setAddonDuration(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#ded8cf] bg-white px-4 py-3 text-sm font-normal text-[#211f1c] outline-none transition focus:border-[#d46b4f]"
                  />
                </label>
              </div>
              <div className="flex gap-3 border-t border-[#eee7df] pt-4">
                <button
                  type="button"
                  onClick={closeAddonEditor}
                  className="flex-1 rounded-full border border-[#ded8cf] py-3 text-sm font-semibold text-[#514a44] transition hover:bg-[#f5f1eb]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAddon}
                  className="flex-1 rounded-full bg-[#211f1c] py-3 text-sm font-semibold text-white transition hover:bg-[#d46b4f] disabled:cursor-wait disabled:opacity-50"
                >
                  {isSavingAddon ? 'Saving…' : addonEditor.addon ? 'Save changes' : 'Save item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
