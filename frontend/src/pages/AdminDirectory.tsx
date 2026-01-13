import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { Trash2, RefreshCw, AlertTriangle, Shield } from 'lucide-react'
import { api } from '../services/api'

interface DirectoryListing {
  user_id: string
  company: string
  contact_name: string
  email: string
  phone: string
  listed: boolean
  updated_at?: string
}

const AdminDirectory = () => {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [listings, setListings] = useState<DirectoryListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

  const checkAdminAndLoad = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // First check if user is admin
      const adminStatus = await api.checkAdminStatus()
      
      if (!adminStatus.success || !adminStatus.is_admin) {
        setIsAdmin(false)
        setLoading(false)
        return
      }
      
      setIsAdmin(true)
      
      // Load directory listings
      const result = await api.adminGetDirectoryListings()
      
      if (result.success && result.listings) {
        setListings(result.listings)
      } else {
        setError(result.error || 'Failed to load directory listings')
      }
    } catch (err) {
      console.error('Error loading admin data:', err)
      setError('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (userId: string) => {
    setDeleting(userId)
    
    try {
      const result = await api.adminDeleteDirectoryListing(userId)
      
      if (result.success) {
        // Remove from local state
        setListings(prev => prev.filter(l => l.user_id !== userId))
        setDeleteConfirm(null)
      } else {
        setError(result.error || 'Failed to delete listing')
      }
    } catch (err) {
      console.error('Error deleting listing:', err)
      setError('Failed to delete listing')
    } finally {
      setDeleting(null)
    }
  }

  // Not admin - show access denied
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-corama-dark">
        <Header credits={5} />
        <div className="flex">
          <div className="hidden lg:block fixed left-0 right-0 top-16 h-px bg-white z-50" aria-hidden="true" />
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <main className="flex-1 p-3 sm:p-4 lg:p-12 overflow-x-hidden">
              <div className="card-gradient rounded-xl p-6 lg:p-8 text-center">
                <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-white font-poppins font-bold text-xl lg:text-2xl mb-2">Access Denied</h1>
                <p className="text-gray-400 font-poppins mb-6">You do not have admin privileges to access this page.</p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="bg-corama-teal text-white font-poppins px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Return to Dashboard
                </button>
              </div>
            </main>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-corama-dark">
      <Header credits={5} />
      
      <div className="flex">
        <div className="hidden lg:block fixed left-0 right-0 top-16 h-px bg-white z-50" aria-hidden="true" />
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-3 sm:p-4 lg:p-12 overflow-x-hidden">
            <div className="card-gradient rounded-xl p-3 sm:p-4 lg:p-6">
              {/* Page Title */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-6 h-6 text-corama-teal" />
                    <h1 className="text-white font-poppins font-bold text-lg sm:text-xl lg:text-2xl uppercase tracking-wider">Admin: Directory Management</h1>
                  </div>
                  <p className="text-gray-400 font-poppins text-sm">Manage Corama Directory listings</p>
                </div>
                <button
                  onClick={checkAdminAndLoad}
                  disabled={loading}
                  className="flex items-center gap-2 bg-corama-teal/20 text-corama-teal font-poppins px-4 py-2 rounded-lg hover:bg-corama-teal/30 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-400 font-poppins text-sm">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto text-red-400 hover:text-red-300"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-corama-teal mx-auto mb-4 animate-spin" />
                  <p className="text-gray-400 font-poppins">Loading directory listings...</p>
                </div>
              )}

              {/* Listings Table */}
              {!loading && listings.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left text-gray-400 font-poppins text-sm py-3 px-2">Company</th>
                        <th className="text-left text-gray-400 font-poppins text-sm py-3 px-2">Contact</th>
                        <th className="text-left text-gray-400 font-poppins text-sm py-3 px-2">Email</th>
                        <th className="text-left text-gray-400 font-poppins text-sm py-3 px-2">Status</th>
                        <th className="text-left text-gray-400 font-poppins text-sm py-3 px-2">User ID</th>
                        <th className="text-right text-gray-400 font-poppins text-sm py-3 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings.map((listing) => (
                        <tr key={listing.user_id} className="border-b border-gray-700/50 hover:bg-white/5">
                          <td className="text-white font-poppins text-sm py-4 px-2">{listing.company || 'N/A'}</td>
                          <td className="text-gray-300 font-poppins text-sm py-4 px-2">{listing.contact_name || 'N/A'}</td>
                          <td className="text-gray-300 font-poppins text-sm py-4 px-2">{listing.email || 'N/A'}</td>
                          <td className="py-4 px-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-poppins ${
                              listing.listed 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {listing.listed ? 'Listed' : 'Unlisted'}
                            </span>
                          </td>
                          <td className="text-gray-500 font-mono text-xs py-4 px-2">{listing.user_id.substring(0, 12)}...</td>
                          <td className="text-right py-4 px-2">
                            {deleteConfirm === listing.user_id ? (
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-red-400 text-xs font-poppins">Delete?</span>
                                <button
                                  onClick={() => handleDelete(listing.user_id)}
                                  disabled={deleting === listing.user_id}
                                  className="bg-red-500 text-white font-poppins text-xs px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                                >
                                  {deleting === listing.user_id ? 'Deleting...' : 'Yes'}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="bg-gray-600 text-white font-poppins text-xs px-3 py-1 rounded hover:bg-gray-500"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(listing.user_id)}
                                className="flex items-center gap-1 text-red-400 hover:text-red-300 font-poppins text-sm"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Empty State */}
              {!loading && listings.length === 0 && !error && (
                <div className="text-center py-12">
                  <p className="text-gray-400 font-poppins">No directory listings found.</p>
                </div>
              )}

              {/* Summary */}
              {!loading && listings.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <p className="text-gray-400 font-poppins text-sm">
                    Total listings: <span className="text-white font-semibold">{listings.length}</span>
                    {' | '}
                    Listed: <span className="text-green-400 font-semibold">{listings.filter(l => l.listed).length}</span>
                    {' | '}
                    Unlisted: <span className="text-yellow-400 font-semibold">{listings.filter(l => !l.listed).length}</span>
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Delete Confirmation Modal (for mobile) */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 sm:hidden">
          <div className="bg-corama-dark border border-gray-700 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-white font-poppins font-bold text-lg mb-2">Confirm Delete</h3>
            <p className="text-gray-400 font-poppins text-sm mb-6">
              Are you sure you want to delete this directory listing? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-gray-600 text-white font-poppins py-2 rounded-lg hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting === deleteConfirm}
                className="flex-1 bg-red-500 text-white font-poppins py-2 rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {deleting === deleteConfirm ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDirectory
