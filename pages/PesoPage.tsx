
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Weight, Percent, Ruler, Plus, Trash2, Pencil, X, CalendarDays, History, ArrowUp, ArrowDown, Scale, Check, BarChart4, Trophy } from 'lucide-react';
import type { WeightEntry } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import CalendarModal from '../components/CalendarModal';

// Helper functions for parsing and comparison
const parseMetric = (value: string | undefined): number | null => {
  if (value === undefined || value === null || value.trim() === '') return null;
  const num = parseFloat(value.replace(',', '.'));
  return isNaN(num) ? null : num;
};

// Helper function for IMC Classification
const getImcClassification = (imc: string | undefined) => {
  const imcNum = parseMetric(imc);
  if (imcNum === null) {
    return { classification: 'N/A', color: 'text-gray-400', bgColor: 'bg-gray-700/20' };
  }

  if (imcNum < 18.5) {
    return { classification: 'Peso inferior al normal', color: 'text-blue-400', bgColor: 'bg-blue-500/10' };
  } else if (imcNum >= 18.5 && imcNum <= 24.9) {
    return { classification: 'Peso normal', color: 'text-green-400', bgColor: 'bg-green-500/10' };
  } else if (imcNum >= 25 && imcNum <= 29.9) {
    return { classification: 'Sobrepeso', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' };
  } else if (imcNum >= 30 && imcNum <= 34.9) {
    return { classification: 'Obesidad I', color: 'text-red-400', bgColor: 'bg-red-500/10' };
  } else if (imcNum >= 35 && imcNum <= 39.9) {
    return { classification: 'Obesidad II', color: 'text-red-400', bgColor: 'bg-red-500/10' };
  } else { // imcNum >= 40
    return { classification: 'Obesidad III', color: 'text-red-400', bgColor: 'bg-red-500/10' };
  }
};

const calculateIMC = (weight: string, height: string): string => {
    const weightNum = parseMetric(weight);
    const heightNum = parseMetric(height);
    if (weightNum && weightNum > 0 && heightNum && heightNum > 0) {
        const heightInMeters = heightNum / 100;
        const imc = weightNum / (heightInMeters * heightInMeters);
        return imc.toFixed(2);
    }
    return '';
};

const getComparison = (current: number | null, prev: number | null): 'increase' | 'decrease' | 'same' | 'new' | null => {
  if (current === null) return null;
  if (prev === null) return 'new';
  if (current > prev) return 'increase';
  if (current < prev) return 'decrease';
  return 'same';
};

const createInitialEntryData = (): Omit<WeightEntry, 'id' | 'imc'> => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return {
      date: now.toISOString().split('T')[0],
      weight: '',
      fatPercentage: '',
      musclePercentage: '',
      visceralFat: '',
      height: '173',
  };
};

const formatFullDisplayDate = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00');
  if (!isNaN(date.getTime())) {
    const weekday = date.toLocaleDateString('es-ES', { weekday: 'long' });
    const day = date.getDate();
    const month = date.toLocaleDateString('es-ES', { month: 'long' });
    
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    
    return `${capitalize(weekday)} ${day} de ${capitalize(month)}`;
  }
  return dateString;
};

