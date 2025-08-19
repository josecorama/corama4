import React, { ReactNode } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { stripePromise } from '../lib/stripe'

interface StripeProviderProps {
  children: ReactNode
}

export const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  )
}
