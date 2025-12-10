import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { api, DirectoryProfile } from '../services/api'

const EditDirectoryProfile = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [credits, setCredits] = useState(0)
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
    loadCredits()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await api.getDirectoryProfile()
      if (data.success && data.profile) {
        setProfile(data.profile)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCredits = async () => {
    try {
      const data = await api.getCredits()
      if (data.success) {
        setCredits(data.current_balance)
      }
    } catch (error) {
      console.error('Failed to load credits:', error)
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
        alert(data.error || 'Failed to upload logo')
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
        alert(data.error || 'Failed to save profile')
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
      <div className="relative flex min-h-screen bg-corama-dark">
        <div className="hidden lg:block absolute inset-x-0 top-16 h-px bg-white z-10" aria-hidden="true" />
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header credits={credits} />
          <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden flex items-center justify-center">
            <div className="text-white font-poppins">Loading...</div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen bg-corama-dark">
      {/* Horizontal separator line across entire width, below header (lg only) */}
      <div className="hidden lg:block absolute inset-x-0 top-16 h-px bg-white z-10" aria-hidden="true" />
      
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header credits={credits} />
        
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
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
                  className="border-2 border-dashed border-gray-500 rounded-lg p-8 text-center cursor-pointer hover:border-corama-teal transition-colors"
                >
                  {profile.logo_url ? (
                    <div className="flex flex-col items-center">
                      <img src={profile.logo_url} alt="Company logo" className="max-h-24 mb-2" />
                      <span className="text-gray-400 font-poppins text-sm">Click to change</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <img src="/static/app/dashboard/AddFile.svg" alt="" className="w-12 h-12 mb-2" aria-hidden="true" />
                      <span className="text-corama-teal font-poppins text-sm">
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
                    type="text"
                    value={profile.team_size}
                    onChange={(e) => handleInputChange('team_size', e.target.value)}
                    placeholder="Select your team size"
                    className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-corama-teal text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-poppins text-sm mb-2">Years in Business</label>
                  <input
                    type="text"
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
                className="flex items-center gap-4 bg-[#2F3C4F] border border-corama-teal/30 rounded-xl px-8 py-4 hover:bg-corama-darker transition-colors disabled:opacity-50"
              >
                <div className="text-left">
                  <h3 className="text-white font-poppins font-bold text-base">Save Profile</h3>
                  <p className="text-gray-400 font-poppins text-xs">Click to finalize your registration.</p>
                </div>
                <img src="/static/app/dashboard/EditProfile.svg" alt="" className="w-8 h-8" aria-hidden="true" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default EditDirectoryProfile