const MetricDisplay: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | undefined;
  unit: string;
  comparison?: 'increase' | 'decrease' | 'same' | 'new' | null;
  size?: 'large' | 'small';
}> = ({ icon: Icon, label, value, unit, comparison, size = 'large' }) => {
    const hasValue = value && value.trim() !== '';
    
    let colorClass = 'text-white';
    const lowerIsBetterMetrics = ['Peso', 'IMC', 'Grasa', 'Visceral'];

    if (lowerIsBetterMetrics.includes(label)) {
        // Lower is better: decrease is green, increase is red
        colorClass = comparison === 'increase' ? 'text-red-400' : comparison === 'decrease' ? 'text-green-400' : 'text-white';
    } else {
        // Higher is better (e.g., Muscle) or neutral (e.g., Height)
        colorClass = comparison === 'increase' ? 'text-green-400' : comparison === 'decrease' ? 'text-red-400' : 'text-white';
    }
    
    const iconSize = size === 'large' ? 'w-8 h-8' : 'w-5 h-5';
    const textSize = size === 'large' ? 'text-xl' : 'text-base';
    const labelSize = size === 'large' ? 'text-sm' : 'text-xs';

    return (
        <div className={`flex items-center gap-3 ${size === 'small' ? 'p-2' : 'p-4 rounded-lg bg-gray-800/50'}`}>
            <Icon className={`${iconSize} text-cyan-400 flex-shrink-0`} />
            <div>
                <p className={`${labelSize} text-gray-400`}>{label}</p>
                {hasValue ? (
                    <p className={`${textSize} font-bold flex items-center gap-1.5 ${colorClass}`}>
                        {comparison === 'increase' && <ArrowUp className="w-4 h-4" />}
                        {comparison === 'decrease' && <ArrowDown className="w-4 h-4" />}
                        {value}
                        <span className="text-sm font-normal text-gray-400">{unit}</span>
                    </p>
                ) : (
                    <p className={`${textSize} font-bold text-gray-500`}>-</p>
                )}
            </div>
        </div>
    );
};

// NEW COMPONENT: GoalCard
const GoalCard: React.FC<{ latestFatEntry: WeightEntry | null }> = ({ latestFatEntry }) => {
  const latestFatPercentage = parseMetric(latestFatEntry?.fatPercentage);
  const goalMin = 10;
  const goalMax = 15;

  if (latestFatPercentage !== null && latestFatPercentage >= goalMin && latestFatPercentage <= goalMax) {
    // Goal Met State
    return (
      <div className="bg-amber-900/20 backdrop-blur-md border border-amber-500/40 rounded-2xl p-4 sm:p-6 text-center animate-zoomInPop flex flex-col sm:flex-row items-center justify-center gap-4">
        <Trophy className="w-12 h-12 text-amber-400 animate-pulse-slow flex-shrink-0" />
        <div>
          <h2 className="text-xl font-extrabold text-amber-300">¡Felicidades! Estás en tu Prime Fisico</h2>
          <p className="text-amber-200/80">Tu porcentaje de grasa corporal ({latestFatPercentage}%) está en el rango ideal.</p>
        </div>
      </div>
    );
  }

  // Goal Not Met or No Data State
  return (
    <div className="bg-gray-800/50 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 text-center animate-zoomInPop flex flex-col sm:flex-row items-center justify-center gap-4">
       <Percent className="w-12 h-12 text-cyan-400 flex-shrink-0" />
       <div>
         <h2 className="text-xl font-extrabold text-white">Meta: Grasa Corporal 10-15%</h2>
         {latestFatPercentage !== null ? (
            <p className="text-gray-300">Tu registro más reciente es del <span className="font-bold text-white">{latestFatPercentage}%</span>. ¡Sigue así!</p>
         ) : (
            <p className="text-gray-300">Registra tu % de grasa para ver tu progreso hacia el objetivo.</p>
         )}
       </div>
    </div>
  );
};

