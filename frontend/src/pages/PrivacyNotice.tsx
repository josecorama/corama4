const PrivacyNotice = () => {
  return (
    <div className="min-h-screen bg-[#0B0B0F] flex flex-col relative">
      <div className="prelogin-flicker-bg" />
      
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B0B0F] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-5">
            <a href="/">
              <img src="/static/app/landing/corama-logo-new.png" alt="CORAMA" className="h-6 sm:h-8 lg:h-8 w-auto" />
            </a>
            <div className="h-6 w-px bg-white/20"></div>
            <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer">
              <img src="/static/app/dashboard/IHCC-new.png" alt="IHCC" className="h-5 sm:h-6 lg:h-6 w-auto" />
            </a>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-8">
            <nav className="prelogin-nav flex items-center gap-2 sm:gap-4 lg:gap-6">
              <a href="/faq" className="text-gray-300 hover:text-white font-poppins text-[10px] sm:text-sm transition-colors">FAQ</a>
              <a href="/about-us" className="text-gray-300 hover:text-white font-poppins text-[10px] sm:text-sm transition-colors">About Us</a>
              <a href="/login" className="text-gray-300 hover:text-white font-poppins text-[10px] sm:text-sm transition-colors">Log In</a>
            </nav>
            <a href="/signup" className="text-white font-poppins text-[10px] sm:text-xs lg:text-sm font-semibold px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-2.5 rounded-lg hover:opacity-90 transition-all text-center" style={{ background: 'linear-gradient(90deg, #1C4262 6%, #284165 96%)' }}>Sign up</a>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex-1 pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-poppins font-black text-3xl sm:text-4xl md:text-5xl text-white text-center mb-12 sm:mb-16 animate-fade-in">
            Privacy Notice
          </h1>

          <div className="animate-fade-in-up animate-delay-100">
            <div className="w-full max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: '#1a2332' }}>
              <iframe
                src="/static/pdfjs/web/viewer.html?file=/static/docs/PrivacyNotice.pdf"
                className="w-full border-0"
                style={{ height: '80vh', minHeight: '500px' }}
                title="Privacy Notice"
              />
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-[#0B0B0F] pt-8 pb-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white font-poppins">
          <div className="text-center sm:text-left">
            <div>180 North Michigan Avenue</div>
            <div className="sm:text-center">Suite 500 Chicago, IL 60601</div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <a href="https://ihccbusiness.net/" target="_blank" rel="noopener noreferrer" className="hover:text-corama-teal transition-colors">Learn More About IHCC</a>
            <a href="/terms-of-use" className="hover:text-corama-teal transition-colors">Terms of Use</a>
            <a href="/static/docs/policy.pdf" target="_blank" className="hover:text-corama-teal transition-colors">Policy Notice</a>
            <a href="/faq" className="hover:text-corama-teal transition-colors">Frequently Asked Questions</a>
          </div>
          <div>contact@corama.ai</div>
        </div>
      </footer>
    </div>
  )
}

export default PrivacyNotice
