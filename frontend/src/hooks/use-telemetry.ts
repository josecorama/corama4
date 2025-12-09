import { useCallback } from 'react'

interface TelemetryEvent {
  event: string
  properties?: Record<string, any>
  timestamp?: number
}

export const useTelemetry = () => {
  const track = useCallback((event: string, properties?: Record<string, any>) => {
    const telemetryEvent: TelemetryEvent = {
      event,
      properties: {
        ...properties,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    }

    console.log('Telemetry Event:', telemetryEvent)
    
    try {
      const events = JSON.parse(localStorage.getItem('telemetry_events') || '[]')
      events.push(telemetryEvent)
      
      if (events.length > 100) {
        events.splice(0, events.length - 100)
      }
      
      localStorage.setItem('telemetry_events', JSON.stringify(events))
    } catch (error) {
      console.error('Failed to store telemetry event:', error)
    }
  }, [])

  const trackPageView = useCallback((page: string) => {
    track('page_view', { page })
  }, [track])

  const trackCommandPaletteUsage = useCallback((command: string) => {
    track('command_palette_used', { command })
  }, [track])

  const trackCopilotInteraction = useCallback((action: string, context?: string) => {
    track('copilot_interaction', { action, context })
  }, [track])

  const trackQuoteGeneration = useCallback((productType: string, amount: number) => {
    track('quote_generated', { productType, amount })
  }, [track])

  const trackMexicanGovernmentFeature = useCallback((feature: string, entity?: string) => {
    track('mexican_government_feature', { feature, entity })
  }, [track])

  return {
    track,
    trackPageView,
    trackCommandPaletteUsage,
    trackCopilotInteraction,
    trackQuoteGeneration,
    trackMexicanGovernmentFeature
  }
}
