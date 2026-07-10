/**
 * Tests for the shared image-upload pipeline (useImageUpload / imageNameSlug)
 * used by ImageField and ImageListField.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAdminStore } from '../../admin/store'
import { imageNameSlug, useImageUpload } from '../../admin/hooks/useImageUpload'
import type { FieldConfig } from '../../admin/types'

const field: FieldConfig = {
  key: 'bildUrl',
  label: 'Profilbild',
  type: 'image',
  imageDir: 'vorstand',
}

describe('imageNameSlug', () => {
  it('slugifies names to lowercase ascii with dashes', () => {
    expect(imageNameSlug('Max Müller')).toBe('max-m-ller')
  })

  it('falls back to "bild" when the name yields no ascii characters', () => {
    expect(imageNameSlug('Öß')).toBe('bild')
    expect(imageNameSlug('')).toBe('bild')
    expect(imageNameSlug(undefined)).toBe('bild')
    expect(imageNameSlug(42)).toBe('bild')
  })

  it('trims leading and trailing dashes', () => {
    expect(imageNameSlug('  Anna  ')).toBe('anna')
  })
})

describe('useImageUpload', () => {
  beforeEach(() => {
    useAdminStore.setState({
      pendingUploads: [],
      activeTab: 'party',
      statusMessage: '',
      statusType: 'info',
    })
  })

  it('registers a pending upload under the field imageDir and returns URLs', () => {
    const { result } = renderHook(() => useImageUpload(field))
    let out: { publicUrl: string; previewSrc: string } | undefined
    act(() => {
      out = result.current.registerUpload('QUJD', 'Max Müller')
    })
    expect(out!.publicUrl).toMatch(/^\/images\/vorstand\/max-m-ller-\d+\.webp$/)
    expect(out!.previewSrc).toBe('data:image/webp;base64,QUJD')

    const uploads = useAdminStore.getState().pendingUploads
    expect(uploads).toHaveLength(1)
    expect(uploads[0].ghPath).toBe('public' + out!.publicUrl)
    expect(uploads[0].base64).toBe('QUJD')
    expect(uploads[0].tabKey).toBe('party')
    expect(useAdminStore.getState().statusType).toBe('success')
  })

  it('defaults to the news imageDir and the bild slug', () => {
    const { result } = renderHook(() =>
      useImageUpload({ key: 'bildUrls', label: 'Bilder', type: 'imagelist' }),
    )
    let out: { publicUrl: string } | undefined
    act(() => {
      out = result.current.registerUpload('QUJD')
    })
    expect(out!.publicUrl).toMatch(/^\/images\/news\/bild-\d+\.webp$/)
  })

  it('resolvePreview maps a pending URL to its data URI and passes others through', () => {
    const { result, rerender } = renderHook(() => useImageUpload(field))
    let publicUrl = ''
    act(() => {
      publicUrl = result.current.registerUpload('QUJD').publicUrl
    })
    rerender()
    expect(result.current.resolvePreview(publicUrl)).toBe('data:image/webp;base64,QUJD')
    expect(result.current.resolvePreview('/images/andere.webp')).toBe('/images/andere.webp')
    expect(result.current.resolvePreview('')).toBe('')
  })
})
