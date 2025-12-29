import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const TeamLineupEditor = ({ teamId, teamName, squad, initialLineup, onSave }) => {
    const [formation, setFormation] = useState(initialLineup?.formation || '4-4-2');
    const [starters, setStarters] = useState(initialLineup?.starters || []);
    const [subs, setSubs] = useState(initialLineup?.substitutes || []);

    // Sync state when initialLineup loads or changes
    useEffect(() => {
        console.log('[TeamLineupEditor] Received initialLineup:', initialLineup);
        if (initialLineup) {
            setFormation(initialLineup.formation || '4-4-2');
            setStarters(initialLineup.starters || []);
            setSubs(initialLineup.substitutes || []);
            console.log('[TeamLineupEditor] Set starters:', initialLineup.starters);
            console.log('[TeamLineupEditor] Set subs:', initialLineup.substitutes);
        } else {
            // Reset if null
            setFormation('4-4-2');
            setStarters([]);
            setSubs([]);
        }
    }, [initialLineup]);

    const togglePlayer = (pId) => {
        const isStarter = starters.includes(pId);
        const isSub = subs.includes(pId);

        if (isStarter) {
            setStarters(s => s.filter(id => id !== pId));
        } else if (isSub) {
            setSubs(s => s.filter(id => id !== pId));
        } else {
            // Add logic
            if (starters.length < 11) {
                setStarters([...starters, pId]);
            } else if (subs.length < 5) {
                setSubs([...subs, pId]);
            } else {
                toast.error("Full Lineup! Remove a player first.");
            }
        }
    };

    const handleSave = () => {
        if (starters.length !== 11) {
            toast.error(`Starters must be 11. Currently: ${starters.length}`);
            return;
        }
        onSave(teamId, { formation, starters, substitutes: subs });
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col h-[600px] transition-all hover:shadow-md">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="font-bold text-lg truncate text-gray-800" title={teamName}>{teamName}</h3>
                <div className="flex gap-2 shrink-0">
                    <select
                        value={formation}
                        onChange={e => setFormation(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option>4-4-2</option>
                        <option>4-3-3</option>
                        <option>3-4-3</option>
                        <option>3-5-2</option>
                        <option>5-3-2</option>
                        <option>4-2-3-1</option>
                        <option>4-1-4-1</option>
                    </select>
                    <button
                        onClick={handleSave}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded text-sm font-medium transition-colors shadow-sm"
                    >
                        Save
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {squad.length === 0 && <div className="text-gray-400 text-center italic mt-10">No players available</div>}

                {squad.map(p => {
                    const isStarter = starters.includes(p.id);
                    const isSub = subs.includes(p.id);
                    return (
                        <div key={p.id} onClick={() => togglePlayer(p.id)}
                            className={`p-2 rounded-md border cursor-pointer flex justify-between items-center transition-all select-none
                                ${isStarter
                                    ? 'bg-green-50 border-green-300 shadow-sm ring-1 ring-green-100'
                                    : isSub
                                        ? 'bg-blue-50 border-blue-300 shadow-sm ring-1 ring-blue-100'
                                        : 'hover:bg-gray-50 border-gray-100 hover:border-gray-300'}
                             `}>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full shadow-sm ${isStarter ? 'bg-green-500 text-white' : isSub ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                    {p.shirtNumber || '-'}
                                </span>
                                <div>
                                    <div className={`text-sm ${isStarter || isSub ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{p.name}</div>
                                    <div className="text-[10px] text-gray-500 uppercase font-semibold">{p.position}</div>
                                </div>
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-wider">
                                {isStarter && <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded-full">XI</span>}
                                {isSub && <span className="text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">SUB</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-3 text-xs flex justify-between font-mono bg-gray-100 p-2 rounded-md text-gray-600 border border-gray-200">
                <div className={`flex items-center gap-1 ${starters.length === 11 ? 'text-green-700 font-bold' : ''}`}>
                    <span className={`w-2 h-2 rounded-full ${starters.length === 11 ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    Starters: {starters.length}/11
                </div>
                <div className={`flex items-center gap-1 ${subs.length > 0 ? 'text-blue-700 font-bold' : ''}`}>
                    <span className={`w-2 h-2 rounded-full ${subs.length > 0 ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
                    Subs: {subs.length}/5
                </div>
            </div>
        </div>
    );
};

export default TeamLineupEditor;
