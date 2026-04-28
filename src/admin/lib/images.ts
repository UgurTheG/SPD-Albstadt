export function fileToWebpBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/webp', 0.85).split(',')[1])
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
      reject(new Error('Bild konnte nicht geladen werden'))
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  })
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function collectImagePaths(
  tabConfig: {
    type: string
    fields?: { key: string; type: string }[]
    topFields?: { key: string; type: string }[]
    sections?: { key: string; fields: { key: string; type: string }[]; isSingleObject?: boolean }[]
  },
  data: Record<string, unknown>,
): Set<string> {
  const paths = new Set<string>()

  function scanFields(fields: { key: string; type: string }[], items: Record<string, unknown>[]) {
    for (const item of items) {
      for (const f of fields) {
        const val = item[f.key]
        if (f.type === 'image' && typeof val === 'string' && val.startsWith('/images/')) {
          paths.add(val)
        }
        if (f.type === 'imagelist' && Array.isArray(val)) {
          for (const url of val)
            if (typeof url === 'string' && url.startsWith('/images/')) paths.add(url)
        }
      }
    }
  }

  if (tabConfig.type === 'kommunalpolitik') {
    const jahre = (data as Record<string, unknown>).jahre
    if (Array.isArray(jahre)) {
      for (const jahr of jahre) {
        const j = jahr as Record<string, unknown>
        const imgField = [{ key: 'bildUrl', type: 'image' }]
        if (Array.isArray(j.gemeinderaete))
          scanFields(imgField, j.gemeinderaete as Record<string, unknown>[])
        if (Array.isArray(j.kreisraete))
          scanFields(imgField, j.kreisraete as Record<string, unknown>[])
        if (Array.isArray(j.dokumente)) {
          for (const dok of j.dokumente as Record<string, unknown>[]) {
            if (typeof dok.url === 'string' && dok.url.startsWith('/dokumente/')) {
              paths.add(dok.url)
            }
          }
        }
      }
    }
  } else if (tabConfig.type === 'array' && tabConfig.fields) {
    scanFields(tabConfig.fields, data as unknown as Record<string, unknown>[])
  } else {
    if (tabConfig.topFields) {
      scanFields(tabConfig.topFields, [data])
    }
    if (tabConfig.sections) {
      for (const sec of tabConfig.sections) {
        const val = (data as Record<string, unknown>)[sec.key]
        if (sec.isSingleObject) {
          if (val && typeof val === 'object') {
            scanFields(sec.fields, [val as Record<string, unknown>])
          }
        } else if (Array.isArray(val)) {
          scanFields(sec.fields, val as Record<string, unknown>[])
        }
      }
    }
  }
  return paths
}
