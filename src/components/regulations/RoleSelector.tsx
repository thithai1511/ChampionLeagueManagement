import React from 'react';
import { RoleType, roles } from '../../data/regulations';
import { LucideIcon } from 'lucide-react';

interface RoleSelectorProps {
  selectedRole: RoleType;
  onRoleChange: (role: RoleType) => void;
  theme?: {
    headerGradient?: string;
    iconBg?: string;
    accentColor?: string;
    borderColor?: string;
  };
}

const RoleSelector: React.FC<RoleSelectorProps> = ({ selectedRole, onRoleChange, theme }) => {
  // Map theme to button colors
  const getButtonColors = () => {
    if (!theme?.headerGradient) {
      return {
        from: 'from-blue-600',
        to: 'to-blue-700',
      };
    }
    
    // Extract colors from gradient
    if (theme.headerGradient.includes('slate-900')) {
      return { from: 'from-slate-700', to: 'to-slate-800' };
    }
    if (theme.headerGradient.includes('purple-900')) {
      return { from: 'from-purple-600', to: 'to-purple-700' };
    }
    if (theme.headerGradient.includes('green-600')) {
      return { from: 'from-green-600', to: 'to-green-700' };
    }
    // Default blue
    return { from: 'from-blue-600', to: 'to-blue-700' };
  };
  
  const buttonColors = getButtonColors();
  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-2">
      <div className="flex flex-wrap gap-2 md:gap-3">
        {roles.map((role) => {
          const Icon = role.icon as LucideIcon;
          const isActive = selectedRole === role.id;
          
          return (
            <button
              key={role.id}
              onClick={() => onRoleChange(role.id as RoleType)}
              className={`
                flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200
                flex-1 min-w-[140px] justify-center
                ${
                  isActive
                    ? `bg-gradient-to-r ${buttonColors.from} ${buttonColors.to} text-white shadow-md scale-105`
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-sm'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm md:text-base whitespace-nowrap">{role.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RoleSelector;
