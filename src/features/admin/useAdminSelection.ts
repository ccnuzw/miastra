import { useMemo, useState } from 'react'

export function useAdminSelection() {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  function clearSelection() {
    setSelectedIds([])
  }

  function isSelected(id: string) {
    return selectedIds.includes(id)
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function toggleMany(ids: string[], checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...ids]))
      }

      const idSet = new Set(ids)
      return current.filter((item) => !idSet.has(item))
    })
  }

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])

  return {
    selectedIds,
    selectedIdSet,
    selectedCount: selectedIds.length,
    clearSelection,
    isSelected,
    toggleSelection,
    toggleMany,
    setSelectedIds,
  }
}
