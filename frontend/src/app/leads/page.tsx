"use client";
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  Users, 
  Search, 
  Filter, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Globe,
  MessageSquare,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';

import { useSearchParams } from 'next/navigation';

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const initialCampaignId = searchParams.get('campaign_id');
  
  const [leads, setLeads] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [selectedCampaign, setSelectedCampaign] = useState(initialCampaignId || '');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [selectedCampaign, selectedStatus]);

  const fetchCampaigns = async () => {
    try {
      const data = await api.getCampaigns();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    }
  };

  const exportToCSV = () => {
    if (filteredLeads.length === 0) return;

    const headers = [
      'Name', 'Niche', 'Location', 'Website', 'Google_Maps_URL', 'Status', 'Score', 
      'Reviews_Count', 'Rating', 'Phone', 'Email', 'WhatsApp_Link', 
      'Instagram_Link', 'Facebook_Link', 'LinkedIn_Link', 'Contact_Form_Link',
      'SEO_Sitemap', 'SEO_Robots.txt', 'SEO_Score', 'SEO_Title', 'SEO_Description', 
      'SEO_Has_Canonical', 'SEO_Has_OG_Tags', 'SEO_Has_Schema',
      'Performance_Load_Time_ms', 'Performance_Page_Size_KB', 'Performance_Mobile_Friendly',
      'Security_Has_SSL', 'Security_HTTPS_Redirect',
      'Tech_Stack_CMS', 'Tech_Stack_CMS_Version', 'Tech_Stack_CDN'
    ];

    const csvRows = filteredLeads.map(lead => {
      const analysis = lead.analysis;
      const seo = analysis?.seo;
      const performance = analysis?.performance;
      const security = analysis?.security;
      const techStack = analysis?.tech_stack;

      const row = [
        lead.name || '',
        lead.niche || '',
        lead.location || '',
        lead.website || '',
        lead.google_maps_url || '',
        lead.status || '',
        lead.score || 0,
        lead.reviews_count || 0,
        lead.rating || 0,
        lead.phone || '',
        analysis?.email_address || lead.email || '',
        analysis?.whatsapp_link || '',
        analysis?.instagram_link || '',
        analysis?.facebook_link || '',
        analysis?.linkedin_link || '',
        analysis?.contact_form_link || '',
        // SEO Fields
        seo?.has_sitemap !== undefined ? (seo.has_sitemap ? 'Yes' : 'No') : '',
        seo?.has_robots_txt !== undefined ? (seo.has_robots_txt ? 'Yes' : 'No') : '',
        seo?.score !== undefined ? seo.score : '',
        seo?.title || '',
        seo?.description || '',
        seo?.has_canonical !== undefined ? (seo.has_canonical ? 'Yes' : 'No') : '',
        seo?.has_og_tags !== undefined ? (seo.has_og_tags ? 'Yes' : 'No') : '',
        seo?.has_schema_markup !== undefined ? (seo.has_schema_markup ? 'Yes' : 'No') : '',
        // Performance
        performance?.page_load_ms !== undefined ? performance.page_load_ms : '',
        performance?.page_size_kb !== undefined ? performance.page_size_kb : '',
        performance?.has_mobile_viewport !== undefined ? (performance.has_mobile_viewport ? 'Yes' : 'No') : '',
        // Security
        security?.has_ssl !== undefined ? (security.has_ssl ? 'Yes' : 'No') : '',
        security?.https_redirect !== undefined ? (security.https_redirect ? 'Yes' : 'No') : '',
        // Tech Stack
        techStack?.cms || '',
        techStack?.cms_version || '',
        techStack?.cdn || ''
      ];

      return row.map(val => {
        const str = String(val === null || val === undefined ? '' : val);
        const escaped = str.replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leadpilot_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (selectedCampaign) filters.campaign_id = selectedCampaign;
      if (selectedStatus) filters.status = selectedStatus;
      const data = await api.getLeads(filters);
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (lead.website && lead.website.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      case 'medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold">
              {selectedCampaign 
                ? campaigns.find(c => c.id.toString() === selectedCampaign.toString())?.name || 'Lead Management'
                : 'All Leads'
              }
            </h1>
            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm font-bold">
              {filteredLeads.length} Results
            </span>
          </div>
          <p className="text-slate-400">View and manage your collected leads.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={exportToCSV}
            disabled={filteredLeads.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium border border-slate-700"
          >
            <Download size={18} />
            Export CSV
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search leads..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-500" />
            <select 
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Campaigns</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="analyzed">Analyzed</option>
            <option value="contacted">Contacted</option>
            <option value="replied">Replied</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden !p-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 border-b border-slate-700">
              <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Business</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Priority</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Analysis</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Score</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              [1, 2, 3].map(i => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="px-6 py-8 h-16 bg-slate-800/20"></td>
                </tr>
              ))
            ) : filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">No leads found matching your criteria.</td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <motion.tr 
                  key={lead.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-slate-800/30 transition-all group"
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-200">
                      {lead.google_maps_url ? (
                        <a href={lead.google_maps_url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                          {lead.name} ↗
                        </a>
                      ) : (
                        lead.name
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      {lead.website ? (
                        <a href={lead.website} target="_blank" className="hover:text-blue-400 flex items-center gap-1">
                          <Globe size={12} /> {new URL(lead.website).hostname}
                        </a>
                      ) : (
                        <span className="text-rose-500/80 italic flex items-center gap-1">
                          <AlertTriangle size={12} /> No Website
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getPriorityColor(lead.priority)}`}>
                      {lead.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {lead.analysis?.has_whatsapp && <div title="WhatsApp" className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg"><MessageSquare size={14} /></div>}
                      {lead.analysis?.has_chatbot && <div title="Chatbot" className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg"><Globe size={14} /></div>}
                      {!lead.analysis?.has_chatbot && lead.website && <div title="No Chatbot (Gap)" className="p-1.5 bg-rose-500/10 text-rose-500 rounded-lg"><AlertTriangle size={14} /></div>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xl font-bold text-blue-400">{lead.score}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      {lead.status === 'new' ? <Clock size={16} /> : <CheckCircle2 size={16} className="text-emerald-500" />}
                      <span className="capitalize">{lead.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-slate-700 rounded-lg transition-all text-slate-400 hover:text-white">
                      <ExternalLink size={18} />
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
