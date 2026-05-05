import { useEffect, useMemo, useState } from 'react'
import {
  defaultStudioWorkbenchMode,
  getStudioShellViewModel,
  isStudioWorkbenchMode,
  type StudioWorkbenchMode,
  studioWorkbenchModeOptions,
} from './studioShell.adapters'

const studioWorkbenchModeStorageKey = 'miastra.studio.workbench-mode'

function readStoredStudioWorkbenchMode(): StudioWorkbenchMode {
  if (typeof window === 'undefined') return defaultStudioWorkbenchMode

  try {
    const stored = window.localStorage.getItem(studioWorkbenchModeStorageKey)
    return stored && isStudioWorkbenchMode(stored) ? stored : defaultStudioWorkbenchMode
  } catch {
    return defaultStudioWorkbenchMode
  }
}

export function useStudioWorkbenchMode() {
  const [mode, setMode] = useState<StudioWorkbenchMode>(() => readStoredStudioWorkbenchMode())

  useEffect(() => {
    try {
      window.localStorage.setItem(studioWorkbenchModeStorageKey, mode)
    } catch {
      // 忽略本地存储不可用的情况，避免影响工作台主流程。
    }
  }, [mode])

  const viewModel = useMemo(() => getStudioShellViewModel(mode), [mode])

  return {
    mode,
    setMode,
    viewModel,
    options: studioWorkbenchModeOptions,
    isConsumerMode: mode === 'consumer',
    isProMode: mode === 'pro',
  }
}
