import { type ChangeEvent, type FormEvent, useState } from 'react'
import { useConfig } from './useConfig'

interface FormData {
  name: string
  email: string
  betreff: string
  nachricht: string
}

const INITIAL_FORM: FormData = { name: '', email: '', betreff: '', nachricht: '' }

type Status = 'idle' | 'sending' | 'success' | 'error'

/**
 * Encapsulates all form state and submission logic for the Kontakt section.
 *
 * - Falls back to a simulated success (demo mode) when no Formspree URL is configured.
 * - Never hard-code a real Formspree ID here — set it in /data/config.json instead.
 */
export function useKontaktForm() {
  const config = useConfig()
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)
  const [status, setStatus] = useState<Status>('idle')

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('sending')

    const formspreeUrl = config?.kontakt?.formspreeUrl ?? ''

    if (!formspreeUrl) {
      // Demo mode: simulate success without hitting a real endpoint
      await new Promise(r => setTimeout(r, 1200))
      setStatus('success')
      setFormData(INITIAL_FORM)
      return
    }

    try {
      const res = await fetch(formspreeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setStatus('success')
        setFormData(INITIAL_FORM)
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  /** Call to let the user write a new message after a successful send. */
  const reset = () => setStatus('idle')

  return { formData, status, handleChange, handleSubmit, reset }
}
