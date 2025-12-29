import { useState, useEffect } from 'react';
import { Save, UserPlus, UserMinus } from 'lucide-react';
import MatchesService from '../../layers/application/services/MatchesService';
import toast from 'react-hot-toast';

const FORMATIONS = [
    '4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2', '3-4-3', '4-5-1'
];

interface Player {
    id: number;
    name: string;
    shirtNumber: number;
    position: string;
}

interface LineupSelectionProps {
    matchId: number;
    teamId: number;
    seasonTeamId: number; // Required now
    teamName: string;
    players: Player[];
    onSave?: () => void;
}

const LineupSelection = ({ matchId, seasonTeamId, teamName, players, onSave }: LineupSelectionProps) => {
    const [formation, setFormation] = useState('4-4-2');
    const [starters, setStarters] = useState<Player[]>([]);
    const [substitutes, setSubstitutes] = useState<Player[]>([]);
    const [reserves, setReserves] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (seasonTeamId) {
            loadLineup();
        }
    }, [matchId, seasonTeamId]);

    const loadLineup = async () => {
        try {
            setLoading(true);
            const data = await MatchesService.getLineup(matchId, seasonTeamId); // Use seasonTeamId

            if (data && (data.formation || data.starters?.length > 0)) {
                setFormation(data.formation || '4-4-2');

                // Map IDs back to player objects
                const starterIds = new Set(data.starters || []);
                const subIds = new Set(data.substitutes || []);

                const currentStarters: Player[] = [];
                const currentSubs: Player[] = [];
                const currentReserves: Player[] = [];

                players.forEach(p => {
                    if (starterIds.has(p.id)) currentStarters.push(p);
                    else if (subIds.has(p.id)) currentSubs.push(p);
                    else currentReserves.push(p);
                });

                setStarters(currentStarters);
                setSubstitutes(currentSubs);
                setReserves(currentReserves);
            } else {
                // Default: Move everyone to reserves
                setReserves([...players]);
                setStarters([]);
                setSubstitutes([]);
            }
        } catch (error) {
            console.error("Error loading lineup:", error);
            // Fallback
            setReserves([...players]);
        } finally {
            setLoading(false);
        }
    };

    // Update reserves if players prop changes and no lineup is loaded yet (or reset)
    useEffect(() => {
        if (!loading && starters.length === 0 && substitutes.length === 0 && reserves.length === 0 && players.length > 0) {
            setReserves([...players]);
        }
    }, [players, loading]);

    const moveToStarters = (player: Player) => {
        if (starters.length >= 11) {
            toast.error("Starting XI is full (11 players)");
            return;
        }
        setStarters([...starters, player]);
        setSubstitutes(substitutes.filter(p => p.id !== player.id));
        setReserves(reserves.filter(p => p.id !== player.id));
    };

    const moveToSubs = (player: Player) => {
        if (substitutes.length >= 5) {
            toast.error("Substitutes bench is full (5 players)");
            return;
        }
        setSubstitutes([...substitutes, player]);
        setStarters(starters.filter(p => p.id !== player.id));
        setReserves(reserves.filter(p => p.id !== player.id));
    };

    const moveToReserves = (player: Player) => {
        setReserves([...reserves, player]);
        setStarters(starters.filter(p => p.id !== player.id));
        setSubstitutes(substitutes.filter(p => p.id !== player.id));
    };

    const handleSave = async () => {
        if (starters.length !== 11) {
            toast.error(`You need exactly 11 starters. Currently: ${starters.length}`);
            return;
        }
        try {
            await MatchesService.saveLineup(matchId, seasonTeamId, { // Use seasonTeamId
                formation,
                starters: starters.map(p => p.id),
                substitutes: substitutes.map(p => p.id)
            });
            toast.success("Lineup saved successfully!");
            if (onSave) onSave();
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Failed to save lineup");
        }
    };

    if (loading) return <div className="text-center p-4">Loading lineup...</div>;

    return (
        <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900">{teamName} Lineup</h3>
                <div className="flex items-center gap-4">
                    <select
                        value={formation}
                        onChange={(e) => setFormation(e.target.value)}
                        className="border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    >
                        {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <Save size={18} /> Save Lineup
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Starters */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-100 min-h-[400px]">
                    <h4 className="font-bold text-green-800 mb-2 flex justify-between">
                        Starting XI
                        <span className={`text-sm ${starters.length === 11 ? 'text-green-600' : 'text-red-500'}`}>
                            {starters.length}/11
                        </span>
                    </h4>
                    <div className="space-y-2">
                        {starters.map(player => (
                            <div key={player.id} className="bg-white p-2 rounded shadow-sm border border-green-200 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold w-6 text-center text-sm">{player.shirtNumber}</span>
                                    <span className="text-sm font-medium truncate max-w-[120px]">{player.name}</span>
                                    <span className="text-xs text-gray-400">{player.position}</span>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => moveToSubs(player)} className="text-yellow-600 hover:bg-yellow-100 p-1.5 rounded" title="Move to Subs">
                                        <UserMinus size={16} />
                                    </button>
                                    <button onClick={() => moveToReserves(player)} className="text-red-500 hover:bg-red-100 p-1.5 rounded" title="Remove">
                                        <UserMinus size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {starters.length === 0 && <div className="text-green-800/40 text-center py-8 italic">Add 11 players</div>}
                    </div>
                </div>

                {/* Substitutes */}
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100 min-h-[400px]">
                    <h4 className="font-bold text-yellow-800 mb-2 flex justify-between">
                        Substitutes
                        <span className="text-sm text-yellow-600">{substitutes.length}/5</span>
                    </h4>
                    <div className="space-y-2">
                        {substitutes.map(player => (
                            <div key={player.id} className="bg-white p-2 rounded shadow-sm border border-yellow-200 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold w-6 text-center text-sm">{player.shirtNumber}</span>
                                    <span className="text-sm font-medium truncate max-w-[120px]">{player.name}</span>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => moveToStarters(player)} className="text-green-600 hover:bg-green-100 p-1.5 rounded" title="Promote to Starter">
                                        <UserPlus size={16} />
                                    </button>
                                    <button onClick={() => moveToReserves(player)} className="text-red-500 hover:bg-red-100 p-1.5 rounded" title="Remove">
                                        <UserMinus size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Reserves */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-h-[400px]">
                    <h4 className="font-bold text-gray-700 mb-2">Reserves ({reserves.length})</h4>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                        {reserves.map(player => (
                            <div key={player.id} className="bg-white p-2 rounded shadow-sm border border-gray-200 flex justify-between items-center group">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold w-6 text-center text-sm text-gray-400">{player.shirtNumber}</span>
                                    <span className="text-sm font-medium text-gray-600 truncate max-w-[120px]">{player.name}</span>
                                    <span className="text-xs text-gray-400">{player.position}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => moveToStarters(player)}
                                        className="bg-green-100 text-green-700 hover:bg-green-600 hover:text-white p-1.5 rounded transition-colors flex items-center gap-1"
                                        title="Add to Starters"
                                    >
                                        <UserPlus size={16} /> <span className="text-xs font-bold">XI</span>
                                    </button>
                                    <button
                                        onClick={() => moveToSubs(player)}
                                        className="bg-yellow-100 text-yellow-700 hover:bg-yellow-500 hover:text-white p-1.5 rounded transition-colors flex items-center gap-1"
                                        title="Add to Subs"
                                    >
                                        <UserPlus size={16} /> <span className="text-xs font-bold">SUB</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LineupSelection;
