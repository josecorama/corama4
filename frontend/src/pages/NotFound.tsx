import { useNavigate } from 'react-router-dom'

function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0B2C48] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8 md:gap-16 animate-fade-in">
        <div className="flex-shrink-0 animate-pop">
          <img 
            src="/static/app/landing/404Icon.svg" 
            alt="404 Robot" 
            className="w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80"
          />
        </div>
        
        <div className="text-center md:text-left">
          <h1 className="font-poppins font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-4 sm:mb-6">
            No Match Found.
          </h1>
          <p className="font-poppins text-gray-300 text-sm sm:text-base lg:text-lg mb-6 sm:mb-8 max-w-md leading-relaxed">
            We're usually experts at matching you with the perfect opportunity, but this link didn't match anything in our system. Let's get you back to a search that actually returns results.
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center bg-transparent border-2 border-white text-white font-poppins font-semibold px-8 py-3 rounded-lg hover:bg-white hover:text-[#0B2C48] transition-all text-sm sm:text-base"
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotFound
