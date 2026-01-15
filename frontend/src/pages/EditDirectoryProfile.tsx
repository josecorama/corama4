import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { api, DirectoryProfile } from '../services/api'
import { useTranslation } from '../i18n'

const EditDirectoryProfile = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [_hasListing, setHasListing] = useState(false)
  const [_authError, setAuthError] = useState<string | null>(null)
  const [profile, setProfile] = useState<DirectoryProfile>({
    company: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    linkedin_url: '',
    services: '',
    description: '',
    certifications: '',
    past_projects: '',
    team_size: '',
    years_in_business: '',
    logo_url: '',
    listed: false
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await api.getDirectoryProfile()
      if (data.success && data.profile) {
        setProfile(data.profile)
        // Check if user has an existing listing (listed: true)
        if (data.profile.listed === true) {
          setHasListing(true)
        } else {
          // User doesn't have a listing yet - allow them to create one
          setHasListing(false)
        }
      } else {
        // No profile exists yet - allow user to create one
        setHasListing(false)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
      setAuthError('Failed to load profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }


  const handleInputChange = (field: keyof DirectoryProfile, value: string | boolean) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PNG, JPG, GIF, or WEBP image')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    setUploading(true)
    try {
      const data = await api.uploadDirectoryLogo(file)
      if (data.success && data.logo_url) {
        setProfile(prev => ({ ...prev, logo_url: data.logo_url || '' }))
      } else {
        // Handle authorization error from backend
        if (data.authorization_error) {
          setAuthError(data.error || 'You must have an existing directory listing to upload a logo.')
        } else {
          alert(data.error || 'Failed to upload logo')
        }
      }
    } catch (error) {
      console.error('Failed to upload logo:', error)
      alert('Failed to upload logo. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = await api.updateDirectoryProfile({
        ...profile,
        listed: true
      })
      if (data.success) {
        navigate('/corama-directory')
      } else {
        // Handle authorization error from backend
        if (data.authorization_error) {
          setAuthError(data.error || 'You must have an existing directory listing to edit your profile.')
        } else {
          alert(data.error || 'Failed to save profile')
        }
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
      alert('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-corama-dark">
        <Header />
        <div className="flex">
          <div className="hidden lg:block absolute right-4 top-0 bottom-0 w-px" aria-hidden="true" style={{ backgroundColor: 'rgb(45, 81, 112)', boxShadow: 'rgba(45, 81, 112, 0.5) 0px 0px 8px' }} />
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <main className="flex-1 p-3 sm:p-4 lg:p-12 overflow-x-hidden flex items-center justify-center">
              <div className="text-white font-poppins">Loading...</div>
            </main>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-corama-dark">
      {/* Header spans full width at top */}
      <Header />
      
      {/* Sidebar + Content row below header */}
      <div className="flex">
        {/* Horizontal separator line across entire viewport width, below header (lg only) */}
        <div className="hidden lg:block absolute right-4 top-0 bottom-0 w-px" aria-hidden="true" style={{ backgroundColor: 'rgb(45, 81, 112)', boxShadow: 'rgba(45, 81, 112, 0.5) 0px 0px 8px' }} />
        
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-3 sm:p-4 lg:p-12 overflow-x-hidden">
          <div className="max-w-4xl mx-auto">
            {/* Page Title */}
            <div className="mb-6">
              <h1 className="text-white font-poppins font-bold text-lg sm:text-xl lg:text-2xl uppercase tracking-wider">CORAMA Partner Directory</h1>
              <p className="text-gray-400 font-poppins text-sm mt-2">
                The CORAMA Partner Directory helps companies discover and connect with potential partners for government contracts. Your profile will be visible to other CORAMA users looking for subcontractors and team members.
              </p>
            </div>

            {/* Company Contact Information */}
            <div className="card-gradient rounded-xl p-4 sm:p-6 mb-6">
              <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-4">Company Contact Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 font-poppins text-sm mb-2">Company Name</label>
                  <input
                    type="text"
                    value={profile.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    placeholder="ABC Construction"
                    className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-corama-teal text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-poppins text-sm mb-2">Contact Name</label>
                  <input
                    type="text"
                    value={profile.contact_name}
                    onChange={(e) => handleInputChange('contact_name', e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-corama-teal text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-poppins text-sm mb-2">Website</label>
                  <input
                    type="text"
                    value={profile.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="CEO, Project Manager, etc..."
                    className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-corama-teal text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-poppins text-sm mb-2">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Contact@example.com"
                    className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-corama-teal text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-poppins text-sm mb-2">Phone</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-corama-teal text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-poppins text-sm mb-2">LinkedIn Profile</label>
                  <input
                    type="text"
                    value={profile.linkedin_url}
                    onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-corama-teal text-sm"
                  />
                </div>
              </div>

              {/* Company Logo */}
              <div className="mt-6">
                <h3 className="text-white font-poppins font-bold text-sm mb-2">Company Logo</h3>
                <p className="text-gray-400 font-poppins text-xs mb-3">Max 5MB. Formats: PNG, JPG, GIF, WEBP</p>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white border-2 border-[#1C4262] rounded-xl p-6 sm:p-8 lg:p-10 text-center cursor-pointer hover:border-corama-teal transition-colors"
                >
                  {profile.logo_url ? (
                    <div className="flex flex-col items-center">
                      <img src={profile.logo_url} alt="Company logo" className="max-h-24 mb-2" />
                      <span className="text-gray-600 font-poppins text-sm">Click to change</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <img src="/static/app/dashboard/AddFile.svg" alt="" className="w-12 h-12 mb-2" aria-hidden="true" />
                      <span className="text-[#1C4262] font-poppins text-sm font-medium">
                        {uploading ? 'Uploading...' : 'Add your file'}
                      </span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Company Details */}
            <div className="card-gradient rounded-xl p-4 sm:p-6 mb-6">
              <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-4">Company Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 font-poppins text-sm mb-2">Team Size</label>
                  <input
                    type="number"
                    min="1"
                    value={profile.team_size}
                    onChange={(e) => handleInputChange('team_size', e.target.value)}
                    placeholder="Enter team size"
                    className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-corama-teal text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-poppins text-sm mb-2">Years in Business</label>
                  <input
                    type="number"
                    min="0"
                    value={profile.years_in_business}
                    onChange={(e) => handleInputChange('years_in_business', e.target.value)}
                    placeholder="e.g., 15"
                    className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-corama-teal text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-poppins text-sm mb-2">Services Offered</label>
                  <input
                    type="text"
                    value={profile.services}
                    onChange={(e) => handleInputChange('services', e.target.value)}
                    placeholder="e.g., Construction, IT Services, Consulting"
                    className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-corama-teal text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-poppins text-sm mb-2">Company Description</label>
                  <input
                    type="text"
                    value={profile.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe your company's expertise"
                    className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-corama-teal text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Certifications and Credentials */}
            <div className="card-gradient rounded-xl p-4 sm:p-6 mb-6">
              <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-4">Certifications and Credentials</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 font-poppins text-sm mb-2">Certifications</label>
                  <input
                    type="text"
                    value={profile.certifications}
                    onChange={(e) => handleInputChange('certifications', e.target.value)}
                    placeholder="List your company's certifications"
                    className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-corama-teal text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-poppins text-sm mb-2">Past Projects</label>
                  <input
                    type="text"
                    value={profile.past_projects}
                    onChange={(e) => handleInputChange('past_projects', e.target.value)}
                    placeholder="Describe your most relevant past project"
                    className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-corama-teal text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-center">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-3 text-white font-poppins px-4 sm:px-6 py-3 rounded-lg hover:opacity-90 transition-opacity border-2 border-white disabled:opacity-50"
                style={{ backgroundColor: 'rgb(28, 66, 98)' }}
              >
                <span className="font-bold text-base">Save Profile</span>
                <img src="/static/app/dashboard/EditProfile.svg" alt="" className="w-6 h-6" aria-hidden="true" />
              </button>
            </div>
          </div>
        </main>
        </div>
      </div>
    </div>
  )
}

export default EditDirectoryProfile
