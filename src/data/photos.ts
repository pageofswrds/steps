import { Directory, File, Paths } from 'expo-file-system'

function entryDir(entryId: string): Directory {
  return new Directory(Paths.document, 'photos', entryId)
}

/**
 * Copies picked photos into the app's own storage so the journal keeps its
 * memories even if the originals are deleted from the photo library.
 * Returns the stored URIs. A photo that fails to copy is skipped.
 */
export async function importPhotos(entryId: string, sourceUris: string[]): Promise<string[]> {
  const dir = entryDir(entryId)
  if (!dir.exists) dir.create({ intermediates: true })
  const stored: string[] = []
  sourceUris.forEach((uri, index) => {
    try {
      const src = new File(uri)
      const dest = new File(dir, `${index}-${src.name}`)
      src.copySync(dest)
      stored.push(dest.uri)
    } catch (e) {
      console.warn(`photo copy failed, skipping: ${uri}`, e)
    }
  })
  return stored
}

/** Deletes all photo files belonging to an entry. */
export function deletePhotosForEntry(entryId: string): void {
  const dir = entryDir(entryId)
  if (dir.exists) dir.delete()
}
