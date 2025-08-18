import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, FileText, Search, Shield, Zap } from 'lucide-react'
import { Button } from '../components/ui/button'

const LandingPage = () => {
  return (
    <div className="page-container">
      <header className="container" aria-label="Top navigation">
        <nav className="flex items-center justify-between py-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-2"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Corama</span>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-4"
          >
            <Link to="/login">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                Pricing
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
                Get Started
              </Button>
            </Link>
          </motion.div>
        </nav>
      </header>

      <main>
        <section className="hero container">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white font-bold mb-6"
            style={{ fontSize: 'var(--text-xxl)' }}
          >
            AI-Powered
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent block">
              Contract Matching
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-slate-300 mb-8"
            style={{ fontSize: 'var(--text-lg)', maxInlineSize: '65ch', margin: '0 auto var(--space-6)' }}
          >
            Create professional capability statements and discover matching government contracts with the power of AI
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="cta"
          >
            <Link to="/register">
              <button className="cta btn">
                Start Building Now →
              </button>
            </Link>
            <input className="cta input" placeholder="Search NAICS / keywords…" />
          </motion.div>
        </section>

        <section className="container">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="features"
          >
            <article className="card">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-6">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">AI Capability Builder</h3>
              <p className="text-slate-300">Generate professional capability statements with AI assistance, tailored to government contracting standards.</p>
            </article>
            
            <article className="card">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-6">
                <Search className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Smart Contract Matching</h3>
              <p className="text-slate-300">Discover relevant government contracts using AI-powered matching based on your capabilities and experience.</p>
            </article>
            
            <article className="card">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Secure Document Management</h3>
              <p className="text-slate-300">Store and manage your documents securely with automated backup and version control systems.</p>
            </article>
          </motion.div>
        </section>

        <section className="container">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-center py-16"
          >
            <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 backdrop-blur-lg rounded-3xl p-12 border border-white/10 no-stretch">
              <Zap className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                Ready to Transform Your Contracting Process?
              </h2>
              <p className="text-xl text-slate-300 mb-8" style={{ maxInlineSize: '65ch', margin: '0 auto var(--space-6)' }}>
                Join thousands of businesses already using Corama to streamline their government contracting workflow
              </p>
              <Link to="/register">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-12 py-4 text-lg">
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="container">
        <div className="flex flex-col md:flex-row justify-between items-center py-12 border-t border-white/10 mt-20">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Corama</span>
          </div>
          <p className="text-slate-400">© 2024 Corama. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}

export default LandingPage
