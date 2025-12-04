import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { Upload, Save, RotateCcw, Trash2, FileText, MessageSquare, Check } from 'lucide-react'

const CapabilityBuilder = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    contactName: '',
    title: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    industryFocus: '',
    coreCompetencies: '',
    keyDifferentiators: '',
    companyDescription: '',
    ueiCode: '',
    cageCode: '',
    naicsCodes: '',
    certifications: '',
    clientAgency: '',
    contractValue: '',
    projectDescription: '',
    primaryColor: '#FF0000',
    secondaryColor: '#FFFF00',
  })

  const [completedSteps] = useState([true, true, true])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="flex min-h-screen bg-corama-dark">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header credits={5} />
        
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
          {/* Page Title */}
          <div className="text-center mb-6 lg:mb-8">
            <h1 className="text-white font-poppins font-bold text-xl sm:text-2xl mb-3 sm:mb-4">Capability Builder</h1>
            <div className="flex justify-center gap-3 sm:gap-4">
              {completedSteps.map((completed, index) => (
                <div
                  key={index}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                    completed ? 'bg-corama-teal' : 'bg-corama-darker border border-corama-teal/30'
                  }`}
                >
                  {completed && <Check size={16} className="text-white sm:w-5 sm:h-5" />}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Left Column - Form */}
            <div className="space-y-4 lg:space-y-6">
              {/* Company Information */}
              <div className="card-gradient rounded-xl p-4 sm:p-5 lg:p-6">
                <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">Company Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">Company Name</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">Website</label>
                    <input
                      type="text"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">Contact Name</label>
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => handleInputChange('contactName', e.target.value)}
                      className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">Phone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">Zip Code</label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                    />
                  </div>
                </div>
              </div>

              {/* Company Details */}
              <div className="card-gradient rounded-xl p-4 sm:p-5 lg:p-6">
                <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">Company Details</h2>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">Industry Focus</label>
                    <input
                      type="text"
                      value={formData.industryFocus}
                      onChange={(e) => handleInputChange('industryFocus', e.target.value)}
                      className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">Core Competencies</label>
                    <input
                      type="text"
                      value={formData.coreCompetencies}
                      onChange={(e) => handleInputChange('coreCompetencies', e.target.value)}
                      className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">Key Differentiators</label>
                    <input
                      type="text"
                      value={formData.keyDifferentiators}
                      onChange={(e) => handleInputChange('keyDifferentiators', e.target.value)}
                      className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">Company Description</label>
                    <input
                      type="text"
                      value={formData.companyDescription}
                      onChange={(e) => handleInputChange('companyDescription', e.target.value)}
                      className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                    />
                  </div>
                </div>
              </div>

              {/* Company Logo & Images */}
              <div className="card-gradient rounded-xl p-4 sm:p-5 lg:p-6">
                <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">Company Logo</h2>
                <div className="border-2 border-dashed border-corama-teal/30 rounded-lg p-4 sm:p-6 lg:p-8 text-center mb-3 sm:mb-4">
                  <Upload className="mx-auto text-corama-teal mb-2" size={20} />
                  <p className="text-corama-teal font-poppins text-xs sm:text-sm">Add your file</p>
                </div>
                <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">Company Images</h2>
                <div className="border-2 border-dashed border-corama-teal/30 rounded-lg p-4 sm:p-6 lg:p-8 text-center">
                  <Upload className="mx-auto text-corama-teal mb-2" size={20} />
                  <p className="text-corama-teal font-poppins text-xs sm:text-sm">Add your file</p>
                </div>
              </div>

              {/* Color Scheme */}
              <div className="card-gradient rounded-xl p-4 sm:p-5 lg:p-6">
                <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">Color Scheme</h2>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">Primary Color (Headers/Accents)</label>
                    <div className="flex gap-2">
                      <div className="w-24 h-10 rounded" style={{ backgroundColor: formData.primaryColor }}></div>
                      <input
                        type="text"
                        value={formData.primaryColor}
                        onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                        className="flex-1 bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">Secondary Color (Sections/Backgrounds)</label>
                    <div className="flex gap-2">
                      <div className="w-24 h-10 rounded" style={{ backgroundColor: formData.secondaryColor }}></div>
                      <input
                        type="text"
                        value={formData.secondaryColor}
                        onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                        className="flex-1 bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">Quick Color Presets</label>
                    <div className="flex gap-2">
                      <button className="w-10 h-10 rounded bg-green-500"></button>
                      <button className="w-10 h-10 rounded bg-pink-500"></button>
                      <button className="w-10 h-10 rounded bg-orange-500"></button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Government Codes & Certifications */}
              <div className="card-gradient rounded-xl p-4 sm:p-5 lg:p-6">
                <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">Government Codes & Certifications</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">UEI Code</label>
                    <input
                      type="text"
                      value={formData.ueiCode}
                      onChange={(e) => handleInputChange('ueiCode', e.target.value)}
                      className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">CAGE Code</label>
                    <input
                      type="text"
                      value={formData.cageCode}
                      onChange={(e) => handleInputChange('cageCode', e.target.value)}
                      className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">NAICS Codes</label>
                    <input
                      type="text"
                      value={formData.naicsCodes}
                      onChange={(e) => handleInputChange('naicsCodes', e.target.value)}
                      className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">Certifications</label>
                    <input
                      type="text"
                      value={formData.certifications}
                      onChange={(e) => handleInputChange('certifications', e.target.value)}
                      className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                    />
                  </div>
                </div>
              </div>

              {/* Past Performance */}
              <div className="card-gradient rounded-xl p-4 sm:p-5 lg:p-6">
                <h2 className="text-white font-poppins font-bold text-base sm:text-lg mb-3 sm:mb-4">Past Performance</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">Client/Agency</label>
                    <input
                      type="text"
                      value={formData.clientAgency}
                      onChange={(e) => handleInputChange('clientAgency', e.target.value)}
                      className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 font-poppins text-sm mb-1 block">Contract Value</label>
                    <input
                      type="text"
                      value={formData.contractValue}
                      onChange={(e) => handleInputChange('contractValue', e.target.value)}
                      className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-gray-400 font-poppins text-sm mb-1 block">Project Description</label>
                  <input
                    type="text"
                    value={formData.projectDescription}
                    onChange={(e) => handleInputChange('projectDescription', e.target.value)}
                    className="w-full bg-corama-darker border border-corama-teal/30 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-corama-teal"
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Preview & Actions */}
            <div className="space-y-4 lg:space-y-6">
              {/* Action Buttons */}
              <div className="flex justify-center gap-6 sm:gap-8 mb-3 sm:mb-4">
                <button className="text-gray-400 hover:text-white transition-colors">
                  <Save size={20} className="sm:w-6 sm:h-6" />
                </button>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <RotateCcw size={20} className="sm:w-6 sm:h-6" />
                </button>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <Trash2 size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>

              {/* Preview Area */}
              <div className="card-gradient rounded-xl p-4 sm:p-6 min-h-48 sm:min-h-64 lg:min-h-96 bg-white">
                <p className="text-gray-400 text-center text-sm sm:text-base">Preview will appear here</p>
              </div>

              {/* Generate PDF Button */}
              <div className="card-gradient rounded-xl p-3 sm:p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-corama-teal font-poppins font-bold text-sm sm:text-base">Generate PDF</h3>
                  <p className="text-gray-400 font-poppins text-xs sm:text-sm">Create your Capability Statement</p>
                </div>
                <FileText className="text-corama-teal flex-shrink-0" size={20} />
              </div>

              {/* AI Assistant Button */}
              <div className="card-gradient rounded-xl p-3 sm:p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-corama-teal font-poppins font-bold text-sm sm:text-base">AI Assistant</h3>
                  <p className="text-gray-400 font-poppins text-xs sm:text-sm">Use AI to enhance your content</p>
                </div>
                <MessageSquare className="text-corama-teal flex-shrink-0" size={20} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default CapabilityBuilder