// History Card Component
const HistoryCard: React.FC<{
  entry: WeightEntry;
  previousEntry: WeightEntry | null;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ entry, previousEntry, onEdit, onDelete }) => {

    const comparisons = useMemo(() => {
        const getMetricComparison = (metric: keyof Omit<WeightEntry, 'id'|'date'>) => 
            getComparison(parseMetric(entry[metric]), parseMetric(previousEntry?.[metric]));

        return {
            weight: getMetricComparison('weight'),
            fatPercentage: getMetricComparison('fatPercentage'),
            musclePercentage: getMetricComparison('musclePercentage'),
            visceralFat: getMetricComparison('visceralFat'),
            height: getMetricComparison('height'),
            imc: getMetricComparison('imc'),
        };
    }, [entry, previousEntry]);
    
    const imcData = getImcClassification(entry.imc);

    return (
        <div className="bg-black/20 rounded-xl p-4 border border-white/10 flex flex-col">
            <div className="flex justify-between items-center mb-3">
                <p className="font-semibold text-cyan-300">{formatFullDisplayDate(entry.date)}</p>
                <div className="flex items-center gap-1">
                    <button onClick={onEdit} className="p-2 text-gray-400 hover:text-cyan-400 transition rounded-full"><Pencil className="w-4 h-4"/></button>
                    <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 transition rounded-full"><Trash2 className="w-4 h-4"/></button>
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1 mb-auto">
                <MetricDisplay icon={Weight} label="Peso" value={entry.weight} unit="kg" comparison={comparisons.weight} size="small"/>
                <MetricDisplay icon={Ruler} label="Altura" value={entry.height} unit="cm" comparison={comparisons.height} size="small"/>
                <MetricDisplay icon={BarChart4} label="IMC" value={entry.imc} unit="" comparison={comparisons.imc} size="small"/>
                <MetricDisplay icon={Percent} label="Grasa" value={entry.fatPercentage} unit="%" comparison={comparisons.fatPercentage} size="small"/>
                <MetricDisplay icon={Percent} label="Músculo" value={entry.musclePercentage} unit="%" comparison={comparisons.musclePercentage} size="small"/>
                <MetricDisplay icon={Percent} label="Visceral" value={entry.visceralFat} unit="" comparison={comparisons.visceralFat} size="small"/>
            </div>
            {entry.imc && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                    <div className={`text-center p-2 rounded-md ${imcData.bgColor}`}>
                        <p className={`font-bold text-sm ${imcData.color}`}>{imcData.classification}</p>
                    </div>
                </div>
            )}
        </div>
    );
};


// Main Component
const PesoPage: React.FC = () => {
    const { 
      weightHistory, 
      addWeightEntry, 
      updateWeightEntry, 
      removeWeightEntry 
    } = useAppContext();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
    const [entryToDelete, setEntryToDelete] = useState<WeightEntry | null>(null);

    const latestFatEntry = useMemo(() => {
        // The history is already sorted descending by date. Find the first one with a fat percentage.
        return weightHistory.find(entry => entry.fatPercentage && entry.fatPercentage.trim() !== '') || null;
    }, [weightHistory]);

    const handleOpenModal = (entry: WeightEntry | null = null) => {
        setEditingEntry(entry);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEntry(null);
    };

    const handleSaveEntry = (data: Omit<WeightEntry, 'id' | 'imc'>) => {
        if (editingEntry) {
            updateWeightEntry(editingEntry.id, data);
        } else {
            addWeightEntry(data);
        }
        handleCloseModal();
    };

    const handleConfirmDelete = () => {
        if (entryToDelete) {
            removeWeightEntry(entryToDelete.id);
            setEntryToDelete(null);
        }
    };
    
    return (
        <div className="space-y-6 pb-24 animate-fadeInUp">
            <ConfirmationModal 
              isOpen={!!entryToDelete} 
              onClose={() => setEntryToDelete(null)} 
              onConfirm={handleConfirmDelete} 
              title="Eliminar Registro" 
              message={`¿Seguro que quieres eliminar el registro del ${entryToDelete ? formatFullDisplayDate(entryToDelete.date) : ''}?`}
            />

            <EntryModal
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              onSave={handleSaveEntry}
              initialData={editingEntry}
            />

            {/* Header */}
            <div className="bg-gray-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 text-center">
              <h1 className="text-2xl font-extrabold text-cyan-400 flex items-center justify-center gap-3 uppercase tracking-wider">
                  <Scale className="w-7 h-7" />
                  Peso y Composición Corporal
              </h1>
            </div>

            <GoalCard latestFatEntry={latestFatEntry} />
            
            {/* History Section */}
            <div className="bg-gray-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6">
                <h2 className="text-lg font-bold text-white mb-4">Historial</h2>
                {weightHistory.length > 0 ? (
                    <div className="max-h-[70vh] overflow-y-auto custom-scrollbar pr-2 -mr-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {weightHistory.map((entry, index) => (
                            <HistoryCard
                                key={entry.id}
                                entry={entry}
                                previousEntry={weightHistory[index + 1] || null}
                                onEdit={() => handleOpenModal(entry)}
                                onDelete={() => setEntryToDelete(entry)}
                            />
                        ))}
                      </div>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-400">
                        <History className="w-12 h-12 mx-auto mb-2" />
                        No hay historial de registros.
                    </div>
                )}
            </div>


            <button
                onClick={() => handleOpenModal()}
                className="fixed bottom-6 right-6 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-full shadow-lg shadow-cyan-500/30 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-cyan-500/50 w-16 h-16 flex items-center justify-center z-20"
                aria-label="Añadir nuevo registro de peso"
            >
                <Plus className="w-8 h-8" />
            </button>
        </div>
    );
}

