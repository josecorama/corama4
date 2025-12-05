import { Search, FileText, CheckCircle, Target, TrendingUp, Clock, ArrowRight } from 'lucide-react'

const LandingPage = () => {
  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B0B0F]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-corama-teal font-poppins font-bold text-lg sm:text-xl">CORAMA</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-4 lg:gap-8">
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">IHCC</a>
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">Support</a>
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">FAQ</a>
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">About Us</a>
          </nav>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <a href="/login" className="text-white font-poppins text-xs sm:text-sm hover:text-corama-teal transition-colors">Log In</a>
            <a href="/signup" className="bg-corama-teal text-[#0B0B0F] font-poppins text-xs sm:text-sm font-semibold px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg hover:bg-[#99c8ca] transition-colors">Sign up</a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6 relative overflow-hidden">
        {/* Layer 0: Soft teal glow backgrounds - diffused elliptical gradients */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {/* Main teal glow - top left, tilted ellipse effect */}
          <div className="absolute top-[10%] left-[20%] w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.3)_0%,rgba(26,58,74,0.2)_40%,transparent_70%)] -rotate-6"></div>
          {/* Secondary teal glow - center */}
          <div className="absolute top-[30%] left-[30%] w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.25)_0%,transparent_60%)]"></div>
          {/* Subtle dark blue glow */}
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(26,58,74,0.25)_0%,transparent_70%)]"></div>
        </div>
        
        {/* Layer 1: Orbital lines decoration */}
        <div className="absolute inset-0 pointer-events-none z-[1]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-corama-teal/15 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-corama-teal/8 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] border border-corama-teal/5 rounded-full"></div>
        </div>
        
        {/* Layer 2: Decorative dots/stars */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-corama-teal rounded-full opacity-60 hidden sm:block animate-pulse z-[2]"></div>
        <div className="absolute top-40 right-20 w-3 h-3 bg-corama-teal/50 rounded-full hidden sm:block z-[2]"></div>
        <div className="absolute bottom-20 left-1/4 w-2 h-2 bg-corama-teal/30 rounded-full hidden sm:block z-[2]"></div>
        <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white/40 rounded-full hidden sm:block z-[2]"></div>
        <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-corama-teal/60 rounded-full hidden sm:block z-[2]"></div>
        
        {/* Layer 10: Content */}
        <div className="max-w-4xl mx-auto text-center relative z-10 animate-fade-in">
          <h1 className="font-inter font-black text-4xl sm:text-5xl md:text-7xl text-white mb-4 sm:mb-6 leading-tight tracking-tight">
            With AI Find<br />Contracts
          </h1>
          <p className="text-gray-400 font-poppins text-sm sm:text-base lg:text-lg max-w-2xl mx-auto mb-8 sm:mb-10 px-2 leading-relaxed">
            From finding the right contracts to automating winning proposals. Contract Radar Maximizer revolutionizes government contracting streamlining processes, boosting efficiency, and giving you a competitive edge.
          </p>
          <a 
            href="/login" 
            className="inline-flex items-center gap-2 bg-[#0B0B0F] border-2 border-corama-teal text-white font-poppins font-semibold px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg hover:bg-corama-teal hover:text-[#0B0B0F] transition-all text-sm sm:text-base shadow-[0_0_30px_rgba(107,180,181,0.3)] hover:shadow-[0_0_40px_rgba(107,180,181,0.5)]"
          >
            Get Started
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
        {/* Layer 0: Soft teal glow backgrounds - diffused elliptical gradients */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {/* Top-left teal glow */}
          <div className="absolute top-0 -left-32 w-[700px] h-[450px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.25)_0%,rgba(26,58,74,0.15)_40%,transparent_70%)] -rotate-6"></div>
          {/* Bottom-right teal glow */}
          <div className="absolute bottom-0 -right-32 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.2)_0%,rgba(26,58,74,0.12)_40%,transparent_70%)] -rotate-6"></div>
        </div>
        
        {/* Decorative stars - more visible */}
        <div className="absolute top-16 left-16 text-corama-teal hidden lg:block">
          <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor" className="opacity-50">
            <path d="M10 0L12 8L20 10L12 12L10 20L8 12L0 10L8 8L10 0Z"/>
          </svg>
        </div>
        <div className="absolute top-32 right-24 text-corama-teal hidden lg:block">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" className="opacity-40">
            <path d="M10 0L12 8L20 10L12 12L10 20L8 12L0 10L8 8L10 0Z"/>
          </svg>
        </div>
        <div className="absolute bottom-32 right-16 text-corama-teal hidden lg:block">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="opacity-35">
            <path d="M10 0L12 8L20 10L12 12L10 20L8 12L0 10L8 8L10 0Z"/>
          </svg>
        </div>
        <div className="absolute bottom-48 left-24 text-corama-teal hidden lg:block">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="opacity-30">
            <path d="M10 0L12 8L20 10L12 12L10 20L8 12L0 10L8 8L10 0Z"/>
          </svg>
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {/* Feature 1 - Smart Contract Matching */}
            <div className="bg-gradient-to-br from-[#0f1a24]/80 via-[#0d1620]/60 to-[#0B0B0F]/40 border border-corama-teal/10 rounded-3xl p-6 sm:p-8 hover:border-corama-teal/30 transition-all group shadow-[0_0_50px_rgba(107,180,181,0.12)] hover:shadow-[0_0_70px_rgba(107,180,181,0.2)]">
              <div className="w-16 h-16 sm:w-18 sm:h-18 bg-corama-teal/20 rounded-full flex items-center justify-center mb-5 sm:mb-6 group-hover:bg-corama-teal/30 transition-all shadow-[0_0_30px_rgba(107,180,181,0.4)] relative">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(107,180,181,0.3)_0%,transparent_70%)]"></div>
                <Search className="text-corama-teal relative z-10" size={28} />
              </div>
              <h3 className="font-inter font-bold text-lg sm:text-xl text-white mb-3 sm:mb-4">Smart Contract Matching</h3>
              <p className="text-gray-400 font-poppins text-sm leading-relaxed mb-5 sm:mb-6">
                Our AI analyzes thousands of contracts in seconds, using advanced vector similarity to find opportunities perfectly matched to your capabilities and experience.
              </p>
              <a href="/login" className="inline-flex items-center gap-2 text-corama-teal font-poppins text-sm hover:gap-3 transition-all opacity-80 hover:opacity-100">
                Get Started <ArrowRight size={14} />
              </a>
            </div>

            {/* Feature 2 - Automated Proposal Generation */}
            <div className="bg-gradient-to-br from-[#0f1a24]/80 via-[#0d1620]/60 to-[#0B0B0F]/40 border border-corama-teal/10 rounded-3xl p-6 sm:p-8 hover:border-corama-teal/30 transition-all group shadow-[0_0_50px_rgba(107,180,181,0.12)] hover:shadow-[0_0_70px_rgba(107,180,181,0.2)]">
              <div className="w-16 h-16 sm:w-18 sm:h-18 bg-corama-teal/20 rounded-full flex items-center justify-center mb-5 sm:mb-6 group-hover:bg-corama-teal/30 transition-all shadow-[0_0_30px_rgba(107,180,181,0.4)] relative">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(107,180,181,0.3)_0%,transparent_70%)]"></div>
                <FileText className="text-corama-teal relative z-10" size={28} />
              </div>
              <h3 className="font-inter font-bold text-lg sm:text-xl text-white mb-3 sm:mb-4">Automated Proposal Generation</h3>
              <p className="text-gray-400 font-poppins text-sm leading-relaxed mb-5 sm:mb-6">
                Generate compelling, tailored bid responses instantly. Our AI assistant crafts professional proposals that highlight your strengths and address specific requirements.
              </p>
              <button onClick={scrollToFeatures} className="inline-flex items-center gap-2 text-corama-teal font-poppins text-sm hover:gap-3 transition-all opacity-80 hover:opacity-100">
                Learn More <ArrowRight size={14} />
              </button>
            </div>

            {/* Feature 3 - Compliance Intelligence */}
            <div className="bg-gradient-to-br from-[#0f1a24]/80 via-[#0d1620]/60 to-[#0B0B0F]/40 border border-corama-teal/10 rounded-3xl p-6 sm:p-8 hover:border-corama-teal/30 transition-all group shadow-[0_0_50px_rgba(107,180,181,0.12)] hover:shadow-[0_0_70px_rgba(107,180,181,0.2)]">
              <div className="w-16 h-16 sm:w-18 sm:h-18 bg-corama-teal/20 rounded-full flex items-center justify-center mb-5 sm:mb-6 group-hover:bg-corama-teal/30 transition-all shadow-[0_0_30px_rgba(107,180,181,0.4)] relative">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(107,180,181,0.3)_0%,transparent_70%)]"></div>
                <CheckCircle className="text-corama-teal relative z-10" size={28} />
              </div>
              <h3 className="font-inter font-bold text-lg sm:text-xl text-white mb-3 sm:mb-4">Compliance Intelligence</h3>
              <p className="text-gray-400 font-poppins text-sm leading-relaxed mb-5 sm:mb-6">
                Never miss a requirement again. AI-powered compliance checking ensures your proposals meet all specifications and regulatory standards automatically.
              </p>
              <button onClick={scrollToFeatures} className="inline-flex items-center gap-2 text-corama-teal font-poppins text-sm hover:gap-3 transition-all opacity-80 hover:opacity-100">
                Learn More <ArrowRight size={14} />
              </button>
            </div>

            {/* Feature 4 - Win Probability Scoring */}
            <div className="bg-gradient-to-br from-[#0f1a24]/80 via-[#0d1620]/60 to-[#0B0B0F]/40 border border-corama-teal/10 rounded-3xl p-6 sm:p-8 hover:border-corama-teal/30 transition-all group shadow-[0_0_50px_rgba(107,180,181,0.12)] hover:shadow-[0_0_70px_rgba(107,180,181,0.2)]">
              <div className="w-16 h-16 sm:w-18 sm:h-18 bg-corama-teal/20 rounded-full flex items-center justify-center mb-5 sm:mb-6 group-hover:bg-corama-teal/30 transition-all shadow-[0_0_30px_rgba(107,180,181,0.4)] relative">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(107,180,181,0.3)_0%,transparent_70%)]"></div>
                <Target className="text-corama-teal relative z-10" size={28} />
              </div>
              <h3 className="font-inter font-bold text-lg sm:text-xl text-white mb-3 sm:mb-4">Win Probability Scoring</h3>
              <p className="text-gray-400 font-poppins text-sm leading-relaxed mb-5 sm:mb-6">
                Get real-time insights into your chances of success. Our predictive AI analyzes historical data to score opportunities and optimize your bidding strategy.
              </p>
              <a href="/login" className="inline-flex items-center gap-2 text-corama-teal font-poppins text-sm hover:gap-3 transition-all opacity-80 hover:opacity-100">
                Get Started <ArrowRight size={14} />
              </a>
            </div>

            {/* Feature 5 - Intelligent Market Research */}
            <div className="bg-gradient-to-br from-[#0f1a24]/80 via-[#0d1620]/60 to-[#0B0B0F]/40 border border-corama-teal/10 rounded-3xl p-6 sm:p-8 hover:border-corama-teal/30 transition-all group shadow-[0_0_50px_rgba(107,180,181,0.12)] hover:shadow-[0_0_70px_rgba(107,180,181,0.2)]">
              <div className="w-16 h-16 sm:w-18 sm:h-18 bg-corama-teal/20 rounded-full flex items-center justify-center mb-5 sm:mb-6 group-hover:bg-corama-teal/30 transition-all shadow-[0_0_30px_rgba(107,180,181,0.4)] relative">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(107,180,181,0.3)_0%,transparent_70%)]"></div>
                <TrendingUp className="text-corama-teal relative z-10" size={28} />
              </div>
              <h3 className="font-inter font-bold text-lg sm:text-xl text-white mb-3 sm:mb-4">Intelligent Market Research</h3>
              <p className="text-gray-400 font-poppins text-sm leading-relaxed mb-5 sm:mb-6">
                Stay ahead of the competition with AI-driven market intelligence. Discover trends, analyze competitors, and identify emerging opportunities automatically.
              </p>
              <button onClick={scrollToFeatures} className="inline-flex items-center gap-2 text-corama-teal font-poppins text-sm hover:gap-3 transition-all opacity-80 hover:opacity-100">
                Learn More <ArrowRight size={14} />
              </button>
            </div>

            {/* Feature 6 - Smart Deadline Management */}
            <div className="bg-gradient-to-br from-[#0f1a24]/80 via-[#0d1620]/60 to-[#0B0B0F]/40 border border-corama-teal/10 rounded-3xl p-6 sm:p-8 hover:border-corama-teal/30 transition-all group shadow-[0_0_50px_rgba(107,180,181,0.12)] hover:shadow-[0_0_70px_rgba(107,180,181,0.2)]">
              <div className="w-16 h-16 sm:w-18 sm:h-18 bg-corama-teal/20 rounded-full flex items-center justify-center mb-5 sm:mb-6 group-hover:bg-corama-teal/30 transition-all shadow-[0_0_30px_rgba(107,180,181,0.4)] relative">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(107,180,181,0.3)_0%,transparent_70%)]"></div>
                <Clock className="text-corama-teal relative z-10" size={28} />
              </div>
              <h3 className="font-inter font-bold text-lg sm:text-xl text-white mb-3 sm:mb-4">Smart Deadline Management</h3>
              <p className="text-gray-400 font-poppins text-sm leading-relaxed mb-5 sm:mb-6">
                Never miss another deadline. AI-powered scheduling and alerts keep you on track with automated reminders and priority-based task management.
              </p>
              <button onClick={scrollToFeatures} className="inline-flex items-center gap-2 text-corama-teal font-poppins text-sm hover:gap-3 transition-all opacity-80 hover:opacity-100">
                Learn More <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Scope of Work Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
        {/* Soft teal glow background */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/2 -left-32 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.25)_0%,rgba(26,58,74,0.15)_40%,transparent_70%)] -rotate-6 -translate-y-1/2"></div>
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="bg-gradient-to-br from-[#0f1a24] via-[#0d1620] to-[#0B0B0F] border border-corama-teal/20 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(107,180,181,0.1)]">
              <img 
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800" 
                alt="Work Station" 
                className="w-full h-56 sm:h-72 lg:h-80 object-cover"
                onError={(e) => { e.currentTarget.src = 'https://placehold.co/800x400/0b2c48/6bb4b5?text=Work+Station' }}
              />
            </div>
            <div className="text-center md:text-left">
              <h2 className="font-inter font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-5 sm:mb-6">Scope Of Work Station</h2>
              <p className="text-gray-400 font-poppins text-base sm:text-lg mb-8 leading-relaxed">
                Get the scope of work of your desired contract in minutes with clear, structured responses, and more.
              </p>
              <a 
                href="/login" 
                className="inline-flex items-center gap-2 bg-transparent border-2 border-white text-white font-poppins font-semibold px-8 py-3.5 rounded-lg hover:bg-white hover:text-[#0B0B0F] transition-all text-base"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Revolution Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative">
        {/* Section background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.1)_0%,transparent_70%)] rounded-full"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="font-inter font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-5 sm:mb-6 leading-tight">
            Revolutionizing Government<br />Contracting for Small<br />Businesses
          </h2>
          <p className="text-gray-400 font-poppins text-base sm:text-lg mb-8 max-w-3xl mx-auto px-2 leading-relaxed">
            Contract Radar Maximizer is a deep data science platform that integrates artificial intelligence and machine learning to assist small businesses in creating capability statements, identifying available government contracts in their area, and generating potential bid responses.
          </p>
          <button onClick={scrollToFeatures} className="inline-flex items-center gap-2 text-corama-teal font-poppins text-base hover:gap-3 transition-all">
            Learn More <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
        {/* Soft teal glow background */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/2 -left-32 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.25)_0%,rgba(26,58,74,0.15)_40%,transparent_70%)] -rotate-6 -translate-y-1/2"></div>
        </div>
        
        {/* Decorative star */}
        <div className="absolute top-20 left-10 text-corama-teal/30 hidden lg:block">
          <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 0L12 8L20 10L12 12L10 20L8 12L0 10L8 8L10 0Z"/>
          </svg>
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="order-2 md:order-1">
              <div className="bg-gradient-to-br from-[#0f1a24] via-[#0d1620] to-[#0B0B0F] border border-corama-teal/20 rounded-2xl p-8 sm:p-12 shadow-[0_0_60px_rgba(107,180,181,0.1)]">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl text-gray-500 mb-4 font-poppins tracking-wider">CONTRACT</div>
                  <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-gradient-to-br from-corama-teal/30 to-corama-teal/10 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(107,180,181,0.3)]">
                    <CheckCircle className="text-corama-teal" size={36} />
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2 text-center md:text-left">
              <h2 className="font-inter font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-5 sm:mb-6">Mission</h2>
              <p className="text-gray-400 font-poppins text-base sm:text-lg mb-8 leading-relaxed">
                To facilitate small businesses' access to government contracts using cutting-edge technology to identify opportunities and maximize the probability of securing contracts.
              </p>
              <a 
                href="/login" 
                className="inline-flex items-center gap-2 bg-gradient-to-r from-corama-teal to-[#99c8ca] text-[#0B0B0F] font-poppins font-semibold px-8 py-3.5 rounded-lg hover:from-[#99c8ca] hover:to-corama-teal transition-all text-base shadow-[0_0_30px_rgba(107,180,181,0.3)]"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
        {/* Soft teal glow background */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/2 -right-32 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.25)_0%,rgba(26,58,74,0.15)_40%,transparent_70%)] -rotate-6 -translate-y-1/2"></div>
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="text-center md:text-left">
              <h2 className="font-inter font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-5 sm:mb-6">Vision</h2>
              <p className="text-gray-400 font-poppins text-base sm:text-lg mb-8 leading-relaxed">
                To empower communities through access to contracts, decentralizing the public economy by extracting value from the public-generated value.
              </p>
              <a 
                href="/login" 
                className="inline-flex items-center gap-2 bg-gradient-to-r from-corama-teal to-[#99c8ca] text-[#0B0B0F] font-poppins font-semibold px-8 py-3.5 rounded-lg hover:from-[#99c8ca] hover:to-corama-teal transition-all text-base shadow-[0_0_30px_rgba(107,180,181,0.3)]"
              >
                Get Started
              </a>
            </div>
            <div className="flex justify-center order-first md:order-last">
              {/* Hexagon grid pattern */}
              <div className="relative w-64 h-64 sm:w-80 sm:h-80">
                <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-corama-teal/40 rounded-lg transform rotate-45 shadow-[0_0_20px_rgba(107,180,181,0.3)]"></div>
                <div className="absolute top-12 right-16 w-14 h-14 sm:w-18 sm:h-18 bg-corama-teal/30 rounded-lg transform rotate-45"></div>
                <div className="absolute top-24 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-corama-teal/25 rounded-lg transform rotate-45"></div>
                <div className="absolute top-12 right-32 w-12 h-12 sm:w-16 sm:h-16 bg-corama-teal/20 rounded-lg transform rotate-45"></div>
                <div className="absolute top-24 right-16 w-14 h-14 sm:w-18 sm:h-18 bg-corama-teal/35 rounded-lg transform rotate-45 shadow-[0_0_15px_rgba(107,180,181,0.2)]"></div>
                <div className="absolute top-36 right-0 w-12 h-12 sm:w-16 sm:h-16 bg-corama-teal/15 rounded-lg transform rotate-45"></div>
                <div className="absolute top-36 right-32 w-14 h-14 sm:w-18 sm:h-18 bg-corama-teal/25 rounded-lg transform rotate-45"></div>
                <div className="absolute top-48 right-16 w-16 h-16 sm:w-20 sm:h-20 bg-corama-teal/30 rounded-lg transform rotate-45 shadow-[0_0_20px_rgba(107,180,181,0.25)]"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capturing Major State Procurement Wins Section */}
      <section className="pt-12 sm:pt-16 pb-4 sm:pb-6 px-2 sm:px-4 relative bg-[#0B0B0F]">
        <div className="max-w-7xl mx-auto text-center relative z-10 px-4">
          <h2 className="font-inter font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-5 sm:mb-6 leading-tight">
            Capturing Major State<br />Procurement Wins
          </h2>
          <p className="text-gray-400 font-poppins text-base sm:text-lg mb-6 max-w-3xl mx-auto px-2 leading-relaxed">
            "Each year over $17B in government contracts are awarded by the State of Illinois. However, most small businesses miss out on opportunities because of the complicated submission process, lack of capacity, and the process taking too much time, giving larger corporations advantages. Contract Radar Maximizer is an AI tool that gives small businesses a competitive advantage, making it easier and faster to submit government procurements."
          </p>
          
          {/* Learn More BETWEEN GLOWS - all items vertically centered */}
          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
            {/* Left hexagon group - pill wrapper with centered image (doubled size) */}
            <div
              className="relative flex items-center justify-center"
              style={{ width: '600px', height: '280px', flexShrink: 1 }}
            >
              {/* Glow with solid center, blurry edges */}
              <div className="pointer-events-none absolute inset-0 rounded-[999px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.6)_0%,rgba(107,180,181,0.5)_30%,rgba(107,180,181,0.2)_60%,rgba(11,11,15,0)_100%)] mix-blend-screen opacity-80 z-10"></div>
              <img
                src="/static/app/landing/hexagons.png"
                alt=""
                aria-hidden="true"
                className="relative z-20 max-w-[85%] h-auto"
              />
            </div>

            {/* Learn More button - centered between glows */}
            <button
              onClick={scrollToFeatures}
              style={{ flexShrink: 0 }}
              className="inline-flex items-center gap-2 text-corama-teal font-poppins text-base sm:text-lg hover:gap-3 transition-all whitespace-nowrap px-2"
            >
              Learn More <ArrowRight size={18} />
            </button>

            {/* Right hexagon group (mirrored) - pill wrapper with centered image (doubled size) */}
            <div
              className="relative flex items-center justify-center"
              style={{ width: '600px', height: '280px', flexShrink: 1 }}
            >
              {/* Glow with solid center, blurry edges */}
              <div className="pointer-events-none absolute inset-0 rounded-[999px] bg-[radial-gradient(ellipse_at_center,rgba(107,180,181,0.6)_0%,rgba(107,180,181,0.5)_30%,rgba(107,180,181,0.2)_60%,rgba(11,11,15,0)_100%)] mix-blend-screen opacity-80 z-10"></div>
              <img
                src="/static/app/landing/hexagons.png"
                alt=""
                aria-hidden="true"
                className="relative z-20 max-w-[85%] h-auto scale-x-[-1]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-4 sm:pt-6 pb-12 sm:pb-16 px-4 sm:px-6 bg-[#0B0B0F] relative">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-8">
            <p className="text-gray-400 font-poppins text-sm sm:text-base leading-relaxed">
              222 W. Merchandise Mart Plaza<br />
              Suite 1212 c/o 1871 Chicago, IL 60654
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mb-8 text-sm">
            <a href="#" className="text-gray-400 hover:text-corama-teal font-poppins transition-colors">Learn More About IHCC</a>
            <a href="#" className="text-gray-400 hover:text-corama-teal font-poppins transition-colors">Terms of Use</a>
            <a href="#" className="text-gray-400 hover:text-corama-teal font-poppins transition-colors">Policy Notice</a>
            <a href="#" className="text-gray-400 hover:text-corama-teal font-poppins transition-colors">Frequently Asked Questions</a>
            <a href="#" className="text-gray-400 hover:text-corama-teal font-poppins transition-colors">Contact</a>
          </div>
          
          <div className="text-center mb-8">
            <a href="mailto:info@corama.ai" className="text-gray-400 hover:text-corama-teal font-poppins text-sm transition-colors">
              Info@corama.ai
            </a>
          </div>
          
          {/* CORAMA Logo */}
          <div className="flex justify-center">
            <img 
              src="/static/app/landing/corama-logo.png" 
              alt="CORAMA" 
              className="h-16 sm:h-20 w-auto"
            />
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
