import { useState } from 'react'
import { Save, Upload, Globe, DollarSign, Cog } from 'lucide-react'
import { ProgressiveDisclosure } from '../components/ui/progressive-disclosure'
import { MexicanComplianceChecklist } from '../components/ui/mexican-compliance-checklist'

const Settings = () => {
  const [activeTab, setActiveTab] = useState('company')
  
  const tabs = [
    { id: 'company', label: 'Empresa', icon: Cog },
    { id: 'pricing', label: 'Precios', icon: DollarSign },
    { id: 'integrations', label: 'Integraciones', icon: Globe },
    { id: 'users', label: 'Usuarios', icon: Globe },
    { id: 'compliance', label: 'Cumplimiento', icon: Save }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
          <Save className="h-4 w-4 mr-2" />
          Guardar Cambios
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 inline mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'company' && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">Información de la Empresa</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Empresa
                  </label>
                  <input
                    type="text"
                    defaultValue="Impresiones Morelia"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RFC/Tax ID
                  </label>
                  <input
                    type="text"
                    defaultValue="MORI850101ABC"
                    placeholder="RFC de 12 o 13 caracteres"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <textarea
                    rows={3}
                    defaultValue="Av. Madero Poniente 1234, Centro Histórico, 58000 Morelia, Michoacán"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    defaultValue="+52-443-123-4567"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    defaultValue="contacto@impresionesmorelia.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo de la Empresa
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-2">
                    <button className="text-blue-600 hover:text-blue-500">
                      Subir logo
                    </button>
                    <p className="text-sm text-gray-500">PNG, JPG hasta 2MB</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">Configuración de Precios</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Margen Objetivo (%)
                  </label>
                  <input
                    type="number"
                    defaultValue="25"
                    min="0"
                    max="100"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gastos Generales (%)
                  </label>
                  <input
                    type="number"
                    defaultValue="15"
                    min="0"
                    max="100"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Multiplicador Urgente
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    defaultValue="1.5"
                    min="1"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Multiplicador Express
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    defaultValue="2.0"
                    min="1"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-md font-medium text-gray-900 mb-4">Tarifas de Mano de Obra</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Operador ($/hora)
                    </label>
                    <input
                      type="number"
                      defaultValue="25"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Diseñador ($/hora)
                    </label>
                    <input
                      type="number"
                      defaultValue="35"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instalador ($/hora)
                    </label>
                    <input
                      type="number"
                      defaultValue="30"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Acabados ($/hora)
                    </label>
                    <input
                      type="number"
                      defaultValue="22"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">Integraciones</h2>
              
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">CompraNet Michoacán</h3>
                      <p className="text-sm text-gray-600">Sincronización con portal de licitaciones del Gobierno de Michoacán</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Conectado</span>
                      <button className="text-blue-600 hover:text-blue-500 text-sm">Configurar</button>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">OpenAI API</h3>
                      <p className="text-sm text-gray-600">Servicios de IA para análisis y generación de contenido</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Conectado</span>
                      <button className="text-blue-600 hover:text-blue-500 text-sm">Configurar</button>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Stripe</h3>
                      <p className="text-sm text-gray-600">Procesamiento de pagos para cotizaciones</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Pendiente</span>
                      <button className="text-blue-600 hover:text-blue-500 text-sm">Conectar</button>
                    </div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Twilio WhatsApp</h3>
                      <p className="text-sm text-gray-600">Envío de cotizaciones y notificaciones por WhatsApp</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Desconectado</span>
                      <button className="text-blue-600 hover:text-blue-500 text-sm">Conectar</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Gestión de Usuarios</h2>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  Invitar Usuario
                </button>
              </div>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Último Acceso
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">Juan Pérez</div>
                          <div className="text-sm text-gray-500">juan@impresionesmorelia.com</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          Admin
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Activo
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Hace 2 horas
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900">Editar</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mexican Compliance Tab */}
          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">Cumplimiento Gubernamental</h2>
              <p className="text-sm text-gray-600">
                Gestiona los documentos requeridos para participar en licitaciones del Gobierno de Michoacán
              </p>
              
              <MexicanComplianceChecklist 
                onItemToggle={(itemId) => {
                  console.log('Toggle compliance item:', itemId)
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Progressive Disclosure Example */}
      <div className="bg-white rounded-lg shadow p-6">
        <ProgressiveDisclosure 
          title="Configuración Avanzada"
          defaultOpen={false}
          className="border-0 shadow-none"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tiempo de sesión (minutos)
              </label>
              <input
                type="number"
                defaultValue="60"
                min="15"
                max="480"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Idioma de notificaciones
              </label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="es">Español (México)</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </ProgressiveDisclosure>
      </div>
    </div>
  )
}

export default Settings
