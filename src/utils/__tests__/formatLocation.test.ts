import { describe, it, expect } from 'vitest'
import { formatLocation } from '../formatLocation'

describe('formatLocation', () => {
  it('returns an empty array for an empty string', () => {
    expect(formatLocation('')).toEqual([])
  })

  it('splits on literal newline characters', () => {
    expect(formatLocation('Hauptstraße 1\nAlbstadt')).toEqual(['Hauptstraße 1', 'Albstadt'])
  })

  it('splits on commas', () => {
    expect(formatLocation('Hauptstraße 1, Albstadt')).toEqual(['Hauptstraße 1', 'Albstadt'])
  })

  it('trims whitespace from each segment', () => {
    expect(formatLocation('  Line 1  \n  Line 2  ')).toEqual(['Line 1', 'Line 2'])
  })

  it('filters out blank segments produced by consecutive separators', () => {
    expect(formatLocation('A,,B')).toEqual(['A', 'B'])
  })

  it('handles a string with only whitespace/separators', () => {
    expect(formatLocation(',, \n ')).toEqual([])
  })

  it('returns a single-element array when there is no separator', () => {
    expect(formatLocation('Albstadthalle')).toEqual(['Albstadthalle'])
  })

  it('handles mixed comma and newline separators', () => {
    expect(formatLocation('Room 1,\nBuilding 2\nCity')).toEqual(['Room 1', 'Building 2', 'City'])
  })
})
