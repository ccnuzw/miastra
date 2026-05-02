import type { ComponentProps } from 'react'
import { DrawCardPanel } from '@/features/draw-card/DrawCardPanel'
import { ParameterPanel } from '@/features/studio/ParameterPanel'
import { PromptComposer } from '@/features/studio/PromptComposer'
import { StyleTokensPanel } from '@/features/studio/StyleTokensPanel'

type StudioEditorColumnProps = {
  promptProps: ComponentProps<typeof PromptComposer>
  parameterProps: ComponentProps<typeof ParameterPanel>
  styleTokenProps: ComponentProps<typeof StyleTokensPanel>
  drawProps: ComponentProps<typeof DrawCardPanel>
}

export function StudioEditorColumn({ promptProps, parameterProps, styleTokenProps, drawProps }: StudioEditorColumnProps) {
  return (
    <div className="space-y-6">
      <PromptComposer {...promptProps} />
      <ParameterPanel {...parameterProps} />
      <StyleTokensPanel {...styleTokenProps} />
      <DrawCardPanel {...drawProps} />
    </div>
  )
}
