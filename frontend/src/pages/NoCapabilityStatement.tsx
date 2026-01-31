import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { InlineLoading } from '../components/ThinkingPopup'
import { api } from '../services/api'

// SVG asset paths for empty state
const ExclamationMarkIcon = '/static/app/dashboard/ExclamationMark.svg'
const NoCSImage = '/static/app/dashboard/NoCSImage.svg'

const NoCapabilityStatement = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  
  // Get the return URL from query params, default to dashboard
  const returnTo = searchParams.get('returnTo') || '/dashboard'

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const result = await api.uploadCapabilityStatement(file, [], [])
      if (result.success) {
        // Redirect back to the page user originally tried to access
        navigate(returnTo)
      } else {
        alert(result.message || 'Failed to upload capability statement')
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload capability statement. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-corama-dark">
      {/* Header spans full width at top */}
      <Header credits={5} />
      
      {/* Sidebar + Content row below header */}
      <div className="flex">
        {/* Horizontal separator line across entire viewport width, below header (lg only) */}
        <div className="hidden lg:block fixed left-0 right-0 top-16 h-px bg-white z-50" aria-hidden="true" />
        
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-3 sm:p-4 lg:p-12 overflow-x-hidden flex items-center justify-center">
          <div className="card-gradient rounded-xl p-6 lg:p-10 border border-[#3D4F5F] w-full max-w-4xl">
            {/* Header with exclamation mark */}
            <div className="flex items-center gap-4 mb-8">
              <img src={ExclamationMarkIcon} alt="" className="w-12 h-12 lg:w-16 lg:h-16" />
              <div>
                <h2 className="text-white font-poppins font-bold text-xl lg:text-2xl">Capability Statement Required</h2>
                <p className="text-gray-300 font-poppins text-sm lg:text-base">Get personalized AI responses based on your company's profile</p>
              </div>
            </div>
            
            {/* Illustration or Loading */}
            <div className="flex justify-center mb-8">
              {uploading ? (
                <InlineLoading text="Uploading" size="large" />
              ) : (
                <img src={NoCSImage} alt="Create your capability statement" className="w-full max-w-lg" />
              )}
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button 
                onClick={() => navigate('/capability-builder')}
                className="flex-1 sm:flex-none bg-corama-teal text-white font-poppins font-semibold px-8 py-4 rounded-full hover:bg-corama-teal/90 transition-colors text-center"
              >
                Create in Corama
              </button>
              <button 
                onClick={handleUploadClick}
                disabled={uploading}
                className="flex-1 sm:flex-none bg-[#3D4F5F] text-white font-poppins font-semibold px-8 py-4 rounded-full hover:bg-[#4D5F6F] transition-colors text-center disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload File'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </main>
        </div>
      </div>
    </div>
  )
}

export default NoCapabilityStatement
