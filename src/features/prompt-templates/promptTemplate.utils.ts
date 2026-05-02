export function createPromptTemplateTitle(content: string) {
  const firstLine = content.split('\n').find((line) => line.trim())?.trim() ?? 'Prompt 模板'
  return firstLine.length > 28 ? `${firstLine.slice(0, 28)}…` : firstLine
}
