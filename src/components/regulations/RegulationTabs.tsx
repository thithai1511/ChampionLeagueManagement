import React from 'react';
import { PhaseType, phases } from '../../data/regulations';

interface RegulationTabsProps {
  selectedPhase: PhaseType;
  onPhaseChange: (phase: PhaseType) => void;
  theme?: {
    headerGradient?: string;
    iconBg?: string;
    accentColor?: string;
    borderColor?: string;
  };
}

const RegulationTabs: React.FC<RegulationTabsProps> = ({ selectedPhase, onPhaseChange, theme }) => {
  // Map theme to tab colors
  const getTabColor = () => {
    if (!theme?.headerGradient) {
      return 'bg-blue-600';
    }
    
    if (theme.headerGradient.includes('slate-900')) {
      return 'bg-slate-700';
    }
    if (theme.headerGradient.includes('purple-900')) {
      return 'bg-purple-600';
    }
    if (theme.headerGradient.includes('green-600')) {
      return 'bg-green-600';
    }
    // Default blue
    return 'bg-blue-600';
  };
  
  const tabColor = getTabColor();
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
                    ? `${tabColor} text-white shadow-sm`
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
