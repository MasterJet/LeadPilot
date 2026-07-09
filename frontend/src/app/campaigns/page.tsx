"use client";
import { useState, useEffect, Suspense } from 'react';
import { api } from '@/lib/api';
import {
  Target, Plus, MapPin, Stethoscope, ArrowRight, Trash2, Edit2,
  Bot, Zap, StopCircle, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = 'manual' | 'ai';

const defaultWeights = {
  weight_has_website: 2,
  weight_has_whatsapp: 3,
  weight_no_chatbot: 5,
  weight_has_booking: 5,
  weight_no_response_mechanism: 4,
};

const defaultForm = {
  name: '',
  niche: '',
  // manual
  location: '',
  llmKeyId: '',
  promptInstructions: '',
  maxResults: 20,
  // ai
  aiPrompt: '',
  targetLeads: 150,
  weights: { ...defaultWeights },
};

// ─── Inner page (uses searchParams) ──────────────────────────────────────────
function CampaignsInner() {
  const searchParams = useSearchParams();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [llmKeys, setLlmKeys] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>('manual');
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ ...defaultForm });

  useEffect(() => {
    fetchCampaigns();
    fetchLlmKeys();
    if (searchParams.get('create') === 'true') setShowModal(true);
  }, [searchParams]);

  const fetchCampaigns = async () => {
    try {
      const data = await api.getCampaigns();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLlmKeys = async () => {
    try {
      const data = await api.getLLMKeys();
      setLlmKeys(Array.isArray(data) ? data : []);
    } catch { setLlmKeys([]); }
  };

  // ── Filter by macroId if coming from Auto-Pilot page ──────────────────────
  const macroIdFilter = searchParams.get('macroId') ? parseInt(searchParams.get('macroId')!) : null;
  const displayedCampaigns = macroIdFilter
    ? campaigns.filter(c => c.id === macroIdFilter || c.macro_campaign_id === macroIdFilter)
    : campaigns;

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const keyId = formData.llmKeyId ? parseInt(formData.llmKeyId) : undefined;

      if (isEditing && editId) {
        await api.updateCampaign(
          editId,
          formData.name,
          formData.niche,
          formData.location,
          formData.weights,
          keyId === undefined ? -1 : keyId,
          formData.promptInstructions,
        );
      } else if (mode === 'ai') {
        await api.createCampaign({
          name: formData.name,
          niche: formData.niche,
          is_ai_driven: true,
          ai_prompt: formData.aiPrompt,
          target_leads: formData.targetLeads,
          llm_key_id: keyId,
          ...formData.weights,
        });
      } else {
        // Manual mode
        await api.createCampaign({
          name: formData.name,
          niche: formData.niche,
          location: formData.location,
          llm_key_id: keyId,
          prompt_instructions: formData.promptInstructions,
          target_leads: formData.maxResults,
          ...formData.weights,
        });
      }

      closeModal();
      fetchCampaigns();
    } catch (err) {
      console.error("Failed to save campaign:", err);
      alert("Failed to save campaign. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setEditId(null);
    setMode('manual');
    setFormData({ ...defaultForm });
  };

  const handleEditClick = (campaign: any) => {
    setFormData({
      name: campaign.name || '',
      niche: campaign.niche || '',
      location: campaign.location || '',
      llmKeyId: campaign.llm_key_id ? campaign.llm_key_id.toString() : '',
      promptInstructions: campaign.prompt_instructions || '',
      maxResults: campaign.target_leads || 20,
      aiPrompt: campaign.ai_prompt || '',
      targetLeads: campaign.target_leads || 150,
      weights: {
        weight_has_website: campaign.weight_has_website ?? 2,
        weight_has_whatsapp: campaign.weight_has_whatsapp ?? 3,
        weight_no_chatbot: campaign.weight_no_chatbot ?? 5,
        weight_has_booking: campaign.weight_has_booking ?? 5,
        weight_no_response_mechanism: campaign.weight_no_response_mechanism ?? 4,
      },
    });
    setMode(campaign.is_ai_driven ? 'ai' : 'manual');
    setIsEditing(true);
    setEditId(campaign.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this campaign and all its leads? This cannot be undone.")) return;
    try {
      await api.deleteCampaign(id);
      fetchCampaigns();
    } catch (err) { alert("Failed to delete campaign."); }
  };

  const handleStop = async (id: number) => {
    if (!confirm("Stop this running campaign?")) return;
    try {
      await api.stopCampaign(id);
      fetchCampaigns();
    } catch (err) { alert("Failed to stop campaign."); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Campaigns</h1>
          {macroIdFilter && (
            <p className="text-sm text-blue-400">
              Showing campaigns for AI objective #{macroIdFilter}
              <Link href="/campaigns" className="ml-3 text-slate-400 underline hover:text-slate-200">
                Clear filter
              </Link>
            </p>
          )}
          {!macroIdFilter && (
            <p className="text-slate-400">Create manual campaigns or let AI orchestrate multi-city scraping.</p>
          )}
        </div>
        <button
          onClick={() => { setFormData({ ...defaultForm }); setIsEditing(false); setEditId(null); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> New Campaign
        </button>
      </div>

      {/* Campaign Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500 italic">Loading campaigns...</div>
        ) : displayedCampaigns.length === 0 ? (
          <div className="col-span-full card py-20 flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-slate-800 rounded-2xl text-slate-600 mb-4"><Target size={48} /></div>
            <h3 className="text-xl font-bold mb-2">No Campaigns Yet</h3>
            <p className="text-slate-500 max-w-xs mb-8">Launch your first campaign to start collecting and scoring leads.</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">Get Started</button>
          </div>
        ) : (
          displayedCampaigns.map((campaign, idx) => {
            const isAI = campaign.is_ai_driven;
            const progress = isAI
              ? Math.min(100, Math.round((campaign.leads_count / (campaign.target_leads || 1)) * 100))
              : null;

            return (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="card group hover:border-blue-500/50 transition-all"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${isAI ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    {isAI ? <Bot size={22} /> : <Target size={22} />}
                  </div>
                  <div className="flex items-center gap-2">
                    {isAI && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                        AI Pilot
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      campaign.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : campaign.status === 'completed'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      {campaign.status}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <div className="mb-4">
                  <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1 flex justify-between">
                    <span>Campaign Name</span>
                    <span className="text-slate-400">{campaign.leads_count || 0} Leads</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-100 truncate">{campaign.name || 'Untitled'}</h3>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="space-y-1">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Niche</div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-300 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                      <Stethoscope size={13} className="text-blue-400 shrink-0" />
                      <span className="truncate">{campaign.niche}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                      {isAI ? 'Mode' : 'Location'}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-300 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                      <MapPin size={13} className="text-blue-400 shrink-0" />
                      <span className="truncate">{isAI ? 'Multi-city AI' : campaign.location}</span>
                    </div>
                  </div>
                </div>

                {/* AI prompt snippet */}
                {isAI && campaign.ai_prompt && (
                  <div className="bg-slate-900/60 rounded-lg p-3 mb-4 text-xs text-slate-400 italic border border-slate-800 line-clamp-2">
                    "{campaign.ai_prompt}"
                  </div>
                )}

                {/* AI progress bar */}
                {isAI && progress !== null && (
                  <div className="mb-4 space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Progress</span>
                      <span className="font-semibold text-slate-200">
                        {campaign.leads_count} / {campaign.target_leads}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-emerald-400 h-2 rounded-full transition-all duration-700 relative"
                        style={{ width: `${progress}%` }}
                      >
                        {campaign.status === 'active' && progress < 100 && (
                          <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <Link
                    href={`/leads?campaign_id=${campaign.id}`}
                    className="flex items-center gap-1.5 text-blue-400 hover:gap-2.5 transition-all text-sm font-bold uppercase tracking-wider"
                  >
                    View Leads <ArrowRight size={15} />
                  </Link>

                  <div className="flex items-center gap-1">
                    {/* Stop (AI running) */}
                    {isAI && campaign.status === 'active' && (
                      <button
                        onClick={() => handleStop(campaign.id)}
                        className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                        title="Stop campaign"
                      >
                        <StopCircle size={16} />
                      </button>
                    )}
                    {/* Edit */}
                    {!isAI && (
                      <button
                        onClick={() => handleEditClick(campaign)}
                        className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ── Create / Edit Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold mb-6">{isEditing ? 'Edit Campaign' : 'New Campaign'}</h2>

            {/* Mode toggle (only when creating) */}
            {!isEditing && (
              <div className="flex gap-2 p-1 bg-slate-800 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => setMode('manual')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    mode === 'manual' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap size={15} /> Manual (Single Location)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('ai')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    mode === 'ai' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Bot size={15} /> AI Multi-City
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Common fields */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Campaign Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. US Salons Q3"
                  className="input w-full"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Niche</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Salon"
                  className="input w-full"
                  value={formData.niche}
                  onChange={e => setFormData({ ...formData, niche: e.target.value })}
                />
              </div>

              {/* Manual-only fields */}
              {mode === 'manual' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Location</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Chicago, IL"
                      className="input w-full"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Max Leads to Scrape</label>
                    <input
                      type="number"
                      min={1}
                      className="input w-full"
                      value={formData.maxResults}
                      onChange={e => setFormData({ ...formData, maxResults: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">
                      Custom Outreach Instructions (Optional)
                    </label>
                    <textarea
                      className="input w-full h-24 resize-none"
                      placeholder="e.g. Focus on salons without a website and mention our web design package."
                      value={formData.promptInstructions}
                      onChange={e => setFormData({ ...formData, promptInstructions: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* AI-only fields */}
              {mode === 'ai' && (
                <>
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
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">AI Objective Prompt</label>
                    <textarea
                      required
                      className="input w-full h-28 resize-none leading-relaxed"
                      placeholder="e.g. Collect 150 salon leads from US but skip New York, Dallas, Los Angeles, Houston and Boston"
                      value={formData.aiPrompt}
                      onChange={e => setFormData({ ...formData, aiPrompt: e.target.value })}
                    />
                    <p className="text-xs text-slate-500 mt-1.5">
                      The AI will parse this prompt, generate a city list, and scrape until your quota is met.
                    </p>
                  </div>
                </>
              )}

              {/* LLM Key selector */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">LLM Key (Optional)</label>
                <select
                  className="input w-full"
                  value={formData.llmKeyId}
                  onChange={e => setFormData({ ...formData, llmKeyId: e.target.value })}
                >
                  <option value="">None (use platform default)</option>
                  {llmKeys.map((k: any) => (
                    <option key={k.id} value={k.id}>{k.name} ({k.provider})</option>
                  ))}
                </select>
              </div>

              {/* Scoring weights */}
              <details className="group">
                <summary className="text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-slate-300 transition-colors py-1">
                  Scoring Weights ▸
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {Object.entries(formData.weights).map(([key, val]) => (
                    <div key={key}>
                      <label className="text-[10px] text-slate-500 mb-0.5 block">{key.replace('weight_', '').replace(/_/g, ' ')}</label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        className="input w-full text-sm"
                        value={val}
                        onChange={e => setFormData({
                          ...formData,
                          weights: { ...formData.weights, [key]: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                  ))}
                </div>
              </details>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-all ${
                    mode === 'ai' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'
                  } disabled:opacity-50`}
                >
                  {saving
                    ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                    : isEditing
                    ? 'Save Changes'
                    : mode === 'ai'
                    ? <><Bot size={16} /> Deploy AI Campaign</>
                    : <><Zap size={16} /> Create Campaign</>
                  }
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ─── Page wrapper (Suspense required for useSearchParams) ─────────────────────
export default function CampaignsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Suspense fallback={<div className="py-12 text-center text-slate-500">Loading…</div>}>
        <CampaignsInner />
      </Suspense>
    </div>
  );
}
