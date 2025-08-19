import React, { useState } from 'react'
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Crown, Loader2 } from 'lucide-react'

interface SubscriptionFormProps {
  planName: string
  priceId: string
  price: number
  billing: 'monthly' | 'annual'
  onSuccess: () => void
  onCancel: () => void
}

const SubscriptionForm: React.FC<SubscriptionFormProps> = ({
  planName,
  priceId,
  price,
  billing,
  onSuccess,
  onCancel
}) => {
  const stripe = useStripe()
  const elements = useElements()
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!stripe || !elements || !user) {
      return
    }

    setLoading(true)
    setError('')

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setError('Card element not found')
      setLoading(false)
      return
    }

    try {
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      })

      if (paymentMethodError) {
        setError(paymentMethodError.message || 'Payment method creation failed')
        setLoading(false)
        return
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/subscriptions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          price_id: priceId,
          payment_method_id: paymentMethod.id
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        onSuccess()
      } else {
        setError(result.detail || 'Subscription creation failed')
      }
    } catch (err) {
      setError('Subscription processing failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5" />
          Subscribe to {planName}
        </CardTitle>
        <CardDescription>
          ${price}/{billing === 'monthly' ? 'month' : 'year'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 border rounded-lg">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                },
              }}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!stripe || loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Subscribe for $${price}/${billing === 'monthly' ? 'mo' : 'yr'}`
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default SubscriptionForm
