import { Link } from 'react-router-dom'
import { Search, FileText, CheckCircle, Target, TrendingUp, Clock, ArrowRight } from 'lucide-react'

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-corama-dark">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-corama-dark/90 backdrop-blur-sm border-b border-corama-darker">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-poppins font-bold text-lg sm:text-xl">CORAMA</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-4 lg:gap-8">
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">IHCC</a>
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">Support</a>
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">FAQ</a>
            <a href="#" className="text-gray-300 hover:text-white font-poppins text-sm transition-colors">About Us</a>
          </nav>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/dashboard" className="text-white font-poppins text-xs sm:text-sm hover:text-corama-teal transition-colors">Log In</Link>
            <Link to="/dashboard" className="bg-corama-teal text-corama-dark font-poppins text-xs sm:text-sm font-semibold px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg hover:bg-corama-teal-light transition-colors">Sign up</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-corama-darker/50 to-transparent"></div>
        <div className="absolute top-20 left-10 w-2 h-2 bg-corama-teal rounded-full animate-pulse hidden sm:block"></div>
        <div className="absolute top-40 right-20 w-3 h-3 bg-corama-teal/50 rounded-full animate-pulse hidden sm:block"></div>
        <div className="absolute bottom-20 left-1/4 w-2 h-2 bg-corama-teal/30 rounded-full animate-pulse hidden sm:block"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="font-inter font-black text-3xl sm:text-5xl md:text-7xl text-white mb-4 sm:mb-6 leading-tight">
            With AI Find<br />Contracts
          </h1>
          <p className="text-gray-300 font-poppins text-sm sm:text-base lg:text-lg max-w-2xl mx-auto mb-6 sm:mb-10 px-2">
            From finding the right contracts to automating winning proposals, Contract Radar Maximizer revolutionizes government contracting, streamlining processes, boosting efficiency, and giving you a competitive edge.
          </p>
          <Link to="/dashboard" className="inline-flex items-center gap-2 bg-corama-dark border-2 border-corama-teal text-white font-poppins font-semibold px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg hover:bg-corama-teal hover:text-corama-dark transition-all text-sm sm:text-base">
            Get Started
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Feature 1 */}
            <div className="card-gradient rounded-xl sm:rounded-2xl p-5 sm:p-8 hover:glow-effect transition-all">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-corama-teal/20 rounded-lg sm:rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                <Search className="text-corama-teal" size={24} />
              </div>
              <h3 className="font-inter font-bold text-lg sm:text-xl text-white mb-3 sm:mb-4">Smart Contract Matching</h3>
              <p className="text-gray-400 font-poppins text-xs sm:text-sm mb-4 sm:mb-6">
                Our AI analyzes thousands of contracts in seconds, using advanced vector similarity to find opportunities perfectly matched to your capabilities and experience.
              </p>
              <Link to="/dashboard" className="inline-flex items-center gap-2 text-corama-teal font-poppins text-xs sm:text-sm hover:gap-3 transition-all">
                Get Started <ArrowRight size={14} />
              </Link>
            </div>

            {/* Feature 2 */}
            <div className="card-gradient rounded-xl sm:rounded-2xl p-5 sm:p-8 hover:glow-effect transition-all">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-corama-teal/20 rounded-lg sm:rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                <FileText className="text-corama-teal" size={24} />
              </div>
              <h3 className="font-inter font-bold text-lg sm:text-xl text-white mb-3 sm:mb-4">Automated Proposal Generation</h3>
              <p className="text-gray-400 font-poppins text-xs sm:text-sm mb-4 sm:mb-6">
                Generate compelling, tailored bid responses instantly. Our AI assistant crafts professional proposals that highlight your strengths and address specific requirements.
              </p>
              <Link to="/dashboard" className="inline-flex items-center gap-2 text-corama-teal font-poppins text-xs sm:text-sm hover:gap-3 transition-all">
                Learn More <ArrowRight size={14} />
              </Link>
            </div>

            {/* Feature 3 */}
            <div className="card-gradient rounded-xl sm:rounded-2xl p-5 sm:p-8 hover:glow-effect transition-all">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-corama-teal/20 rounded-lg sm:rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                <CheckCircle className="text-corama-teal" size={24} />
              </div>
              <h3 className="font-inter font-bold text-lg sm:text-xl text-white mb-3 sm:mb-4">Compliance Intelligence</h3>
              <p className="text-gray-400 font-poppins text-xs sm:text-sm mb-4 sm:mb-6">
                Never miss a requirement again. AI-powered compliance checking ensures your proposals meet all specifications and regulatory standards automatically.
              </p>
              <Link to="/dashboard" className="inline-flex items-center gap-2 text-corama-teal font-poppins text-xs sm:text-sm hover:gap-3 transition-all">
                Learn More <ArrowRight size={14} />
              </Link>
            </div>

            {/* Feature 4 */}
            <div className="card-gradient rounded-xl sm:rounded-2xl p-5 sm:p-8 hover:glow-effect transition-all">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-corama-teal/20 rounded-lg sm:rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                <Target className="text-corama-teal" size={24} />
              </div>
              <h3 className="font-inter font-bold text-lg sm:text-xl text-white mb-3 sm:mb-4">Win Probability Scoring</h3>
              <p className="text-gray-400 font-poppins text-xs sm:text-sm mb-4 sm:mb-6">
                Get real-time insights into your chances of success. Our predictive AI analyzes historical data to score opportunities and optimize your bidding strategy.
              </p>
              <Link to="/dashboard" className="inline-flex items-center gap-2 text-corama-teal font-poppins text-xs sm:text-sm hover:gap-3 transition-all">
                Get Started <ArrowRight size={14} />
              </Link>
            </div>

            {/* Feature 5 */}
            <div className="card-gradient rounded-xl sm:rounded-2xl p-5 sm:p-8 hover:glow-effect transition-all">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-corama-teal/20 rounded-lg sm:rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                <TrendingUp className="text-corama-teal" size={24} />
              </div>
              <h3 className="font-inter font-bold text-lg sm:text-xl text-white mb-3 sm:mb-4">Intelligent Market Research</h3>
              <p className="text-gray-400 font-poppins text-xs sm:text-sm mb-4 sm:mb-6">
                Stay ahead of the competition with AI-driven market intelligence. Discover trends, analyze competitors, and identify emerging opportunities automatically.
              </p>
              <Link to="/dashboard" className="inline-flex items-center gap-2 text-corama-teal font-poppins text-xs sm:text-sm hover:gap-3 transition-all">
                Learn More <ArrowRight size={14} />
              </Link>
            </div>

            {/* Feature 6 */}
            <div className="card-gradient rounded-xl sm:rounded-2xl p-5 sm:p-8 hover:glow-effect transition-all">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-corama-teal/20 rounded-lg sm:rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                <Clock className="text-corama-teal" size={24} />
              </div>
              <h3 className="font-inter font-bold text-lg sm:text-xl text-white mb-3 sm:mb-4">Smart Deadline Management</h3>
              <p className="text-gray-400 font-poppins text-xs sm:text-sm mb-4 sm:mb-6">
                Never miss another deadline. AI-powered scheduling and alerts keep you on track with automated reminders and priority-based task management.
              </p>
              <Link to="/dashboard" className="inline-flex items-center gap-2 text-corama-teal font-poppins text-xs sm:text-sm hover:gap-3 transition-all">
                Learn More <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Scope of Work Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-corama-darker/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
            <div className="rounded-xl sm:rounded-2xl overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800" 
                alt="Work Station" 
                className="w-full h-48 sm:h-64 lg:h-80 object-cover"
                onError={(e) => { e.currentTarget.src = 'https://placehold.co/800x400/0b2c48/6bb4b5?text=Work+Station' }}
              />
            </div>
            <div className="text-center md:text-left">
              <h2 className="font-inter font-bold text-2xl sm:text-3xl lg:text-4xl text-white mb-4 sm:mb-6">Scope Of Work Station</h2>
              <p className="text-gray-400 font-poppins text-sm sm:text-base mb-6 sm:mb-8">
                Get the scope of work of your desired contract in minutes with clear, structured responses, and more.
              </p>
              <Link to="/dashboard" className="inline-flex items-center gap-2 bg-transparent border-2 border-white text-white font-poppins font-semibold px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg hover:bg-white hover:text-corama-dark transition-all text-sm sm:text-base">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Revolution Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-inter font-bold text-2xl sm:text-3xl lg:text-4xl text-white mb-4 sm:mb-6">
            Revolutionizing Government<br />Contracting for Small<br />Businesses
          </h2>
          <p className="text-gray-400 font-poppins text-sm sm:text-base mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Contract Radar Maximizer is a deep data science platform that integrates artificial intelligence and machine learning to assist small businesses in creating capability statements, identifying available government contracts in their area, and generating potential bid responses.
          </p>
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-corama-teal font-poppins text-sm sm:text-base hover:gap-3 transition-all">
            Learn More <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-corama-darker/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="card-gradient rounded-xl sm:rounded-2xl p-5 sm:p-8">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl lg:text-4xl text-gray-500 mb-3 sm:mb-4 font-poppins">CONTRACT</div>
                  <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto bg-corama-teal/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="text-corama-teal" size={28} />
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2 text-center md:text-left">
              <h2 className="font-inter font-bold text-2xl sm:text-3xl lg:text-4xl text-white mb-4 sm:mb-6">Mission</h2>
              <p className="text-gray-400 font-poppins text-sm sm:text-base mb-6 sm:mb-8">
                To facilitate small businesses' access to government contracts using cutting-edge technology to identify opportunities and maximize the probability of securing contracts.
              </p>
              <Link to="/dashboard" className="inline-flex items-center gap-2 bg-corama-teal text-corama-dark font-poppins font-semibold px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg hover:bg-corama-teal-light transition-colors text-sm sm:text-base">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
            <div className="text-center md:text-left">
              <h2 className="font-inter font-bold text-2xl sm:text-3xl lg:text-4xl text-white mb-4 sm:mb-6">Vision</h2>
              <p className="text-gray-400 font-poppins text-sm sm:text-base mb-6 sm:mb-8">
                To empower communities through access to contracts, decentralizing the public economy by extracting value from the public-generated value.
              </p>
              <Link to="/dashboard" className="inline-flex items-center gap-2 bg-corama-teal text-corama-dark font-poppins font-semibold px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg hover:bg-corama-teal-light transition-colors text-sm sm:text-base">
                Get Started
              </Link>
            </div>
            <div className="flex justify-center order-first md:order-last">
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {[1,2,3,4,5,6].map((i) => (
                  <div key={i} className={`w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-lg ${i % 2 === 0 ? 'bg-corama-teal/30' : 'bg-corama-teal/10'} transform rotate-45`}></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 sm:py-16 px-4 sm:px-6 bg-corama-darker border-t border-corama-dark">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center gap-2 sm:gap-4 mb-8 sm:mb-12">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg ${i % 2 === 0 ? 'bg-corama-teal' : 'bg-corama-teal/50'} transform rotate-45`}></div>
            ))}
          </div>
          
          <div className="text-center mb-6 sm:mb-8">
            <p className="text-gray-400 font-poppins text-xs sm:text-sm mb-2">222 W. Merchandise Mart Plaza</p>
            <p className="text-gray-400 font-poppins text-xs sm:text-sm mb-3 sm:mb-4">Suite 1212 c/o 1871 Chicago, IL 60654</p>
            <a href="#" className="text-corama-teal font-poppins text-xs sm:text-sm hover:underline">Learn More About IHCC</a>
          </div>
          
          <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
            <a href="#" className="text-gray-400 font-poppins text-xs sm:text-sm hover:text-white transition-colors">Terms of Use</a>
            <a href="#" className="text-gray-400 font-poppins text-xs sm:text-sm hover:text-white transition-colors">Policy Notice</a>
            <a href="#" className="text-gray-400 font-poppins text-xs sm:text-sm hover:text-white transition-colors">FAQ</a>
            <a href="#" className="text-gray-400 font-poppins text-xs sm:text-sm hover:text-white transition-colors">Contact</a>
            <a href="mailto:info@corama.ai" className="text-corama-teal font-poppins text-xs sm:text-sm hover:underline">info@corama.ai</a>
          </div>
          
          <div className="text-center">
            <span className="text-white font-poppins font-bold text-lg sm:text-xl">CORAMA</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
