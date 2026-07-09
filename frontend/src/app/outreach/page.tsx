"use client";
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Copy,
  ExternalLink,
  Sparkles,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Linkedin,
  Globe,
  MapPin,
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Zap, 
  Cpu, 
  Search, 
  Check, 
  AlertTriangle,
  Award,
  Lightbulb,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useSearchParams } from 'next/navigation';

export default function OutreachPage() {
  const searchParams = useSearchParams();
  const initialCampaignId = searchParams.get('campaign_id');
  
  const [leads, setLeads] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState(initialCampaignId || '');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'seo' | 'performance' | 'security' | 'tech' | 'conversion'>('seo');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [selectedCampaign]);

  const fetchCampaigns = async () => {
    try {
      const data = await api.getCampaigns();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    }
  };

  const fetchLeads = async () => {
    try {
      const filters: any = { status: 'new' };
      if (selectedCampaign) filters.campaign_id = selectedCampaign;
      
      const data = await api.getLeads(filters);
      if (Array.isArray(data)) {
        const filteredLeads = data.filter((l: any) => l.priority === 'high' || l.priority === 'medium');
        setLeads(filteredLeads);
        if (filteredLeads.length > 0 && !selectedLead) {
          setSelectedLead(filteredLeads[0]);
        } else if (filteredLeads.length === 0) {
          setSelectedLead(null);
        }
      } else {
        setLeads([]);
        setSelectedLead(null);
      }
    } catch (err) {
      console.error(err);
      setLeads([]);
      setSelectedLead(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMessage = async () => {
    if (!selectedLead) return;
    setGenerating(true);
    try {
      const data = await api.generateMessage(selectedLead.id);
      setMessage(data.message);
    } catch (err) {
      console.error("AI Generation failed:", err);
      setMessage("Failed to generate AI message. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    try {
      await api.updateLeadStatus(selectedLead.id, status);
      fetchLeads();
      setSelectedLead(null);
      setMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message);
    alert("Message copied to clipboard!");
  };

  if (loading) return <div className="p-8 text-slate-400">Loading outreach dashboard...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-120px)]">
      {/* Lead List */}
      <div className="lg:col-span-1 card flex flex-col !p-0 overflow-hidden">
        <div className="p-6 border-b border-slate-800 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock size={20} className="text-amber-400" />
            Ready for Outreach
          </h2>
          
          <select 
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Campaigns</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
          {leads.map((lead) => (
            <div 
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              className={`p-4 cursor-pointer transition-all ${selectedLead?.id === lead.id ? 'bg-blue-600/10 border-l-4 border-blue-500' : 'hover:bg-slate-800/50'}`}
            >
              <div className="font-bold text-slate-200 truncate">{lead.name}</div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${lead.priority === 'high' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {lead.priority}
                  </span>
                  <span className="text-xs text-slate-500">{lead.niche}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  {lead.website && (
                    <a 
                      href={lead.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 bg-slate-800/50 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 rounded-lg transition-all"
                      title="Visit Website"
                    >
                      <Globe size={14} />
                    </a>
                  )}
                  {lead.google_maps_url && (
                    <a 
                      href={lead.google_maps_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 bg-slate-800/50 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 rounded-lg transition-all"
                      title="View on Google Maps"
                    >
                      <MapPin size={14} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
          {leads.length === 0 && (
            <div className="p-12 text-center text-slate-500 italic">No priority leads found.</div>
          )}
        </div>
      </div>

      {/* Outreach Area */}
      <div className="lg:col-span-2 space-y-6">
        <AnimatePresence mode="wait">
          {selectedLead ? (
            <motion.div 
              key={selectedLead.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedLead.name}</h2>
                    {selectedLead.website ? (
                      <a 
                        href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm hover:underline inline-flex items-center gap-1 mt-1 transition-all font-medium"
                      >
                        {selectedLead.website}
                        <ExternalLink size={14} className="opacity-70" />
                      </a>
                    ) : (
                      <p className="text-slate-400 text-sm mt-1">No website detected</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {selectedLead.website && (
                      <a 
                        href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all flex items-center justify-center"
                        title="Visit Website"
                      >
                        <ExternalLink size={20} />
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 text-center">
                    <div className="text-xs text-slate-500 uppercase font-bold mb-1 tracking-widest">Score</div>
                    <div className="text-2xl font-bold text-blue-400">{selectedLead.score}</div>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 text-center">
                    <div className="text-xs text-slate-500 uppercase font-bold mb-1 tracking-widest">Reviews</div>
                    <div className="text-2xl font-bold text-slate-200">{selectedLead.reviews_count}</div>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 text-center">
                    <div className="text-xs text-slate-500 uppercase font-bold mb-1 tracking-widest">Rating</div>
                    <div className="text-2xl font-bold text-amber-400">{selectedLead.rating}★</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2">
                      <Sparkles size={18} className="text-blue-400" />
                      AI Outreach Message
                    </h3>
                    <button 
                      onClick={handleGenerateMessage}
                      disabled={generating}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest flex items-center gap-1"
                    >
                      {generating ? 'Generating...' : 'Regenerate'}
                    </button>
                  </div>
                  
                  <div className="relative">
                    <textarea 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Click 'Generate' to create an AI-powered message..."
                      className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                    {message && (
                      <button 
                        onClick={copyToClipboard}
                        className="absolute bottom-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400"
                      >
                        <Copy size={18} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <button onClick={() => handleStatusUpdate('contacted')} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2">
                      <Send size={18} />
                      Mark as Contacted
                    </button>
                    <button onClick={() => handleStatusUpdate('closed')} className="btn-secondary px-6 py-3">
                      Not Interested
                    </button>
                  </div>
                </div>
              </div>

              {/* Outreach Channels */}
              {selectedLead.analysis && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedLead.analysis.whatsapp_link ? (
                    <button 
                      onClick={() => window.open(selectedLead.analysis.whatsapp_link, '_blank')}
                      className="card flex flex-col items-center gap-2 hover:border-emerald-500/50 transition-all group"
                      title={selectedLead.phone || 'WhatsApp'}
                    >
                      <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <Phone size={20} />
                      </div>
                      <span className="text-[10px] text-center font-bold uppercase tracking-widest">WhatsApp</span>
                    </button>
                  ) : selectedLead.phone ? (
                    <button 
                      onClick={() => window.open(`https://wa.me/${selectedLead.phone.replace(/[^0-9]/g, '')}`, '_blank')}
                      className="card flex flex-col items-center gap-2 hover:border-emerald-500/50 transition-all group opacity-70 hover:opacity-100"
                      title={selectedLead.phone}
                    >
                      <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <Phone size={20} />
                      </div>
                      <span className="text-[10px] text-center font-bold uppercase tracking-widest">WhatsApp (Guess)</span>
                    </button>
                  ) : null}

                  {selectedLead.analysis.instagram_link && (
                    <button 
                      onClick={() => window.open(selectedLead.analysis.instagram_link, '_blank')}
                      className="card flex flex-col items-center gap-2 hover:border-rose-500/50 transition-all group"
                      title={(() => {
                        const parts = selectedLead.analysis.instagram_link.replace(/\/$/, '').split('/');
                        return parts[parts.length - 1] || 'Instagram';
                      })()}
                    >
                      <div className="p-3 bg-rose-500/10 text-rose-500 rounded-full group-hover:bg-rose-500 group-hover:text-white transition-all">
                        <Instagram size={20} />
                      </div>
                      <span className="text-[10px] text-center font-bold uppercase tracking-widest">Instagram</span>
                    </button>
                  )}

                  {selectedLead.analysis.facebook_link && (
                    <button 
                      onClick={() => window.open(selectedLead.analysis.facebook_link, '_blank')}
                      className="card flex flex-col items-center gap-2 hover:border-blue-500/50 transition-all group"
                      title={(() => {
                        const parts = selectedLead.analysis.facebook_link.replace(/\/$/, '').split('/');
                        const last = parts[parts.length - 1];
                        return last && !last.includes('profile.php') ? last : 'Facebook';
                      })()}
                    >
                      <div className="p-3 bg-blue-500/10 text-blue-500 rounded-full group-hover:bg-blue-500 group-hover:text-white transition-all">
                        <Facebook size={20} />
                      </div>
                      <span className="text-[10px] text-center font-bold uppercase tracking-widest">Facebook</span>
                    </button>
                  )}

                  {selectedLead.analysis.linkedin_link && (
                    <button 
                      onClick={() => window.open(selectedLead.analysis.linkedin_link, '_blank')}
                      className="card flex flex-col items-center gap-2 hover:border-sky-500/50 transition-all group"
                      title={(() => {
                        const parts = selectedLead.analysis.linkedin_link.replace(/\/$/, '').split('/');
                        const last = parts[parts.length - 1];
                        return last || 'LinkedIn';
                      })()}
                    >
                      <div className="p-3 bg-sky-500/10 text-sky-500 rounded-full group-hover:bg-sky-500 group-hover:text-white transition-all">
                        <Linkedin size={20} />
                      </div>
                      <span className="text-[10px] text-center font-bold uppercase tracking-widest">LinkedIn</span>
                    </button>
                  )}

                  {selectedLead.analysis.email_address ? (
                    <button 
                      onClick={() => window.location.href = `mailto:${selectedLead.analysis.email_address}`}
                      className="card flex flex-col items-center gap-2 hover:border-indigo-500/50 transition-all group"
                      title={selectedLead.analysis.email_address}
                    >
                      <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-full group-hover:bg-indigo-500 group-hover:text-white transition-all">
                        <Mail size={20} />
                      </div>
                      <span className="text-[10px] text-center font-bold uppercase tracking-widest">Email</span>
                    </button>
                  ) : selectedLead.analysis.contact_form_link && (
                    <button 
                      onClick={() => window.open(selectedLead.analysis.contact_form_link, '_blank')}
                      className="card flex flex-col items-center gap-2 hover:border-slate-500/50 transition-all group"
                      title={selectedLead.analysis.contact_form_link}
                    >
                      <div className="p-3 bg-slate-500/10 text-slate-400 rounded-full group-hover:bg-slate-500 group-hover:text-white transition-all">
                        <Globe size={20} />
                      </div>
                      <span className="text-[10px] text-center font-bold uppercase tracking-widest">Contact Form</span>
                    </button>
                  )}
                </div>
              )}

              {/* SaaS Intelligence & Audit Card */}
              {selectedLead.analysis && (
                <div className="card border-slate-800 bg-slate-900/40 backdrop-blur-xl space-y-6">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2 text-slate-100">
                        <Award size={20} className="text-blue-400" />
                        Website Audit & SaaS Intelligence
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Deep analysis results and personalized outreach hooks.</p>
                    </div>
                    {/* Tabs */}
                    <div className="flex flex-wrap gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                      {[
                        { id: 'seo', name: 'SEO', icon: Search },
                        { id: 'performance', name: 'Performance', icon: Zap },
                        { id: 'security', name: 'Security', icon: Shield },
                        { id: 'tech', name: 'Tech Stack', icon: Cpu },
                        { id: 'conversion', name: 'Conversion', icon: Lightbulb }
                      ].map(t => {
                        const Icon = t.icon;
                        const isTabActive = activeTab === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider ${isTabActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                          >
                            <Icon size={12} />
                            {t.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Tab Content */}
                  <div className="pt-2">
                    {/* SEO TAB */}
                    {activeTab === 'seo' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-sky-950/20 rounded-xl border border-sky-500/10">
                          <div>
                            <div className="text-sm font-bold text-sky-400 uppercase tracking-widest text-[10px]">SEO Performance Score</div>
                            <div className="text-3xl font-extrabold text-slate-100 mt-1">
                              {selectedLead.analysis.seo?.score ?? 0}<span className="text-sm font-normal text-slate-500">/100</span>
                            </div>
                          </div>
                          <div className="w-1/2 bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800/80">
                            <div 
                              className="bg-gradient-to-r from-sky-500 to-blue-500 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${selectedLead.analysis.seo?.score ?? 0}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div>
                              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Page Title</div>
                              <div className="text-sm text-slate-300 font-medium break-words mt-0.5">
                                {selectedLead.analysis.seo?.title || <span className="text-rose-400 italic">None detected</span>}
                              </div>
                              {selectedLead.analysis.seo?.title_length > 0 && (
                                <div className="text-[10px] text-slate-500 mt-1">
                                  Length: {selectedLead.analysis.seo.title_length} chars ({selectedLead.analysis.seo.title_length < 30 || selectedLead.analysis.seo.title_length > 65 ? '⚠️ Suboptimal length' : '✅ Optimal length'})
                                </div>
                              )}
                            </div>
                            
                            <div>
                              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Meta Description</div>
                              <div className="text-sm text-slate-300 font-medium break-words mt-0.5 leading-relaxed">
                                {selectedLead.analysis.seo?.description || <span className="text-rose-400 italic">None detected</span>}
                              </div>
                              {selectedLead.analysis.seo?.description_length > 0 && (
                                <div className="text-[10px] text-slate-500 mt-1">
                                  Length: {selectedLead.analysis.seo.description_length} chars ({selectedLead.analysis.seo.description_length > 165 ? '⚠️ Too long' : '✅ Optimal length'})
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3 p-4 bg-slate-950/40 rounded-xl border border-slate-800/80">
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Technical SEO Checklist</div>
                            {[
                              { label: 'Robots.txt File', value: selectedLead.analysis.seo?.has_robots_txt },
                              { label: 'Sitemap.xml File', value: selectedLead.analysis.seo?.has_sitemap },
                              { label: 'Canonical Link Tag', value: selectedLead.analysis.seo?.has_canonical },
                              { label: 'Open Graph Metadata', value: selectedLead.analysis.seo?.has_og_tags },
                              { label: 'JSON-LD Schema Markup', value: selectedLead.analysis.seo?.has_schema_markup }
                            ].map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">{item.label}</span>
                                <span className="flex items-center gap-1">
                                  {item.value ? (
                                    <>
                                      <Check size={12} className="text-emerald-400" />
                                      <span className="text-[10px] text-emerald-400 font-bold uppercase">Active</span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle size={12} className="text-rose-400" />
                                      <span className="text-[10px] text-rose-400 font-bold uppercase">Missing</span>
                                    </>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {selectedLead.analysis.seo?.issues?.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider flex items-center gap-1">
                              <AlertCircle size={12} />
                              SEO Optimization Bottlenecks ({selectedLead.analysis.seo.issues.length})
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {selectedLead.analysis.seo.issues.map((issue: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-2 p-2 bg-rose-500/5 rounded-lg border border-rose-500/10 text-xs text-rose-300">
                                  <span className="mt-0.5">•</span>
                                  <span>{issue}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* PERFORMANCE TAB */}
                    {activeTab === 'performance' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 text-center">
                            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Page Load Speed</div>
                            <div className={`text-2xl font-black mt-1 ${selectedLead.analysis.performance?.page_load_ms < 1500 ? 'text-emerald-400' : selectedLead.analysis.performance?.page_load_ms < 3000 ? 'text-amber-400' : 'text-rose-400'}`}>
                              {selectedLead.analysis.performance?.page_load_ms ? `${(selectedLead.analysis.performance.page_load_ms / 1000).toFixed(2)}s` : 'Undetected'}
                            </div>
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-1 block">
                              {selectedLead.analysis.performance?.page_load_ms < 1500 ? '⚡ Lightning Fast' : selectedLead.analysis.performance?.page_load_ms < 3000 ? '⚖️ Moderate Speed' : '🐌 Slow (Needs Work)'}
                            </span>
                          </div>

                          <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 text-center">
                            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Page Size (HTML)</div>
                            <div className="text-2xl font-black text-slate-200 mt-1">
                              {selectedLead.analysis.performance?.page_size_kb ? `${selectedLead.analysis.performance.page_size_kb} KB` : 'Undetected'}
                            </div>
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-1 block">
                              {selectedLead.analysis.performance?.page_size_kb > 2000 ? '⚠️ Large DOM' : '✅ Lightweight'}
                            </span>
                          </div>

                          <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 text-center">
                            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Image Optimization</div>
                            <div className="text-2xl font-black text-slate-200 mt-1">
                              {selectedLead.analysis.performance?.lazy_images ?? 0} <span className="text-sm text-slate-500">/ {selectedLead.analysis.performance?.total_images ?? 0}</span>
                            </div>
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-1 block">
                              Lazy Loaded Images
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-950/20 rounded-xl border border-slate-800/80 space-y-3">
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Page Architecture</div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Mobile Responsive Viewport</span>
                              <span className="font-bold text-slate-300">{selectedLead.analysis.performance?.has_mobile_viewport ? '✅ Active' : '❌ Missing'}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Render-Blocking Scripts in Head</span>
                              <span className={`font-bold ${selectedLead.analysis.performance?.render_blocking_scripts > 2 ? 'text-amber-400' : 'text-slate-300'}`}>
                                {selectedLead.analysis.performance?.render_blocking_scripts ?? 0} scripts
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Total Script Tags</span>
                              <span className="font-bold text-slate-300">{selectedLead.analysis.performance?.total_scripts ?? 0} elements</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Total CSS Stylesheets</span>
                              <span className="font-bold text-slate-300">{selectedLead.analysis.performance?.total_stylesheets ?? 0} elements</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                              <Zap size={12} />
                              Performance Bottlenecks ({selectedLead.analysis.performance?.issues?.length ?? 0})
                            </div>
                            {selectedLead.analysis.performance?.issues?.length > 0 ? (
                              <div className="space-y-1.5 overflow-y-auto max-h-32">
                                {selectedLead.analysis.performance.issues.map((issue: string, idx: number) => (
                                  <div key={idx} className="flex items-start gap-1.5 p-2 bg-amber-500/5 rounded-lg border border-amber-500/10 text-xs text-amber-300">
                                    <span>⚠️</span>
                                    <span>{issue}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-4 bg-emerald-500/5 rounded-lg border border-emerald-500/10 text-xs text-emerald-400 italic text-center">
                                No performance issues detected! Excellent.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SECURITY TAB */}
                    {activeTab === 'security' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 space-y-4">
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Protocol Audit</div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">SSL Certificate Status</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedLead.analysis.security?.has_ssl ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                {selectedLead.analysis.security?.has_ssl ? '🔐 SECURE (HTTPS)' : '🔓 UNSECURED (HTTP)'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">HTTP → HTTPS Auto-Redirect</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedLead.analysis.security?.https_redirect ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                {selectedLead.analysis.security?.https_redirect ? '✅ Enforced' : '⚠️ Not Redirecting'}
                              </span>
                            </div>
                          </div>

                          <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 space-y-3">
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">HTTP Security Headers</div>
                            {[
                              { label: 'Strict-Transport-Security (HSTS)', value: selectedLead.analysis.security?.headers?.hsts },
                              { label: 'Content-Security-Policy (CSP)', value: selectedLead.analysis.security?.headers?.csp },
                              { label: 'X-Frame-Options (Clickjacking Protection)', value: selectedLead.analysis.security?.headers?.x_frame },
                              { label: 'X-Content-Type-Options (Mime Sniffing)', value: selectedLead.analysis.security?.headers?.x_content_type }
                            ].map((header, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 truncate mr-2" title={header.label}>{header.label.split(' ')[0]}</span>
                                <span className={`text-[10px] font-bold uppercase ${header.value ? 'text-emerald-400' : 'text-slate-500'}`}>
                                  {header.value ? '✅ Active' : '❌ Missing'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {selectedLead.analysis.security?.issues?.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider flex items-center gap-1">
                              <ShieldAlert size={12} />
                              Security Risks & Recommendations ({selectedLead.analysis.security.issues.length})
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {selectedLead.analysis.security.issues.map((issue: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-2 p-2 bg-rose-500/5 rounded-lg border border-rose-500/10 text-xs text-rose-300">
                                  <span>🔒</span>
                                  <span>{issue}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TECH STACK TAB */}
                    {activeTab === 'tech' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 space-y-4">
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Platform & Server</div>
                            <div>
                              <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Content Management System (CMS)</span>
                              <span className="text-sm font-bold text-slate-200 mt-1 block">
                                {selectedLead.analysis.tech_stack?.cms ? (
                                  <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20 font-mono">
                                    {selectedLead.analysis.tech_stack.cms} {selectedLead.analysis.tech_stack.cms_version || ''}
                                  </span>
                                ) : 'Custom CMS / Handcoded'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Web Server</span>
                                <span className="text-xs font-semibold text-slate-300 mt-1 block font-mono">
                                  {selectedLead.analysis.tech_stack?.server || 'Undetected'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block uppercase tracking-wider">CDN / Cloud Security</span>
                                <span className="text-xs font-semibold text-slate-300 mt-1 block font-mono">
                                  {selectedLead.analysis.tech_stack?.cdn || 'None Detected'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 space-y-4">
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Embedded Technologies</div>
                            
                            <div className="space-y-3">
                              <div>
                                <span className="text-[10px] text-slate-500 block uppercase tracking-wider mb-1">Frontend Frameworks</span>
                                {selectedLead.analysis.tech_stack?.frameworks?.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {selectedLead.analysis.tech_stack.frameworks.map((f: string, idx: number) => (
                                      <span key={idx} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono">{f}</span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-500 italic">No frameworks parsed</span>
                                )}
                              </div>

                              <div>
                                <span className="text-[10px] text-slate-500 block uppercase tracking-wider mb-1">Analytics & Marketing Tags</span>
                                {selectedLead.analysis.tech_stack?.analytics?.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {selectedLead.analysis.tech_stack.analytics.map((a: string, idx: number) => (
                                      <span key={idx} className="px-2 py-0.5 bg-sky-500/10 text-sky-400 rounded text-[10px] font-semibold">{a}</span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-500 italic">No analytics tags detected</span>
                                )}
                              </div>

                              <div>
                                <span className="text-[10px] text-slate-500 block uppercase tracking-wider mb-1">E-Commerce & Payments</span>
                                {selectedLead.analysis.tech_stack?.ecommerce?.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {selectedLead.analysis.tech_stack.ecommerce.map((e: string, idx: number) => (
                                      <span key={idx} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-semibold">{e}</span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-500 italic">No e-commerce modules</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CONVERSION GAPS TAB */}
                    {activeTab === 'conversion' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 space-y-3">
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Lead Conversion Gaps</div>
                            
                            {[
                              { label: 'Live Chatbot Widget', value: selectedLead.analysis.conversion?.has_chatbot, desc: 'Engage visitors 24/7' },
                              { label: 'Booking Calendar Integration', value: selectedLead.analysis.conversion?.has_booking_system, desc: 'Instant call scheduling' },
                              { label: 'CTA (Call-to-Action) Buttons', value: selectedLead.analysis.conversion?.has_cta_button, desc: 'Clear paths to buy/contact' },
                              { label: 'WhatsApp Widget', value: selectedLead.analysis.conversion?.has_whatsapp_widget, desc: 'Frictionless chat' },
                              { label: 'Online Contact Forms', value: selectedLead.analysis.conversion?.has_contact_form, desc: 'Inquiry forms in place' }
                            ].map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-slate-800/80 text-xs">
                                <div>
                                  <div className="font-bold text-slate-300">{item.label}</div>
                                  <div className="text-[10px] text-slate-500">{item.desc}</div>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${item.value ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                  {item.value ? 'Active' : 'Missing (Gap)'}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="space-y-3">
                            <div className="text-[10px] uppercase font-bold text-fuchsia-400 tracking-wider flex items-center gap-1">
                              <Lightbulb size={12} />
                              AI Value Pitch Hooks (Personalized Ammo)
                            </div>
                            
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                              {/* Slow speed hook */}
                              {selectedLead.analysis.performance?.page_load_ms > 3000 && (
                                <div className="p-3 bg-fuchsia-500/5 border border-fuchsia-500/10 rounded-xl text-xs space-y-1">
                                  <div className="font-bold text-fuchsia-400 flex items-center gap-1">
                                    <Zap size={12} />
                                    Slow Speed Conversion Loss Hook
                                  </div>
                                  <p className="text-slate-300 italic">"I ran a speed test on your website and noticed it takes {(selectedLead.analysis.performance.page_load_ms / 1000).toFixed(1)}s to load. Studies show that any load time over 3 seconds causes up to 40% of visitors to bounce. We can optimize your pages to load in under 1.5 seconds, saving those lost leads."</p>
                                </div>
                              )}

                              {/* Missing Chatbot hook */}
                              {!selectedLead.analysis.conversion?.has_chatbot && (
                                <div className="p-3 bg-fuchsia-500/5 border border-fuchsia-500/10 rounded-xl text-xs space-y-1">
                                  <div className="font-bold text-fuchsia-400 flex items-center gap-1">
                                    <MessageSquare size={12} />
                                    Custom AI Chatbot Pitch Hook
                                  </div>
                                  <p className="text-slate-300 italic">"I noticed you don't have a live chat or interactive bot on your site. Up to 60% of consumers expect businesses to be available 24/7. We can deploy a custom-trained AI assistant that answers support queries, captures emails, and books calls for you even when you sleep."</p>
                                </div>
                              )}

                              {/* Missing Booking Hook */}
                              {!selectedLead.analysis.conversion?.has_booking_system && (
                                <div className="p-3 bg-fuchsia-500/5 border border-fuchsia-500/10 rounded-xl text-xs space-y-1">
                                  <div className="font-bold text-fuchsia-400 flex items-center gap-1">
                                    <Clock size={12} />
                                    Online Scheduling Hook
                                  </div>
                                  <p className="text-slate-300 italic">"I saw that you're relying purely on standard contact forms rather than instant calendars. Integrating a streamlined booking calendar (like Calendly) on your site can increase inbound meeting rates by up to 25% by removing scheduling friction."</p>
                                </div>
                              )}

                              {/* SEO Missing Sitemap / Robots Hook */}
                              {(!selectedLead.analysis.seo?.has_sitemap || !selectedLead.analysis.seo?.has_robots_txt) && (
                                <div className="p-3 bg-fuchsia-500/5 border border-fuchsia-500/10 rounded-xl text-xs space-y-1">
                                  <div className="font-bold text-fuchsia-400 flex items-center gap-1">
                                    <Search size={12} />
                                    Local Google Rankings Hook
                                  </div>
                                  <p className="text-slate-300 italic">"Our automated diagnostic tool detected that your site is missing critical SEO indexing configurations like {!selectedLead.analysis.seo?.has_sitemap ? 'sitemap.xml' : 'robots.txt'}. This prevents Google's spiders from indexing your services correctly, making you invisible to local searchers. We can fix this configuration in 10 minutes to help you outrank local competitors."</p>
                                </div>
                              )}

                              {/* SSL Unsecured hook */}
                              {!selectedLead.analysis.security?.has_ssl && (
                                <div className="p-3 bg-fuchsia-500/5 border border-fuchsia-500/10 rounded-xl text-xs space-y-1">
                                  <div className="font-bold text-fuchsia-400 flex items-center gap-1">
                                    <Shield size={12} />
                                    Trust & Security SSL Hook
                                  </div>
                                  <p className="text-slate-300 italic">"I noticed your site does not have an active SSL certificate. Chrome and Safari show visitors a scary 'Not Secure' warning on unsecured sites, which instantly kills trust. We can set up a secure HTTPS connection today to clear that warning and protect your customers' data."</p>
                                </div>
                              )}

                              {/* Catch-all general audit value hook */}
                              <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl text-xs space-y-1">
                                <div className="font-bold text-slate-300 flex items-center gap-1">
                                  <Lightbulb size={12} />
                                  Standard Value-First Hook
                                </div>
                                <p className="text-slate-400 italic">"I performed a complimentary 5-point audit of your business website ({selectedLead.website || 'yoursite.com'}) covering SEO, performance, security, and conversion metrics. We found {selectedLead.analysis.seo?.issues?.length ?? 0} SEO bottlenecks and {selectedLead.analysis.performance?.issues?.length ?? 0} page-speed bottlenecks. I'd love to send you the full detailed PDF report if you are open to it?"</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
              <div className="p-6 bg-slate-800 rounded-full mb-4">
                <MessageSquare size={48} />
              </div>
              <h3 className="text-xl font-bold">Select a Lead</h3>
              <p className="text-slate-500 max-w-xs mt-2">Pick a lead from the left to start generating your outreach campaign.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
