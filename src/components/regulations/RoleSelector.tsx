import React from 'react';
import { RoleType, roles } from '../../data/regulations';
import { LucideIcon } from 'lucide-react';

interface RoleSelectorProps {
  selectedRole: RoleType;
  onRoleChange: (role: RoleType) => void;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({ selectedRole, onRoleChange }) => {
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
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md scale-105'
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
