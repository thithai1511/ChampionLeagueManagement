import React from 'react';
import { PhaseType, phases } from '../../data/regulations';

interface RegulationTabsProps {
  selectedPhase: PhaseType;
  onPhaseChange: (phase: PhaseType) => void;
}

const RegulationTabs: React.FC<RegulationTabsProps> = ({ selectedPhase, onPhaseChange }) => {
  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-1.5">
      <div className="flex gap-1">
        {phases.map((phase) => {
          const isActive = selectedPhase === phase.id;
          
          return (
            <button
              key={phase.id}
              onClick={() => onPhaseChange(phase.id as PhaseType)}
              className={`
                flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200
                ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <span className="text-sm md:text-base">{phase.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RegulationTabs;
