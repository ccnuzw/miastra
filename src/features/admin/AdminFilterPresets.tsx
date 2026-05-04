type AdminFilterPreset = {
  key: string
  label: string
  active?: boolean
  onClick: () => void
}

type AdminFilterPresetsProps = {
  presets: AdminFilterPreset[]
}

export function AdminFilterPresets({ presets }: AdminFilterPresetsProps) {
  if (!presets.length) return null

  return (
    <div className="admin-filter-strip" aria-label="常用筛选预设">
      {presets.map((preset) => (
        <button
          key={preset.key}
          type="button"
          className={`admin-filter-chip ${preset.active ? 'admin-filter-chip-active' : ''}`}
          onClick={preset.onClick}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
