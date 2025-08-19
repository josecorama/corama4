import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import CreditPurchaseForm from '../components/payment/CreditPurchaseForm'
import SubscriptionForm from '../components/payment/SubscriptionForm'
import { 
  ArrowLeft, 
  Sparkles, 
  Check, 
  Zap,
  Crown,
  Star,
  CreditCard
} from 'lucide-react'

const PricingPage = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [showCreditPurchase, setShowCreditPurchase] = useState(false)
  const [showSubscription, setShowSubscription] = useState(false)
  const [selectedCreditPack, setSelectedCreditPack] = useState<{credits: number, price: number} | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<{name: string, priceId: string, price: number} | null>(null)

  const plans = [
    {
      name: 'Free',
      price: { monthly: 0, annual: 0 },
      priceId: { monthly: '', annual: '' },
      description: 'Perfect for getting started',
      features: [
        'Basic contract search',
        'Company profile creation',
        'Basic dashboard',
        'Community support',
        '5 free AI credits/month'
      ],
      limitations: [
        'No AI capability statement generation',
        'No contract analysis',
        'No bid response generation'
      ],
      buttonText: 'Get Started Free',
      popular: false
    },
    {
      name: 'Professional',
      price: { monthly: 49, annual: 39 },
      priceId: { 
        monthly: 'price_1QQQQQQQQQQQQQQQQQQQQQQQpro_monthly', 
        annual: 'price_1QQQQQQQQQQQQQQQQQQQQQQQpro_yearly' 
      },
      description: 'For growing businesses',
      features: [
        'Everything in Free',
        '100 AI credits/month',
        'AI capability statement generation',
        'Basic contract analysis',
        'Document templates',
        'Email support',
        'Export to PDF/Word'
      ],
      buttonText: 'Start Professional',
      popular: true
    },
    {
      name: 'Enterprise',
      price: { monthly: 149, annual: 119 },
      priceId: { 
        monthly: 'price_1QQQQQQQQQQQQQQQQQQQQQQQent_monthly', 
        annual: 'price_1QQQQQQQQQQQQQQQQQQQQQQQent_yearly' 
      },
      description: 'For established contractors',
      features: [
        'Everything in Professional',
        '500 AI credits/month',
        'Advanced bid response generation',
        'Fine-tuned AI model collaboration',
        'Priority support',
        'Custom integrations',
        'Team collaboration tools',
        'Advanced analytics'
      ],
      buttonText: 'Start Enterprise',
      popular: false
    }
  ]

  const creditPacks = [
    {
      credits: 50,
      price: 19,
      description: 'Perfect for occasional use',
      savings: null
    },
    {
      credits: 150,
      price: 49,
      description: 'Most popular pack',
      savings: '15% savings'
    },
    {
      credits: 300,
      price: 89,
      description: 'Best value for heavy users',
      savings: '25% savings'
    }
  ]

  return (
    <div className="page-container bg-slate-900">
      <nav className="relative z-10 flex items-center justify-between w-full max-w-6xl mx-auto px-6 py-6 border-b border-white/10">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-white hover:text-blue-400 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Corama</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/login">
            <Button variant="ghost" className="text-white hover:bg-slate-700">
              Sign In
            </Button>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 w-full py-12">
        <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-slate-300 mb-8">
            Start free and scale as you grow. Pay only for the AI features you use.
          </p>
          
          <div className="flex items-center justify-center space-x-4 mb-8">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-400'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${billingCycle === 'annual' ? 'text-white' : 'text-slate-400'}`}>
              Annual
            </span>
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
              Save 20%
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
        >
          {plans.map((plan, _index) => (
            <Card
              key={plan.name}
              className={`relative bg-white/10 backdrop-blur-lg border-white/20 ${
                plan.popular ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                    <Star className="w-4 h-4 mr-1" />
                    Most Popular
                  </span>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-white text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-slate-300">{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-white">
                    ${plan.price[billingCycle]}
                  </span>
                  <span className="text-slate-300 ml-2">
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-slate-300">
                      <Check className="w-4 h-4 text-green-400 mr-3 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Button
                  className={`w-full ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white'
                  }`}
                  onClick={() => {
                    if (plan.name === 'Free') {
                      window.location.href = '/register'
                    } else {
                      setSelectedPlan({
                        name: plan.name,
                        priceId: plan.priceId[billingCycle],
                        price: plan.price[billingCycle]
                      })
                      setShowSubscription(true)
                    }
                  }}
                >
                  {plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Need More AI Credits?
            </h2>
            <p className="text-slate-300 text-lg">
              Purchase additional credits as needed. Credits never expire.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {creditPacks.map((pack, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-white text-xl">
                    {pack.credits} Credits
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    {pack.description}
                  </CardDescription>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-white">${pack.price}</span>
                    {pack.savings && (
                      <div className="text-green-400 text-sm mt-1">{pack.savings}</div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                    onClick={() => {
                      setSelectedCreditPack({
                        credits: pack.credits,
                        price: pack.price * 100 // Convert to cents for Stripe
                      })
                      setShowCreditPurchase(true)
                    }}
                  >
                    Purchase Credits
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 backdrop-blur-lg rounded-3xl p-8 border border-white/10"
        >
          <div className="text-center">
            <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-4">
              What do AI Credits get you?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-white font-medium mb-2">Capability Statements</h3>
                <p className="text-slate-300 text-sm">5 credits per generation</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-white font-medium mb-2">Contract Analysis</h3>
                <p className="text-slate-300 text-sm">3 credits per analysis</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-white font-medium mb-2">Bid Responses</h3>
                <p className="text-slate-300 text-sm">10 credits per response</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Crown className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-white font-medium mb-2">AI Collaboration</h3>
                <p className="text-slate-300 text-sm">2 credits per session</p>
              </div>
            </div>
          </div>
        </motion.div>
        </div>
      </main>

      {/* Credit Purchase Dialog */}
      <Dialog open={showCreditPurchase} onOpenChange={setShowCreditPurchase}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Purchase AI Credits</DialogTitle>
          </DialogHeader>
          {selectedCreditPack && (
            <CreditPurchaseForm
              credits={selectedCreditPack.credits}
              price={selectedCreditPack.price}
              onSuccess={() => {
                setShowCreditPurchase(false)
                setSelectedCreditPack(null)
                window.location.href = '/dashboard'
              }}
              onCancel={() => {
                setShowCreditPurchase(false)
                setSelectedCreditPack(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Subscription Dialog */}
      <Dialog open={showSubscription} onOpenChange={setShowSubscription}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Subscribe to Plan</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <SubscriptionForm
              planName={selectedPlan.name}
              priceId={selectedPlan.priceId}
              price={selectedPlan.price}
              billing={billingCycle}
              onSuccess={() => {
                setShowSubscription(false)
                setSelectedPlan(null)
                window.location.href = '/dashboard'
              }}
              onCancel={() => {
                setShowSubscription(false)
                setSelectedPlan(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PricingPage
