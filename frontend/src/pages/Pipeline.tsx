import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { DollarSign, Calendar, User, MoreVertical } from 'lucide-react'

const Pipeline = () => {
  const [deals, setDeals] = useState({
    discovery: [
      {
        id: '1',
        title: 'Señalética IDOT',
        company: 'Illinois DOT',
        amount: 75000,
        probability: 30,
        closeDate: '2024-09-15',
        owner: 'Juan Pérez'
      }
    ],
    qualification: [
      {
        id: '2',
        title: 'Marketing Materials',
        company: 'City of Chicago',
        amount: 25000,
        probability: 50,
        closeDate: '2024-09-10',
        owner: 'María García'
      }
    ],
    bid_no_bid: [
      {
        id: '3',
        title: 'Event Banners',
        company: 'Cook County',
        amount: 15000,
        probability: 70,
        closeDate: '2024-09-05',
        owner: 'Carlos López'
      }
    ],
    proposal: [
      {
        id: '4',
        title: 'Vehicle Wraps',
        company: 'Private Client',
        amount: 45000,
        probability: 80,
        closeDate: '2024-08-30',
        owner: 'Ana Rodríguez'
      }
    ],
    negotiation: [],
    won: [
      {
        id: '5',
        title: 'Office Signage',
        company: 'Local Business',
        amount: 8000,
        probability: 100,
        closeDate: '2024-08-20',
        owner: 'Juan Pérez'
      }
    ],
    lost: []
  })

  const stages = [
    { id: 'discovery', title: 'Descubrimiento', color: 'bg-gray-100' },
    { id: 'qualification', title: 'Calificación', color: 'bg-blue-100' },
    { id: 'bid_no_bid', title: 'Bid/No-Bid', color: 'bg-yellow-100' },
    { id: 'proposal', title: 'Propuesta', color: 'bg-orange-100' },
    { id: 'negotiation', title: 'Negociación', color: 'bg-purple-100' },
    { id: 'won', title: 'Ganado', color: 'bg-green-100' },
    { id: 'lost', title: 'Perdido', color: 'bg-red-100' }
  ]

  const onDragEnd = (result: any) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const sourceStage = deals[source.droppableId as keyof typeof deals]
    const destStage = deals[destination.droppableId as keyof typeof deals]
    const draggedDeal = sourceStage.find(deal => deal.id === draggableId)

    if (!draggedDeal) return

    const newSourceStage = sourceStage.filter(deal => deal.id !== draggableId)
    const newDestStage = [...destStage]
    newDestStage.splice(destination.index, 0, draggedDeal)

    setDeals({
      ...deals,
      [source.droppableId]: newSourceStage,
      [destination.droppableId]: newDestStage
    })
  }

  const getTotalValue = (stageDeals: any[]) => {
    return stageDeals.reduce((sum, deal) => sum + deal.amount, 0)
  }

  const getWeightedValue = (stageDeals: any[]) => {
    return stageDeals.reduce((sum, deal) => sum + (deal.amount * deal.probability / 100), 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline de Ventas</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Nuevo Deal
        </button>
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Pipeline</div>
          <div className="text-2xl font-bold text-gray-900">
            ${Object.values(deals).flat().reduce((sum, deal) => sum + deal.amount, 0).toLocaleString()}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Valor Ponderado</div>
          <div className="text-2xl font-bold text-blue-600">
            ${Object.values(deals).flat().reduce((sum, deal) => sum + (deal.amount * deal.probability / 100), 0).toLocaleString()}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Deals Activos</div>
          <div className="text-2xl font-bold text-green-600">
            {Object.values(deals).flat().filter(deal => deal.probability > 0 && deal.probability < 100).length}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Tasa de Conversión</div>
          <div className="text-2xl font-bold text-purple-600">68%</div>
        </div>
      </div>

      {/* Pipeline Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 overflow-x-auto">
            {stages.map((stage) => (
              <div key={stage.id} className="min-w-64">
                <div className={`${stage.color} rounded-lg p-3 mb-4`}>
                  <h3 className="font-medium text-gray-900">{stage.title}</h3>
                  <div className="text-sm text-gray-600 mt-1">
                    {deals[stage.id as keyof typeof deals].length} deals
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    ${getTotalValue(deals[stage.id as keyof typeof deals]).toLocaleString()}
                  </div>
                  {stage.id !== 'won' && stage.id !== 'lost' && (
                    <div className="text-xs text-gray-500">
                      Ponderado: ${getWeightedValue(deals[stage.id as keyof typeof deals]).toLocaleString()}
                    </div>
                  )}
                </div>

                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-32 space-y-3 ${
                        snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''
                      }`}
                    >
                      {deals[stage.id as keyof typeof deals].map((deal, index) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${
                                snapshot.isDragging ? 'rotate-3 shadow-lg' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-gray-900 text-sm">{deal.title}</h4>
                                <button className="text-gray-400 hover:text-gray-600">
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-3">{deal.company}</p>
                              
                              <div className="space-y-2">
                                <div className="flex items-center text-sm text-gray-600">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  <span>${deal.amount.toLocaleString()}</span>
                                  <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                                    {deal.probability}%
                                  </span>
                                </div>
                                
                                <div className="flex items-center text-sm text-gray-600">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  <span>{new Date(deal.closeDate).toLocaleDateString('es-ES')}</span>
                                </div>
                                
                                <div className="flex items-center text-sm text-gray-600">
                                  <User className="h-3 w-3 mr-1" />
                                  <span>{deal.owner}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  )
}

export default Pipeline
