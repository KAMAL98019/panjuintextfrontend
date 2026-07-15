import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import Button from '../components/Button';
import WhatsappSessionCard from '../components/WhatsappSessionCard';
import { useConfirm } from '../components/ConfirmDialog';
import { Label, Input, Textarea } from '../components/form/Field';
import * as whatsappApi from '../api/whatsapp';
import * as customersApi from '../api/customers';
import { formatDateTime } from '../utils/format';

export default function WhatsApp() {
  const confirm = useConfirm();
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [templateBody, setTemplateBody] = useState('Dear {{customerName}}, wishing you a very Happy Diwali from all of us at Panju Intext! ✨ Enjoy special offers on curtains, blinds & wallpapers this festive season.');
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [message, setMessage] = useState('');

  const [customers, setCustomers] = useState([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [audienceMode, setAudienceMode] = useState('all'); // 'all' | 'selected'

  const [broadcasting, setBroadcasting] = useState(false);
  const [logs, setLogs] = useState([]);
  const [sinceTs, setSinceTs] = useState(null);

  const loadTemplates = useCallback(() => {
    whatsappApi.listTemplates('Greetings').then((res) => setTemplates(res.data.data));
  }, []);

  useEffect(() => {
    loadTemplates();
    customersApi.listCustomers({ page: 1, limit: 500 }).then((res) => setCustomers(res.data.data));
  }, [loadTemplates]);

  useEffect(() => {
    if (!sinceTs) return;
    const interval = setInterval(() => {
      whatsappApi.listWhatsappLogs('Greetings', sinceTs).then((res) => setLogs(res.data.data));
    }, 4000);
    return () => clearInterval(interval);
  }, [sinceTs]);

  const handleSaveTemplate = async () => {
    if (!templateName || !templateBody) {
      toast.error('Template name and message are required');
      return;
    }
    try {
      if (editingTemplateId) {
        await whatsappApi.updateTemplate(editingTemplateId, { name: templateName, body: templateBody });
        toast.success('Template updated');
        setEditingTemplateId(null);
      } else {
        await whatsappApi.createTemplate('Greetings', { name: templateName, body: templateBody });
        toast.success('Template saved');
      }
      setTemplateName('');
      setTemplateBody('');
      loadTemplates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save template');
    }
  };

  const handleCancelEdit = () => {
    setEditingTemplateId(null);
    setTemplateName('');
    setTemplateBody('');
  };

  const handleUseTemplate = (t) => {
    setSelectedTemplateId(t.id);
    setMessage(t.body);
  };

  const handleDeleteTemplate = async (id) => {
    const ok = await confirm({ title: 'Delete this template?', confirmText: 'Delete', danger: true });
    if (!ok) return;
    await whatsappApi.deleteTemplate(id);
    loadTemplates();
  };

  const toggleCustomer = (id) => {
    setSelectedCustomerIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  };

  const handleBroadcast = async () => {
    if (!message.trim()) {
      toast.error('Write a greeting message first');
      return;
    }
    const targetCount = audienceMode === 'all' ? customers.length : selectedCustomerIds.length;
    if (targetCount === 0) {
      toast.error('No customers selected');
      return;
    }
    const ok = await confirm({
      title: `Send greeting to ${targetCount} customer(s)?`,
      message: 'Messages send one-by-one with a delay between each — this may take a while and cannot be undone.',
      confirmText: 'Send Broadcast',
    });
    if (!ok) return;
    setBroadcasting(true);
    try {
      const res = await whatsappApi.broadcastGreeting({
        message,
        customerIds: audienceMode === 'selected' ? selectedCustomerIds : undefined,
        delayMs: 6000,
      });
      toast.success(res.data.message);
      setSinceTs(new Date().toISOString());
      setLogs([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start broadcast');
    } finally {
      setBroadcasting(false);
    }
  };

  const sentCount = logs.filter((l) => l.status === 'Sent').length;
  const failedCount = logs.filter((l) => l.status === 'Failed').length;

  return (
    <Layout>
      <div className="mb-6">
        <p className="text-xs text-gray-400 mb-1">Dashboard &gt; WhatsApp</p>
        <h1 className="text-2xl font-bold text-navy-900">WhatsApp Messaging</h1>
        <p className="text-sm text-gray-500">Two independent sessions — one for sending customer quotations/bills, one for festival greetings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <WhatsappSessionCard
          purpose="CustomerDocs"
          title="Case 1 · Document Sending Number"
          description="Sends a customer's quotation/Memo/GST bill as a PDF to the owner and/or the customer. Scan the QR with the phone number dedicated to document sending."
        />
        <WhatsappSessionCard
          purpose="Greetings"
          title="Case 2 · Greetings Number"
          description="Broadcasts festival offers (Diwali, Pongal, etc.) to your customer list. Scan the QR with a DIFFERENT phone number dedicated to greetings."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-navy-50 border border-navy-100 rounded-xl p-5 text-sm">
          <h3 className="font-bold text-navy-900 mb-2">📄 How Case 1 works — send documents as PDF</h3>
          <ol className="list-decimal ml-5 space-y-1.5 text-gray-600 text-xs">
            <li>Connect the <b>Case 1 number</b> above (scan QR once — it stays logged in, even after restarts).</li>
            <li>In <b>Settings</b>, fill <b>Owner WhatsApp Number</b> — that's where documents go when you pick "Send to owner".</li>
            <li>Open any quotation → <b>View Documents</b> → pick the Quotation / Memo / GST Bill tab.</li>
            <li>Click the <b>💬 WhatsApp icon</b> in the toolbar. Tick <b>owner</b>, <b>customer</b>, or both, optionally type a message, then <b>Send PDF</b>.</li>
          </ol>
        </div>
        <div className="bg-lime-50 border border-lime-100 rounded-xl p-5 text-sm">
          <h3 className="font-bold text-navy-900 mb-2">🎉 How Case 2 works — festival greetings to all customers</h3>
          <ol className="list-decimal ml-5 space-y-1.5 text-gray-600 text-xs">
            <li>Connect the <b>Case 2 number</b> above (a different SIM from Case 1).</li>
            <li>Write or pick a greeting template below — <code>{'{{customerName}}'}</code> becomes each customer's name.</li>
            <li>Choose <b>All customers</b> or hand-pick a few, then <b>Send Broadcast</b>.</li>
            <li>Messages go out one-by-one with a gap between each; watch the progress log below the button.</li>
          </ol>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h3 className="font-bold text-navy-900 mb-1">Greeting Templates</h3>
        <p className="text-xs text-gray-500 mb-4">Use <code>{'{{customerName}}'}</code> as a placeholder — it's filled in per customer when sent.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <Label>Template Name</Label>
              <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Diwali Offer 2026" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea rows={4} value={templateBody} onChange={(e) => setTemplateBody(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="accent" onClick={handleSaveTemplate}>
                {editingTemplateId ? 'Update Template' : 'Save Template'}
              </Button>
              {editingTemplateId && (
                <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
              )}
            </div>
          </div>

          <div>
            <Label>Saved Templates</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {templates.length === 0 && <p className="text-xs text-gray-400">No templates saved yet.</p>}
              {templates.map((t) => (
                <div key={t.id} className={`border rounded-lg px-3 py-2 flex items-start justify-between gap-2 ${selectedTemplateId === t.id ? 'border-lime-400 bg-lime-50' : 'border-gray-200'}`}>
                  <button className="text-left flex-1" onClick={() => handleUseTemplate(t)}>
                    <p className="text-xs font-semibold text-navy-900">{t.name}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">{t.body}</p>
                  </button>
                  <div className="flex gap-2 shrink-0">
                    <button
                      className="text-xs text-navy-900 hover:underline"
                      onClick={() => {
                        setEditingTemplateId(t.id);
                        setTemplateName(t.name);
                        setTemplateBody(t.body);
                      }}
                    >
                      Edit
                    </button>
                    <button className="text-xs text-red-500 hover:underline" onClick={() => handleDeleteTemplate(t.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-navy-900 mb-1">Send Greeting Broadcast</h3>
        <p className="text-xs text-gray-500 mb-4">Sends one-by-one with a delay between each message to keep sending patterns natural — this reduces (not eliminates) the risk of WhatsApp rate-limiting the number.</p>

        <div>
          <Label>Message to Send</Label>
          <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Pick a template above or write a custom message..." />
        </div>

        <div className="flex items-center gap-4 mt-3 mb-3">
          <label className="flex items-center gap-1.5 text-sm">
            <input type="radio" checked={audienceMode === 'all'} onChange={() => setAudienceMode('all')} /> All customers ({customers.length})
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="radio" checked={audienceMode === 'selected'} onChange={() => setAudienceMode('selected')} /> Select customers ({selectedCustomerIds.length} selected)
          </label>
        </div>

        {audienceMode === 'selected' && (
          <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto p-2 mb-3 grid grid-cols-2 gap-1">
            {customers.map((c) => (
              <label key={c.id} className="flex items-center gap-1.5 text-xs px-1.5 py-1">
                <input type="checkbox" checked={selectedCustomerIds.includes(c.id)} onChange={() => toggleCustomer(c.id)} />
                {c.name} <span className="text-gray-400">{c.mobile}</span>
              </label>
            ))}
          </div>
        )}

        <Button variant="accent" onClick={handleBroadcast} disabled={broadcasting}>
          {broadcasting ? 'Starting...' : 'Send Broadcast'}
        </Button>

        {sinceTs && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-navy-900 mb-2">
              Progress: {sentCount} sent, {failedCount} failed
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {logs.map((l) => (
                <p key={l.id} className="text-xs text-gray-500">
                  <span className={l.status === 'Sent' ? 'text-green-600' : 'text-red-500'}>{l.status}</span> — {l.toNumber} — {formatDateTime(l.createdAt)}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
