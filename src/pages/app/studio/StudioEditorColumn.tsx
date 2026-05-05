import type { ComponentProps, ReactNode } from 'react'
import { DrawCardPanel } from '@/features/draw-card/DrawCardPanel'
import { AdvancedSettingsPanel } from '@/features/studio/AdvancedSettingsPanel'
import { ParameterPanel } from '@/features/studio/ParameterPanel'
import { PromptComposer } from '@/features/studio/PromptComposer'
import { StyleTokensPanel } from '@/features/studio/StyleTokensPanel'
import { StudioShellCallout } from '@/features/studio-shared/StudioShellCallout'
import type {
  StudioShellSectionViewModel,
  StudioWorkbenchMode,
} from '@/features/studio-shared/studioShell.adapters'

export type StudioEditorColumnProps = {
  mode: StudioWorkbenchMode
  shell: StudioShellSectionViewModel
  topSlot?: ReactNode
  bottomSlot?: ReactNode
  promptProps: ComponentProps<typeof PromptComposer>
  parameterProps: ComponentProps<typeof ParameterPanel>
  advancedProps: ComponentProps<typeof AdvancedSettingsPanel>
  styleTokenProps: ComponentProps<typeof StyleTokensPanel>
  drawProps: ComponentProps<typeof DrawCardPanel>
}

export function StudioEditorColumn({
  mode,
  shell,
  topSlot,
  bottomSlot,
  promptProps,
  parameterProps,
  advancedProps,
  styleTokenProps,
  drawProps,
}: StudioEditorColumnProps) {
  const showProControls = mode === 'pro'

  return (
    <div className="space-y-6" data-workbench-mode={mode}>
      <StudioShellCallout
        eyebrow={shell.eyebrow}
        title={shell.title}
        description={shell.description}
      />
      {topSlot}
      <PromptComposer {...promptProps} />
      <ParameterPanel {...parameterProps} />
      {showProControls ? (
        <>
          <div className="studio-advanced-grid">
            <AdvancedSettingsPanel {...advancedProps} />
            <StyleTokensPanel {...styleTokenProps} />
          </div>
          <DrawCardPanel {...drawProps} />
        </>
      ) : null}
      {bottomSlot}
    </div>
  )
}
