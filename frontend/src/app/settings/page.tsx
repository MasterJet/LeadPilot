"use client";
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Key, Trash2, Plus, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai',
    api_key: ''
  });

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const data = await api.getLLMKeys();
      setKeys(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch keys:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      await api.addLLMKey(formData.provider, formData.api_key, formData.name);
      setSuccess('Key successfully validated and saved.');
      setFormData({ name: '', provider: 'openai', api_key: '' });
      fetchKeys();
    } catch (err: any) {
      setError(err.message || 'Failed to validate and save key. Make sure it is active.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this key?')) return;
    try {
      await api.deleteLLMKey(id);
      fetchKeys();
    } catch (err: any) {
      alert(err.message || 'Failed to delete key. It might be in use by a campaign.');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings & Integrations</h1>
        <p className="text-slate-400">Manage your LLM API keys for AI analysis and outreach generation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Add New Key Form */}
        <div className="card p-6 border-slate-800">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-800">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Plus size={20} />
            </div>
            <h2 className="text-xl font-bold">Add API Key</h2>
          </div>

          <form onSubmit={handleAddKey} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-sm flex items-start gap-2">
                <XCircle size={16} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-sm flex items-start gap-2">
                <CheckCircle size={16} className="mt-0.5 shrink-0" />
                <p>{success}</p>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Key Label</label>
              <input 
                type="text" 
                required
                placeholder="e.g. My OpenAI Key"
                className="input w-full"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Provider</label>
              <select 
                className="input w-full"
                value={formData.provider}
                onChange={(e) => setFormData({...formData, provider: e.target.value})}
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">API Key</label>
              <input 
                type="password" 
                required
                placeholder="sk-..."
                className="input w-full"
                value={formData.api_key}
                onChange={(e) => setFormData({...formData, api_key: e.target.value})}
              />
              <p className="text-xs text-slate-500 mt-2">Your key will be securely tested before saving.</p>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="btn-primary w-full mt-4 disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying & Saving...' : 'Save API Key'}
            </button>
          </form>
        </div>

        {/* Existing Keys List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4">Saved Keys</h2>
          
          {loading ? (
            <p className="text-slate-500">Loading keys...</p>
          ) : keys.length === 0 ? (
            <div className="card py-12 text-center border-dashed border-slate-700 bg-transparent">
              <Key size={32} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-500">No API keys saved yet.</p>
            </div>
          ) : (
            keys.map((k, i) => (
              <motion.div 
                key={k.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="card p-4 flex items-center justify-between border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${k.provider === 'openai' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    <Key size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold">{k.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{k.provider}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span className="text-xs text-emerald-500">Verified</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(k.id)}
                  className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                  title="Delete Key"
                >
                  <Trash2 size={18} />
                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
