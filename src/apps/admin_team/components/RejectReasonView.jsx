import React, { useState } from 'react';
import { Eye, Info, X } from 'lucide-react';

const RejectReasonView = ({ reason }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!reason) return null;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-900/10 text-red-400 hover:bg-red-900/30 border border-red-900/20 hover:border-red-800 transition-colors"
                title="Xem lý do từ chối"
            >
                <Info size={14} />
                Lý do
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-700 animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Info size={16} className="text-red-500" />
                                Lý do từ chối
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-300 leading-relaxed">
                                {reason}
                            </p>
                        </div>
                        <div className="p-3 bg-gray-900/50 flex justify-end">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default RejectReasonView;
