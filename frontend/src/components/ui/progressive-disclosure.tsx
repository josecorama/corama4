import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface ProgressiveDisclosureProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

export function ProgressiveDisclosure({ 
  title, 
  children, 
  defaultOpen = false, 
  className = '' 
}: ProgressiveDisclosureProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={`border border-gray-200 rounded-lg ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-gray-900">{title}</span>
        {isOpen ? (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-500" />
        )}
      </button>
      
      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-200">
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
