"use client";
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  Settings2, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function StrategyPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const data = await api.getScoringConfig();
      setConfig(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateScoringConfig(config);
      setMessage('Configuration saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      await api.recalculateScores();
      setMessage('Recalculation started for all leads.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-slate-400">Loading strategy settings...</div>;

  const weights = [
    { key: 'weight_has_website', label: 'Has Website', description: 'Points awarded if the business has a website.' },
    { key: 'weight_no_website', label: 'No Website', description: 'Points awarded if the business has NO website (High Value).' },
    { key: 'weight_has_whatsapp', label: 'Has WhatsApp', description: 'Points awarded if a WhatsApp link is detected.' },
    { key: 'weight_no_chatbot', label: 'No Chatbot', description: 'Points awarded if NO chatbot script is found.' },
    { key: 'weight_has_booking', label: 'Has Booking System', description: 'Points awarded if a booking system (Calendly, etc.) is found.' },
    { key: 'weight_no_response_mechanism', label: 'No Response Mechanism', description: 'Bonus points if no chatbot, whatsapp, or form exists.' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Ranking Strategy</h1>
          <p className="text-slate-400">Define how LeadPilot scores and prioritizes your leads.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleRecalculate}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all text-sm font-medium"
          >
            <RefreshCw size={18} />
            Recalculate All
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-all text-sm font-bold disabled:opacity-50"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400"
        >
          <CheckCircle2 size={20} />
          {message}
        </motion.div>
      )}

      <div className="grid gap-6">
        {weights.map((weight, idx) => (
          <motion.div 
            key={weight.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="card flex items-center justify-between group hover:border-slate-600 transition-all"
          >
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">{weight.label}</h3>
              <p className="text-sm text-slate-400">{weight.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Weight</span>
              <input 
                type="number"
                value={config[weight.key]}
                onChange={(e) => setConfig({...config, [weight.key]: parseInt(e.target.value)})}
                className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-center text-blue-400 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-4">
        <div className="p-3 bg-blue-500/10 rounded-xl h-fit text-blue-400">
          <AlertCircle size={24} />
        </div>
        <div>
          <h4 className="font-bold text-blue-400 mb-1">How Scoring Works</h4>
          <p className="text-sm text-slate-400 leading-relaxed">
            Every time a lead is scraped or its website is analyzed, LeadPilot applies these points to calculate a total score. 
            Leads with scores above 15 are marked as <span className="text-rose-400 font-semibold">High Priority</span>, 
            while scores above 8 are <span className="text-amber-400 font-semibold">Medium Priority</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
