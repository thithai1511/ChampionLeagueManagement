import React, { useState, useEffect } from 'react';
import { Users, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * InteractiveFormationPitch - FIFA-style interactive lineup builder
 * Click on positions to assign players directly on the formation pitch
 */

// Formation position slots with coordinates (x%, y%)
const FORMATION_SLOTS = {
    '4-4-2': [
        { key: 'GK', label: 'GK', x: 50, y: 8 },
        { key: 'LB', label: 'LB', x: 15, y: 25 },
        { key: 'LCB', label: 'LCB', x: 38, y: 25 },
        { key: 'RCB', label: 'RCB', x: 62, y: 25 },
        { key: 'RB', label: 'RB', x: 85, y: 25 },
        { key: 'LM', label: 'LM', x: 15, y: 50 },
        { key: 'LCM', label: 'LCM', x: 38, y: 50 },
        { key: 'RCM', label: 'RCM', x: 62, y: 50 },
        { key: 'RM', label: 'RM', x: 85, y: 50 },
        { key: 'LS', label: 'LS', x: 35, y: 75 },
        { key: 'RS', label: 'RS', x: 65, y: 75 }
    ],
    '4-3-3': [
        { key: 'GK', label: 'GK', x: 50, y: 8 },
        { key: 'LB', label: 'LB', x: 15, y: 25 },
        { key: 'LCB', label: 'LCB', x: 38, y: 25 },
        { key: 'RCB', label: 'RCB', x: 62, y: 25 },
        { key: 'RB', label: 'RB', x: 85, y: 25 },
        { key: 'LCM', label: 'LCM', x: 25, y: 50 },
        { key: 'CM', label: 'CM', x: 50, y: 50 },
        { key: 'RCM', label: 'RCM', x: 75, y: 50 },
        { key: 'LW', label: 'LW', x: 20, y: 75 },
        { key: 'ST', label: 'ST', x: 50, y: 80 },
        { key: 'RW', label: 'RW', x: 80, y: 75 }
    ],
    '4-2-3-1': [
        { key: 'GK', label: 'GK', x: 50, y: 8 },
        { key: 'LB', label: 'LB', x: 15, y: 25 },
        { key: 'LCB', label: 'LCB', x: 38, y: 25 },
        { key: 'RCB', label: 'RCB', x: 62, y: 25 },
        { key: 'RB', label: 'RB', x: 85, y: 25 },
        { key: 'LCDM', label: 'LCDM', x: 35, y: 42 },
        { key: 'RCDM', label: 'RCDM', x: 65, y: 42 },
        { key: 'LAM', label: 'LAM', x: 20, y: 60 },
        { key: 'CAM', label: 'CAM', x: 50, y: 60 },
        { key: 'RAM', label: 'RAM', x: 80, y: 60 },
        { key: 'ST', label: 'ST', x: 50, y: 80 }
    ]
};

const InteractiveFormationPitch = ({ teamId, teamName, squad, initialLineup, onSave, teamColor = '#3b82f6' }) => {
    console.log('[InteractiveFormationPitch] Component mounted for team:', teamName);
    const [formation, setFormation] = useState(initialLineup?.formation || '4-4-2');
    const [positionAssignments, setPositionAssignments] = useState({});
    const [substitutes, setSubstitutes] = useState(initialLineup?.substitutes || []);
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [showPlayerModal, setShowPlayerModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Sync with initial lineup
    useEffect(() => {
        if (initialLineup?.starters && initialLineup.starters.length > 0) {
            // Map starters to positions (simple index-based for now)
            const slots = FORMATION_SLOTS[formation] || FORMATION_SLOTS['4-4-2'];
            const assignments = {};
            initialLineup.starters.forEach((playerId, index) => {
                if (slots[index]) {
                    assignments[slots[index].key] = playerId;
                }
            });
            setPositionAssignments(assignments);
        }
        if (initialLineup?.substitutes) {
            setSubstitutes(initialLineup.substitutes);
        }
    }, [initialLineup, formation]);

    const handlePositionClick = (positionKey) => {
        setSelectedPosition(positionKey);
        setShowPlayerModal(true);
        setSearchQuery('');
    };

    const handlePlayerSelect = (playerId) => {
        setPositionAssignments(prev => ({ ...prev, [selectedPosition]: playerId }));
        setShowPlayerModal(false);
        setSelectedPosition(null);
        toast.success('Player assigned!');
    };

    const handleRemovePlayer = (positionKey) => {
        setPositionAssignments(prev => {
            const newAssignments = { ...prev };
            delete newAssignments[positionKey];
            return newAssignments;
        });
    };

    const toggleSubstitute = (playerId) => {
        if (substitutes.includes(playerId)) {
            setSubstitutes(prev => prev.filter(id => id !== playerId));
        } else if (substitutes.length < 5) {
            setSubstitutes(prev => [...prev, playerId]);
        } else {
            toast.error('Maximum 5 substitutes');
        }
    };

    const handleSave = () => {
        const assignedPlayers = Object.values(positionAssignments);
        if (assignedPlayers.length !== 11) {
            toast.error(`Must assign all 11 positions. Currently: ${assignedPlayers.length}/11`);
            return;
        }
        onSave(teamId, {
            formation,
            starters: assignedPlayers,
            substitutes
        });
    };

    const slots = FORMATION_SLOTS[formation] || FORMATION_SLOTS['4-4-2'];
    const assignedPlayerIds = Object.values(positionAssignments);
    const availablePlayers = squad.filter(p => !assignedPlayerIds.includes(p.id) && !substitutes.includes(p.id));

    const filteredPlayers = showPlayerModal
        ? availablePlayers.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.position.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : [];

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col h-[600px]">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="font-bold text-lg text-gray-800">{teamName}</h3>
                <div className="flex gap-2">
                    <select
                        value={formation}
                        onChange={e => setFormation(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option>4-4-2</option>
                        <option>4-3-3</option>
                        <option>4-2-3-1</option>
                    </select>
                    <button
                        onClick={handleSave}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded text-sm font-medium transition-colors"
                    >
                        Save
                    </button>
                </div>
            </div>

            {/* Formation Pitch */}
            <div className="relative flex-1 rounded-2xl overflow-hidden shadow-lg" style={{ aspectRatio: '5/7' }}>
                {/* Grass background */}
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500 via-green-600 to-emerald-700">
                    <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)`
                    }} />
                </div>

                {/* Field markings */}
                <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.3 }}>
                    <circle cx="50%" cy="50%" r="12%" fill="none" stroke="white" strokeWidth="2" />
                    <line x1="0" y1="50%" x2="100%" y2="50%" stroke="white" strokeWidth="2" />
                    <rect x="20%" y="2%" width="60%" height="16%" fill="none" stroke="white" strokeWidth="2" />
                    <rect x="20%" y="82%" width="60%" height="16%" fill="none" stroke="white" strokeWidth="2" />
                </svg>

                {/* Position slots */}
                <div className="relative w-full h-full">
                    {slots.map(slot => {
                        const player = squad.find(p => p.id === positionAssignments[slot.key]);
                        const isEmpty = !player;

                        return (
                            <div
                                key={slot.key}
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                                onClick={() => handlePositionClick(slot.key)}
                            >
                                <div className="flex flex-col items-center">
                                    {/* Player circle */}
                                    <div
                                        className={`w-14 h-14 rounded-full flex items-center justify-center border-4 border-white/30 shadow-xl transition-all duration-300 ${isEmpty ? 'bg-gray-700/50 hover:bg-gray-600/70' : 'hover:scale-110'
                                            }`}
                                        style={!isEmpty ? { backgroundColor: teamColor } : {}}
                                    >
                                        {isEmpty ? (
                                            <span className="text-2xl text-white">+</span>
                                        ) : (
                                            <span className="text-2xl font-black text-white drop-shadow-lg">
                                                {player.shirtNumber || '?'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Player name card */}
                                    <div
                                        className="mt-2 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg border-2 min-w-[100px] max-w-[140px]"
                                        style={{ borderColor: isEmpty ? '#6b7280' : teamColor }}
                                    >
                                        <p className="text-xs font-extrabold truncate text-center" style={{ color: '#000000' }}>
                                            {isEmpty ? slot.label : player.name}
                                        </p>
                                        <p className="text-[10px] uppercase text-center font-bold" style={{ color: '#334155' }}>
                                            {isEmpty ? 'Empty' : player.position}
                                        </p>
                                    </div>

                                    {/* Remove button (only if assigned) */}
                                    {!isEmpty && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemovePlayer(slot.key);
                                            }}
                                            className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Substitutes section */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                    <Users size={16} className="text-gray-600" />
                    <span className="text-sm font-bold text-gray-700">Substitutes ({substitutes.length}/5)</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                    {squad.filter(p => !assignedPlayerIds.includes(p.id)).map(p => {
                        const isSub = substitutes.includes(p.id);
                        return (
                            <div
                                key={p.id}
                                onClick={() => toggleSubstitute(p.id)}
                                className={`p-2 rounded border cursor-pointer text-center transition-all ${isSub ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-200' : 'bg-white border-gray-200 hover:border-gray-400'
                                    }`}
                            >
                                <div className={`text-xs font-bold ${isSub ? 'text-blue-700' : 'text-gray-600'}`}>
                                    #{p.shirtNumber || '-'}
                                </div>
                                <div className={`text-[10px] truncate ${isSub ? 'text-blue-900 font-bold' : 'text-gray-500'}`}>
                                    {p.name}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Player selection modal */}
            {showPlayerModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPlayerModal(false)}>
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[600px] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">Select Player for {selectedPosition}</h3>
                            <button onClick={() => setShowPlayerModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search players..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 pb-4">
                            {filteredPlayers.length === 0 ? (
                                <div className="text-center text-gray-400 py-8">No available players</div>
                            ) : (
                                filteredPlayers.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => handlePlayerSelect(p.id)}
                                        className="p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all mb-2 flex items-center gap-3"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700">
                                            #{p.shirtNumber || '?'}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-gray-900">{p.name}</div>
                                            <div className="text-sm text-gray-500 uppercase">{p.position}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InteractiveFormationPitch;
