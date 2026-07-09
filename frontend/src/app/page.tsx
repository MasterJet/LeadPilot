"use client";
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  Users, 
  Target, 
  TrendingUp, 
  Zap,
  Plus,
  Play,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    highPriority: 0,
    contacted: 0,
    conversion: 0
  });
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [leads, campaignsData] = await Promise.all([
        api.getLeads(),
        api.getCampaigns()
      ]);
      if (Array.isArray(leads)) {
        const high = leads.filter((l: any) => l.priority === 'high').length;
        const contacted = leads.filter((l: any) => l.status !== 'new').length;
        
        setStats({
          totalLeads: leads.length,
          highPriority: high,
          contacted: contacted,
          conversion: leads.length > 0 ? Math.round((contacted / leads.length) * 100) : 0
        });
      } else {
        console.warn("Expected leads array, received:", leads);
      }

      if (Array.isArray(campaignsData)) {
        // Just storing campaigns directly, they now have leads_count from the API
        setCampaigns(campaignsData.slice(0, 3)); // Show top 3 recent campaigns
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Leads', value: stats.totalLeads, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'High Priority', value: stats.highPriority, icon: Zap, color: 'text-rose-400', bg: 'bg-rose-400/10' },
    { label: 'Contacted', value: stats.contacted, icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Conversion', value: `${stats.conversion}%`, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  ];

  const [formData, setFormData] = useState({ niche: '', location: '', maxResults: 20 });

  const handleQuickLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const campaignName = `${formData.niche} in ${formData.location}`;
      const campaign = await api.createCampaign({ name: campaignName, niche: formData.niche, location: formData.location });
      await api.triggerScrape(campaign.id, formData.niche, formData.location, formData.maxResults);
      alert("Campaign launched! Leads will appear in the Leads tab shortly.");
      setFormData({ niche: '', location: '', maxResults: 20 });
    } catch (err) {
      console.error("Quick launch failed:", err);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">LeadPilot Overview</h1>
          <p className="text-slate-400">Welcome back. Here's what's happening with your outbound engine.</p>
        </div>
        <Link href="/campaigns?create=true" className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          New Campaign
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="card group hover:scale-[1.02] transition-all cursor-default"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <ArrowUpRight className="text-slate-600 group-hover:text-slate-400 transition-colors" size={20} />
            </div>
            <div className="text-3xl font-bold mb-1">{loading ? '...' : stat.value}</div>
            <div className="text-sm font-medium text-slate-500">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Launch */}
        <div className="lg:col-span-1 card h-fit">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Zap size={20} />
            </div>
            <h2 className="text-xl font-bold">Quick Launch</h2>
          </div>
          
          <form onSubmit={handleQuickLaunch} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5 block">Niche</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Aesthetic Clinic" 
                className="input w-full" 
                value={formData.niche}
                onChange={(e) => setFormData({...formData, niche: e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5 block">Location</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Vienna" 
                className="input w-full" 
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5 block">Max Results</label>
              <input 
                type="number" 
                required
                className="input w-full" 
                value={formData.maxResults}
                onChange={(e) => setFormData({...formData, maxResults: parseInt(e.target.value)})}
              />
            </div>
            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 mt-4 py-3">
              <Play size={18} fill="currentColor" />
              Start Generating
            </button>
          </form>
        </div>

        {/* Recent Activity / Campaign Summary */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                <Target size={20} />
              </div>
              <h2 className="text-xl font-bold">Active Campaigns</h2>
            </div>
            <Link href="/campaigns" className="text-sm text-blue-400 hover:underline">View all</Link>
          </div>

          <div className="space-y-4">
            {campaigns.length === 0 ? (
               <div className="text-slate-500 text-center py-6 text-sm">No active campaigns found. Start a quick launch!</div>
            ) : (
              campaigns.map(campaign => (
                <div key={campaign.id} className="p-4 bg-slate-800/30 rounded-xl border border-slate-700 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold mb-0.5">{campaign.name || 'Untitled Campaign'}</h4>
                    <p className="text-xs text-slate-500">Targeting {campaign.niche} in {campaign.location}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-blue-400">{campaign.leads_count || 0} Leads</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
