import { useState } from 'react'
import { FileText, Download, Plus, Edit, Trash2 } from 'lucide-react'

const Proposals = () => {
  const [proposals] = useState([
    {
      id: 1,
      title: 'Propuesta - Señalética IDOT',
      opportunity: 'Illinois Department of Transportation',
      status: 'draft',
      created_at: '2024-08-25',
      due_date: '2024-09-15',
      amount: 75000
    },
    {
      id: 2,
      title: 'Propuesta - Marketing Materials',
      opportunity: 'City of Chicago',
      status: 'submitted',
      created_at: '2024-08-20',
      due_date: '2024-09-10',
      amount: 25000
    }
  ])

  const getStatusColor = (status: string) => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-800',
      'submitted': 'bg-blue-100 text-blue-800',
      'won': 'bg-green-100 text-green-800',
      'lost': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.draft
  }

  const getStatusText = (status: string) => {
    const texts = {
      'draft': 'Borrador',
      'submitted': 'Enviada',
      'won': 'Ganada',
      'lost': 'Perdida'
    }
    return texts[status as keyof typeof texts] || status
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Propuestas</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Propuesta
        </button>
      </div>

      {/* Proposal Templates */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Plantillas Disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer">
            <div className="flex items-center mb-2">
              <FileText className="h-5 w-5 text-blue-600 mr-2" />
              <span className="font-medium">Propuesta Estándar</span>
            </div>
            <p className="text-sm text-gray-600">
              Plantilla completa con carta de presentación, alcance, cronograma y precios.
            </p>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer">
            <div className="flex items-center mb-2">
              <FileText className="h-5 w-5 text-green-600 mr-2" />
              <span className="font-medium">Propuesta Gubernamental</span>
            </div>
            <p className="text-sm text-gray-600">
              Incluye formularios de cumplimiento, certificaciones y referencias requeridas.
            </p>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer">
            <div className="flex items-center mb-2">
              <FileText className="h-5 w-5 text-purple-600 mr-2" />
              <span className="font-medium">Propuesta Express</span>
            </div>
            <p className="text-sm text-gray-600">
              Versión simplificada para proyectos pequeños y cotizaciones rápidas.
            </p>
          </div>
        </div>
      </div>

      {/* Proposals List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Propuestas Recientes</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{proposal.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(proposal.status)}`}>
                      {getStatusText(proposal.status)}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-2">{proposal.opportunity}</p>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <span>Creada: {new Date(proposal.created_at).toLocaleDateString('es-ES')}</span>
                    <span>Vence: {new Date(proposal.due_date).toLocaleDateString('es-ES')}</span>
                    <span>Valor: ${proposal.amount.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <Download className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Checklist */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Checklist de Cumplimiento</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Documentos Requeridos</h3>
            <div className="space-y-2">
              {[
                'Formulario W-9',
                'Certificado de Seguro (COI)',
                'Certificación M/WBE',
                'Carta de Referencia',
                'Muestras de Trabajo',
                'Fichas Técnicas'
              ].map((item, index) => (
                <label key={index} className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="ml-2 text-sm text-gray-700">{item}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Secciones de Propuesta</h3>
            <div className="space-y-2">
              {[
                'Carta de Presentación',
                'Alcance del Trabajo',
                'Cronograma del Proyecto',
                'Tabla de Precios',
                'Términos y Condiciones',
                'Casos de Éxito'
              ].map((item, index) => (
                <label key={index} className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="ml-2 text-sm text-gray-700">{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Proposals
