"use client";
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Bot, Plus, Loader2, StopCircle, Trash2, List, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function AutoPilotPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    prompt: 'Collect 150 salon leads from US but skip New York, Dallas, Los Angeles, Houston and Boston',
    targetLeads: 150,
    niche: 'Salon',
  });

  useEffect(() => {
    fetchCampaigns();
    const interval = setInterval(fetchCampaigns, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchCampaigns = async () => {
    try {
      const data = await api.getMacroCampaigns();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch AI campaigns", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.prompt || !formData.niche) {
      alert("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      await api.createMacroCampaign(formData.name, formData.prompt, formData.targetLeads, formData.niche);
      setShowModal(false);
      setFormData({ name: '', prompt: '', targetLeads: 150, niche: 'Salon' });
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      alert("Failed to create AI campaign.");
    } finally {
      setSaving(false);
    }
  };

  const handleStop = async (id: number) => {
    if (!confirm("Stop this AI campaign?")) return;
    try {
      await api.stopMacroCampaign(id);
      fetchCampaigns();
    } catch { alert("Failed to stop campaign."); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this AI campaign and all its leads? This cannot be undone.")) return;
    try {
      await api.deleteMacroCampaign(id);
      fetchCampaigns();
    } catch { alert("Failed to delete campaign."); }
  };

  if (loading && campaigns.length === 0) {
    return <div className="p-8"><Loader2 className="animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2 flex items-center gap-3">
            <Bot className="text-emerald-400" /> AI Auto-Pilot
          </h1>
          <p className="text-slate-400">
            Set a high-level objective and let AI orchestrate multi-city scraping.
            You can also create these from the{' '}
            <Link href="/campaigns?create=true" className="text-blue-400 underline hover:text-blue-300">
              Campaigns page
            </Link>
            .
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} /> New Objective
        </button>
      </div>

      {/* Cards */}
      {campaigns.length === 0 ? (
        <div className="card py-20 flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-slate-800 rounded-2xl text-slate-600 mb-4"><Bot size={48} /></div>
          <h3 className="text-xl font-bold mb-2">No AI Campaigns Yet</h3>
          <p className="text-slate-500 max-w-xs mb-8">
            Create an objective and let the AI autonomously scrape leads across multiple cities.
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary">Get Started</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map(c => {
            // Support both leads_collected (shim) and leads_count
            const collected = c.leads_collected ?? c.leads_count ?? 0;
            const target = c.target_leads || 1;
            const progress = Math.min(100, Math.round((collected / target) * 100));
            const searchedCount = (() => {
              try { return JSON.parse(c.searched_locations || '[]').length; } catch { return 0; }
            })();

            return (
              <div key={c.id} className="card p-6 border border-slate-700/50 hover:border-slate-600 transition-colors">
                {/* Title row */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-xl font-bold text-slate-200 truncate">{c.name}</h3>
                    <p className="text-sm text-slate-400">Niche: {c.niche}</p>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider shrink-0",
                    c.status === 'active' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                    c.status === 'completed' && "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                    c.status === 'stopped' && "bg-slate-500/10 text-slate-400 border border-slate-500/20",
                  )}>
                    {c.status}
                  </span>
                </div>

                {/* Prompt */}
                <div className="bg-slate-900/50 rounded-lg p-3 mb-5 text-sm text-slate-300 italic border border-slate-800 line-clamp-2">
                  "{c.prompt || c.ai_prompt}"
                </div>

                {/* Progress */}
                <div className="space-y-1.5 mb-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Progress</span>
                    <span className="font-semibold text-slate-200">{collected} / {target} Leads</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-emerald-400 h-2.5 rounded-full transition-all duration-700 relative"
                      style={{ width: `${progress}%` }}
                    >
                      {c.status === 'active' && progress < 100 && (
                        <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
                  <span>{searchedCount} cities searched</span>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/leads?campaign_id=${c.id}`}
                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors font-medium"
                    >
                      <List size={13} /> Leads
                    </Link>
                    {c.status === 'active' && (
                      <button
                        onClick={() => handleStop(c.id)}
                        className="flex items-center gap-1 text-amber-500 hover:text-amber-400 transition-colors font-medium"
                      >
                        <StopCircle size={13} /> Stop
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="flex items-center gap-1 text-red-500 hover:text-red-400 transition-colors font-medium"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-100 mb-6">New AI Campaign Objective</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Campaign Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Nationwide US Salons"
                  className="input w-full"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Niche *</label>
                <input
                  type="text"
                  placeholder="e.g. Salon"
                  className="input w-full"
                  value={formData.niche}
                  onChange={e => setFormData({ ...formData, niche: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Target Leads Quota</label>
                <input
                  type="number"
                  min={1}
                  className="input w-full"
                  value={formData.targetLeads}
                  onChange={e => setFormData({ ...formData, targetLeads: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">AI Instructions (Prompt) *</label>
                <textarea
                  className="input w-full h-32 resize-none leading-relaxed"
                  value={formData.prompt}
                  onChange={e => setFormData({ ...formData, prompt: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Include regions to target or exclude. The AI will generate the city list automatically.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name || !formData.prompt || !formData.niche}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 size={17} className="animate-spin" /> : <Bot size={17} />}
                Deploy Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
