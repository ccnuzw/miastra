import type { ComponentProps } from 'react'
import { DrawCardPanel } from '@/features/draw-card/DrawCardPanel'
import { AdvancedSettingsPanel } from '@/features/studio/AdvancedSettingsPanel'
import { ParameterPanel } from '@/features/studio/ParameterPanel'
import { PromptComposer } from '@/features/studio/PromptComposer'
import { StyleTokensPanel } from '@/features/studio/StyleTokensPanel'

type StudioEditorColumnProps = {
  promptProps: ComponentProps<typeof PromptComposer>
  parameterProps: ComponentProps<typeof ParameterPanel>
  advancedProps: ComponentProps<typeof AdvancedSettingsPanel>
  styleTokenProps: ComponentProps<typeof StyleTokensPanel>
  drawProps: ComponentProps<typeof DrawCardPanel>
}

export function StudioEditorColumn({
  promptProps,
  parameterProps,
  advancedProps,
  styleTokenProps,
  drawProps,
}: StudioEditorColumnProps) {
  return (
    <div className="space-y-6">
      <PromptComposer {...promptProps} />
      <ParameterPanel {...parameterProps} />
      <div className="studio-advanced-grid">
        <AdvancedSettingsPanel {...advancedProps} />
        <StyleTokensPanel {...styleTokenProps} />
      </div>
      <DrawCardPanel {...drawProps} />
    </div>
  )
}
