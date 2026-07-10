import { useAdminStore } from '../store'
import { resolvePendingPreview } from '../lib/images'
import type { FieldConfig } from '../types'

/**
 * Slugify a display name for use in an image filename. Falls back to `bild`
 * when the name yields no ASCII letters or digits (e.g. "Öz") so filenames
 * never start with a bare dash.
 */
export function imageNameSlug(name: unknown): string {
  const slug =
    typeof name === 'string'
      ? name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      : ''
  return slug || 'bild'
}

/**
 * Shared upload pipeline for image fields (ImageField, ImageListField):
 * derives the target path under `public/images/<imageDir>/`, registers the
 * cropped WebP as a pending upload, and surfaces the success toast.
 *
 * A timestamp is always appended to the slug to avoid filename collisions
 * between people with the same name in the same imageDir.
 */
export function useImageUpload(field: FieldConfig) {
  const addPendingUpload = useAdminStore(s => s.addPendingUpload)
  const setStatus = useAdminStore(s => s.setStatus)
  const pendingUploads = useAdminStore(s => s.pendingUploads)

  /** Resolves a not-yet-uploaded image URL to its base64 data URI so previews
   *  don't 404 before the pending upload is published. */
  const resolvePreview = (url: string) => resolvePendingPreview(pendingUploads, url)

  const registerUpload = (base64: string, baseName?: unknown) => {
    const nameSlug = `${imageNameSlug(baseName)}-${Date.now()}`
    const imageDir = field.imageDir || 'news'
    addPendingUpload({
      ghPath: `public/images/${imageDir}/${nameSlug}.webp`,
      base64,
      message: `admin: Bild ${nameSlug}.webp hochgeladen`,
    })
    setStatus('Bild vorbereitet — wird beim Veröffentlichen hochgeladen', 'success')
    return {
      publicUrl: `/images/${imageDir}/${nameSlug}.webp`,
      previewSrc: `data:image/webp;base64,${base64}`,
    }
  }

  return { resolvePreview, registerUpload }
}
