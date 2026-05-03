import { readBrowserValue, writeBrowserValue } from '@/shared/storage/browserDatabase'
import type { LocalGenerationTaskRecord } from './generationTask.types'

const generationRuntimeTasksStorageKey = 'new-pic:generation-runtime-tasks:v1'

export async function readStoredGenerationRuntimeTasks() {
  return readBrowserValue<LocalGenerationTaskRecord[]>(generationRuntimeTasksStorageKey, [])
}

export async function writeStoredGenerationRuntimeTasks(tasks: LocalGenerationTaskRecord[]) {
  await writeBrowserValue(generationRuntimeTasksStorageKey, tasks)
}
