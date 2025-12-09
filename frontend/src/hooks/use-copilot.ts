import { useState } from 'react'

export const useCopilot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [context, setContext] = useState<{ page: string; data?: any } | undefined>()

  const updateContext = (page: string, data?: any) => {
    setContext({ page, data })
  }

  return {
    isOpen,
    context,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
    updateContext
  }
}
