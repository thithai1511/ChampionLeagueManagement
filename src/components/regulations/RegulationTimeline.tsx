import React from 'react';
import { Check } from 'lucide-react';

interface TimelineStep {
  step: number;
  title: string;
  description: string;
}

interface RegulationTimelineProps {
  steps: TimelineStep[];
}

const RegulationTimeline: React.FC<RegulationTimelineProps> = ({ steps }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="space-y-6">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.step} className="flex gap-4">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shadow-md z-10">
                  {step.step}
                </div>
                {!isLast && (
                  <div className="w-0.5 h-full bg-blue-200 mt-2 min-h-[40px]" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RegulationTimeline;