// Modal Component
interface EntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<WeightEntry, 'id' | 'imc'>) => void;
    initialData?: WeightEntry | null;
}

const EntryModal: React.FC<EntryModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState(initialData || createInitialEntryData());
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [displayImc, setDisplayImc] = useState('');

    useEffect(() => {
        if (isOpen) {
            const data = initialData || createInitialEntryData();
            setFormData(data);
            setDisplayImc(calculateIMC(data.weight, data.height));
        }
    }, [isOpen, initialData]);

    useEffect(() => {
      setDisplayImc(calculateIMC(formData.weight, formData.height));
    }, [formData.weight, formData.height]);

    if (!isOpen) return null;

    const handleInputChange = (field: keyof Omit<WeightEntry, 'id' | 'imc'>, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveClick = () => {
        onSave(formData);
    };

    const inputClasses = "w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 transition duration-200 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-cyan-500/70";

    return (
        <>
          <CalendarModal 
            isOpen={isCalendarOpen} 
            onClose={() => setIsCalendarOpen(false)} 
            currentDate={formData.date} 
            onSelectDate={(date) => handleInputChange('date', date)} 
          />
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fadeIn" onClick={onClose}>
              <div className="bg-gray-800/80 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl p-6 w-full max-w-lg m-4 animate-scaleIn" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-cyan-400">{initialData ? 'Editar Registro' : 'Nuevo Registro'}</h2>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setIsCalendarOpen(true)} className="bg-gray-700 border border-gray-600 rounded-md py-1 px-2 transition text-white text-sm flex items-center gap-1.5">
                            <CalendarDays className="w-4 h-4"/>
                            {formatFullDisplayDate(formData.date)}
                        </button>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition"><X className="w-6 h-6" /></button>
                      </div>
                  </div>
                  <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-1"><Weight className="w-4 h-4 text-cyan-400" />Peso (kg)</label>
                            <input type="text" inputMode="decimal" value={formData.weight} onChange={(e) => handleInputChange('weight', e.target.value)} className={inputClasses} />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-1"><Ruler className="w-4 h-4 text-cyan-400" />Altura (cm)</label>
                            <input type="text" inputMode="decimal" value={formData.height} onChange={(e) => handleInputChange('height', e.target.value)} className={inputClasses} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-1"><BarChart4 className="w-4 h-4 text-cyan-400" />IMC (Índice de Masa Corporal)</label>
                          <input type="text" value={displayImc} readOnly disabled className={`${inputClasses} bg-gray-800 text-gray-300 font-bold`} />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-1"><Percent className="w-4 h-4 text-cyan-400" />Grasa Corporal (%)</label>
                            <input type="text" inputMode="decimal" value={formData.fatPercentage} onChange={(e) => handleInputChange('fatPercentage', e.target.value)} className={inputClasses} />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-1"><Percent className="w-4 h-4 text-cyan-400" />Masa Muscular (%)</label>
                            <input type="text" inputMode="decimal" value={formData.musclePercentage} onChange={(e) => handleInputChange('musclePercentage', e.target.value)} className={inputClasses} />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-1"><Percent className="w-4 h-4 text-cyan-400" />Grasa Visceral</label>
                            <input type="text" inputMode="decimal" value={formData.visceralFat} onChange={(e) => handleInputChange('visceralFat', e.target.value)} className={inputClasses} />
                        </div>
                      </div>
                  </div>
                  <div className="mt-6 flex justify-end gap-4">
                      <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-md transition">Cancelar</button>
                      <button onClick={handleSaveClick} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-md transition">Guardar</button>
                  </div>
              </div>
          </div>
        </>
    );
};

export default PesoPage;
