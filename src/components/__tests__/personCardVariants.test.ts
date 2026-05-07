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
  it('hidden state has opacity 0', () => {
    const hidden = personCardItemVariants.hidden as { opacity: number }
    expect(hidden.opacity).toBe(0)
  })

  it('visible state has opacity 1', () => {
    const visible = personCardItemVariants.visible as { opacity: number }
    expect(visible.opacity).toBe(1)
  })

  it('visible transition uses easeOut', () => {
    const visible = personCardItemVariants.visible as { transition: { ease: string } }
    expect(visible.transition.ease).toBe('easeOut')
  })
})
