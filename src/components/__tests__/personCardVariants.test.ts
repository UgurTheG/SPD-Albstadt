import { describe, it, expect } from 'vitest'
import { personCardContainerVariants, personCardItemVariants } from '../personCardVariants'

describe('personCardContainerVariants', () => {
  it('has a hidden variant', () => {
    expect(personCardContainerVariants).toHaveProperty('hidden')
  })

  it('has a visible variant with staggerChildren', () => {
    const visible = personCardContainerVariants.visible as {
      transition: { staggerChildren: number }
    }
    expect(visible.transition.staggerChildren).toBe(0.07)
  })
})

describe('personCardItemVariants', () => {
  it('hidden state has opacity 0 and y 25', () => {
    const hidden = personCardItemVariants.hidden as { opacity: number; y: number }
    expect(hidden.opacity).toBe(0)
    expect(hidden.y).toBe(25)
  })

  it('visible state has opacity 1 and y 0', () => {
    const visible = personCardItemVariants.visible as { opacity: number; y: number }
    expect(visible.opacity).toBe(1)
    expect(visible.y).toBe(0)
  })

  it('visible transition uses easeOut', () => {
    const visible = personCardItemVariants.visible as { transition: { ease: string } }
    expect(visible.transition.ease).toBe('easeOut')
  })
})
