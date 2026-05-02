
import { useEffect, useMemo, useState } from 'react';
import Layout from './Layout';
import { INSTRUMENT_MAP } from '../constants';
import { StockInstrumento, CreateStockDto, UpdateStockDto } from '../types';
import { dataService } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download, Package, Plus, X, Loader2, AlertCircle, Pencil, Trash2, User } from 'lucide-react';

const InstrumentManager: React.FC = () => {
  
  // State for the inventory
  const [inventory, setInventory] = useState<StockInstrumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newInstrument, setNewInstrument] = useState<CreateStockDto>({
    instrumentoId: 1,
    codigoInventario: '',
    numeroSerie: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockInstrumento | null>(null);
  const [editForm, setEditForm] = useState<UpdateStockDto>({
    codigoInventario: '',
    numeroSerie: '',
    estado: 'Disponible',
  });
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // Borrower map: stockInstrumentoId -> "Nombre Apellido"
  const [loansByStock, setLoansByStock] = useState<Record<number, string>>({});

  // Fetch Inventory
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const data = await dataService.getStock();
      setInventory(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el inventario');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoanInfo = async () => {
    try {
      const loans = await dataService.getActivePrestamos();
      if (!Array.isArray(loans) || loans.length === 0) {
        setLoansByStock({});
        return;
      }
      const map: Record<number, string> = {};
      await Promise.all(loans.map(async (loan: any) => {
        try {
          const student = await dataService.request(`/estudiante/${loan.estudianteId}`);
          const nombre = student?.nombre || student?.Nombre || '';
          const apellido = student?.apellido || student?.Apellido || '';
          map[loan.stockInstrumentoId] = `${nombre} ${apellido}`.trim() || loan.estudianteId;
        } catch {
          map[loan.stockInstrumentoId] = loan.estudianteId;
        }
      }));
      setLoansByStock(map);
    } catch {
      // Loan info is supplementary — fail silently
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchLoanInfo();
  }, []);

  // Grouping Logic
  const groupedInventory = useMemo(() => {
    return inventory.reduce((acc, item) => {
      const name = INSTRUMENT_MAP[item.instrumentoId] || 'Desconocido';
      if (!acc[name]) {
        acc[name] = [];
      }
      acc[name].push(item);
      return acc;
    }, {} as Record<string, StockInstrumento[]>);
  }, [inventory]);

  // Handle Create Instrument
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await dataService.createStock(newInstrument);
      await fetchInventory();
      setIsModalOpen(false);
      setNewInstrument({ instrumentoId: 1, codigoInventario: '', numeroSerie: '' });
    } catch (err: any) {
      alert(err.message || 'Error al crear el ejemplar');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Instrument
  const handleOpenEdit = (item: StockInstrumento) => {
    setEditingItem(item);
    setEditForm({
      codigoInventario: item.codigoInventario,
      numeroSerie: item.numeroSerie || '',
      estado: item.estado,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      setIsEditSubmitting(true);
      await dataService.updateStock(editingItem.stockInstrumentoId, editForm);
      await fetchInventory();
      setIsEditModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      alert(err.message || 'Error al actualizar el instrumento');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Handle Delete Instrument
  const handleDelete = async (item: StockInstrumento) => {
    const name = INSTRUMENT_MAP[item.instrumentoId] || 'Instrumento';
    if (!window.confirm(`¿Eliminar ${name} (${item.codigoInventario}) del inventario? Esta acción no se puede deshacer.`)) return;
    try {
      setIsDeleting(item.stockInstrumentoId);
      await dataService.deleteStock(item.stockInstrumentoId);
      await fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el instrumento');
    } finally {
      setIsDeleting(null);
    }
  };

  // Printing Logic
  const handlePrint = (title: string, items: StockInstrumento[]) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('Por favor habilite las ventanas emergentes para imprimir');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Imprimir Etiquetas - ${title}</title>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 30px; font-size: 24px; color: #333; }
            .grid { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 15px; 
            }
            .label-card { 
              border: 2px dashed #ccc; 
              padding: 15px; 
              text-align: center; 
              border-radius: 8px;
              page-break-inside: avoid;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              position: relative;
            }
            .qr-code { width: 120px; height: 120px; margin-bottom: 10px; }
            .item-name { font-weight: bold; font-size: 16px; margin: 5px 0; }
            .item-code { font-family: monospace; font-size: 14px; color: #000; background: #eee; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
            .item-serie { font-size: 11px; color: #555; margin-top: 5px; }
            
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; text-align: center; background: #f0f9ff; padding: 10px; border-radius: 8px;">
            <p>Se abrirá el diálogo de impresión. Puede seleccionar <strong>"Guardar como PDF"</strong> como destino.</p>
          </div>
          <h1>Inventario: ${title}</h1>
          <div class="grid">
            ${items.map(item => {
              const name = INSTRUMENT_MAP[item.instrumentoId] || 'Desconocido';
              const qrData = JSON.stringify({ id: item.stockInstrumentoId, code: item.codigoInventario, type: name, s: item.numeroSerie || '' });
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
              
              return `
                <div class="label-card">
                  <img src="${qrUrl}" class="qr-code" alt="QR" />
                  <div class="item-name">${name}</div>
                  <div class="item-code">${item.codigoInventario}</div>
                  ${item.numeroSerie ? `<div class="item-serie">N/S: ${item.numeroSerie}</div>` : ''}
                </div>
              `;
            }).join('')}
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (loading && inventory.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Cargando inventario...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Inventario de Instrumentos</h1>
            <p className="text-slate-500 mt-1">Gestión de stock, altas y etiquetas QR</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
            >
              <Plus size={18} />
              Dar de Alta
            </button>
            <button 
              onClick={() => handlePrint('Todo el Inventario', inventory)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition shadow-lg shadow-slate-900/20"
            >
              <Printer size={18} />
              Imprimir Todo
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-8">
          {(Object.entries(groupedInventory) as [string, StockInstrumento[]][]).map(([groupName, items]) => (
            <div key={groupName} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Group Header */}
              <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600">
                    <Package size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{groupName}</h2>
                    <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                      {items.length} Unidades
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={() => handlePrint(groupName, items)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200"
                >
                  <Printer size={16} />
                  Imprimir Grupo
                </button>
              </div>

              {/* Items Grid */}
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {items.map((item) => (
                    <div key={item.stockInstrumentoId} className="group relative bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 flex flex-col items-center p-4">
                       
                       {/* QR Section */}
                       <div className="mb-3 p-2 bg-white rounded-lg border border-gray-100 shadow-inner group-hover:scale-105 transition-transform">
                         <QRCodeSVG 
                            value={JSON.stringify({ id: item.stockInstrumentoId, code: item.codigoInventario, type: groupName, s: item.numeroSerie || '' })} 
                            size={100}
                            level="M"
                         />
                       </div>

                       {/* Info */}
                       <div className="text-center w-full">
                         <h3 className="font-bold text-slate-800 truncate" title={groupName}>{groupName}</h3>
                         <div className="mt-1 flex justify-center">
                           <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                             {item.codigoInventario}
                           </span>
                         </div>
                         <p className="text-[10px] text-slate-400 mt-1">SN: {item.numeroSerie || 'S/N'}</p>
                         <p className={`text-[10px] font-bold mt-1 px-2 ${item.estado === 'Disponible' ? 'text-green-600' : 'text-orange-600'}`}>
                           {item.estado}
                         </p>
                         {item.estado === 'Prestado' && loansByStock[item.stockInstrumentoId] && (
                           <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-blue-600 w-full px-1">
                             <User size={9} className="flex-shrink-0" />
                             <span className="truncate" title={loansByStock[item.stockInstrumentoId]}>
                               {loansByStock[item.stockInstrumentoId]}
                             </span>
                           </div>
                         )}
                       </div>

                       {/* Actions Overlay (visible on hover) */}
                       <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 rounded-xl">
                          <button
                            onClick={() => handlePrint(groupName, [item])}
                            className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-50 transform hover:scale-105 transition-all shadow-xl w-32 justify-center"
                          >
                            <Download size={16} />
                            Imprimir
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-600 transform hover:scale-105 transition-all shadow-xl w-32 justify-center"
                          >
                            <Pencil size={16} />
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={isDeleting === item.stockInstrumentoId}
                            className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-red-600 transform hover:scale-105 transition-all shadow-xl w-32 justify-center disabled:opacity-60"
                          >
                            {isDeleting === item.stockInstrumentoId ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            Eliminar
                          </button>
                       </div>
                       
                       {/* Status Dot */}
                       <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${item.estado === 'Disponible' ? 'bg-green-500' : 'bg-orange-500'}`} title={`Estado: ${item.estado}`}></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          
          {inventory.length === 0 && !loading && (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No hay instrumentos registrados en el inventario.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-4 text-blue-600 font-bold hover:underline"
              >
                Dar de alta el primer instrumento
              </button>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {isEditModalOpen && editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-slate-900 p-4 flex justify-between items-center">
                <h3 className="text-white font-bold text-lg">Editar Instrumento</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Instrumento</label>
                  <p className="px-3 py-2 bg-slate-100 rounded-lg text-slate-700 font-medium">
                    {INSTRUMENT_MAP[editingItem.instrumentoId] || 'Desconocido'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código de Inventario</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editForm.codigoInventario}
                    onChange={e => setEditForm({ ...editForm, codigoInventario: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de Serie (Opcional)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editForm.numeroSerie}
                    onChange={e => setEditForm({ ...editForm, numeroSerie: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editForm.estado}
                    onChange={e => setEditForm({ ...editForm, estado: e.target.value })}
                  >
                    <option value="Disponible">Disponible</option>
                    <option value="Prestado">Prestado</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    disabled={isEditSubmitting}
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isEditSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {isEditSubmitting && <Loader2 size={16} className="animate-spin" />}
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-slate-900 p-4 flex justify-between items-center">
                <h3 className="text-white font-bold text-lg">Alta de Instrumento</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Instrumento</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newInstrument.instrumentoId}
                    onChange={e => setNewInstrument({...newInstrument, instrumentoId: Number(e.target.value)})}
                  >
                    {Object.entries(INSTRUMENT_MAP).map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código de Inventario (Único)</label>
                  <input 
                    type="text"
                    required
                    placeholder="ej. CB-001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newInstrument.codigoInventario}
                    onChange={e => setNewInstrument({...newInstrument, codigoInventario: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de Serie (Opcional)</label>
                  <input 
                    type="text"
                    placeholder="ej. SN-99382"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newInstrument.numeroSerie}
                    onChange={e => setNewInstrument({...newInstrument, numeroSerie: e.target.value})}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    disabled={isSubmitting}
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default InstrumentManager;
