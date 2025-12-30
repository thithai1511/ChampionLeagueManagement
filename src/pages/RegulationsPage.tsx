import React, { useState } from 'react';
import { Book, AlertCircle, Info, CheckCircle } from 'lucide-react';
import RoleSelector from '../components/regulations/RoleSelector';
import RegulationTabs from '../components/regulations/RegulationTabs';
import RegulationCard from '../components/regulations/RegulationCard';
import RegulationAccordion from '../components/regulations/RegulationAccordion';
import RegulationTimeline from '../components/regulations/RegulationTimeline';
import RegulationTable from '../components/regulations/RegulationTable';
import { RoleType, PhaseType, regulations } from '../data/regulations';

const RegulationsPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<RoleType>('league_admin');
  const [selectedPhase, setSelectedPhase] = useState<PhaseType>('pre_season');

  const currentContent = regulations[selectedRole]?.[selectedPhase];

  const renderBanner = (type: 'warning' | 'info' | 'success', message: string) => {
    const styles = {
      warning: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: AlertCircle,
        iconColor: 'text-amber-600',
        textColor: 'text-amber-900',
      },
      info: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: Info,
        iconColor: 'text-blue-600',
        textColor: 'text-blue-900',
      },
      success: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: CheckCircle,
        iconColor: 'text-green-600',
        textColor: 'text-green-900',
      },
    };

    const style = styles[type];
    const Icon = style.icon;

    return (
      <div className={`${style.bg} border ${style.border} rounded-xl p-5 flex gap-4`}>
        <Icon className={`w-6 h-6 ${style.iconColor} flex-shrink-0 mt-0.5`} />
        <p className={`text-sm leading-relaxed ${style.textColor}`}>{message}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Book className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Quy định giải hạng nhất VĐQG</h1>
              <p className="text-blue-100 mt-2">
                Quy định chi tiết theo từng vai trò và giai đoạn mùa giải
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Role Selector */}
        <div className="mb-6">
          <RoleSelector selectedRole={selectedRole} onRoleChange={setSelectedRole} />
        </div>

        {/* Phase Tabs */}
        <div className="mb-8">
          <RegulationTabs selectedPhase={selectedPhase} onPhaseChange={setSelectedPhase} />
        </div>

        {/* Content Area */}
        {currentContent ? (
          <div className="space-y-6">
            {/* Banner */}
            {currentContent.banner && (
              <div className="mb-6">
                {renderBanner(currentContent.banner.type, currentContent.banner.message)}
              </div>
            )}

            {/* Cards */}
            {currentContent.cards && currentContent.cards.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentContent.cards.map((card, index) => (
                  <RegulationCard
                    key={index}
                    icon={card.icon}
                    title={card.title}
                    items={card.items}
                  />
                ))}
              </div>
            )}

            {/* Accordions */}
            {currentContent.accordions && currentContent.accordions.length > 0 && (
              <div className="space-y-4">
                {currentContent.accordions.map((accordion, index) => (
                  <RegulationAccordion
                    key={index}
                    title={accordion.title}
                    items={accordion.items}
                    steps={accordion.steps}
                  />
                ))}
              </div>
            )}

            {/* Tables */}
            {currentContent.tables && currentContent.tables.length > 0 && (
              <div className="space-y-6">
                {currentContent.tables.map((table, index) => (
                  <RegulationTable
                    key={index}
                    title={table.title}
                    headers={table.headers}
                    rows={table.rows}
                  />
                ))}
              </div>
            )}

            {/* Timeline */}
            {currentContent.timeline && currentContent.timeline.length > 0 && (
              <div>
                <RegulationTimeline steps={currentContent.timeline} />
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Info className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Không có quy định đặc biệt
            </h3>
            <p className="text-gray-600">
              Không có quy định cụ thể cho vai trò và giai đoạn này
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Lưu ý</h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                Quy định này có thể được cập nhật theo thời gian. Vui lòng kiểm tra thường xuyên để 
                đảm bảo tuân thủ các quy định mới nhất của giải đấu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegulationsPage;
