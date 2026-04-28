import { describe, it, expect } from 'vitest'
import { cn } from '../cn'

describe('cn', () => {
  it('returns an empty string for no arguments', () => {
    expect(cn()).toBe('')
  })

  it('joins two class strings with a space', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('joins multiple class strings', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('filters out undefined', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar')
  })

  it('filters out null', () => {
    expect(cn('foo', null, 'bar')).toBe('foo bar')
  })

  it('filters out false', () => {
    expect(cn('foo', false, 'bar')).toBe('foo bar')
  })

  it('filters out all falsy values at once', () => {
    expect(cn(undefined, null, false, 'real')).toBe('real')
  })

  it('handles a single class string', () => {
    expect(cn('only')).toBe('only')
  })

  it('returns empty string when all arguments are falsy', () => {
    expect(cn(undefined, null, false)).toBe('')
  })

  it('preserves class strings that contain spaces', () => {
    expect(cn('p-2 m-2', 'text-sm')).toBe('p-2 m-2 text-sm')
  })
})
