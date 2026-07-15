import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, QrCode, Power } from 'lucide-react';
import Button from './Button';
import { useConfirm } from './ConfirmDialog';
import { getWhatsappStatus, connectWhatsapp, logoutWhatsapp, refreshWhatsappQr } from '../api/whatsapp';

/** Connect/QR-login card for one WhatsApp session (purpose = 'CustomerDocs' | 'Greetings'). */
export default function WhatsappSessionCard({ purpose, title, description }) {
  const confirm = useConfirm();
  const [status, setStatus] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const refresh = useCallback(() => {
    getWhatsappStatus(purpose).then((res) => setStatus(res.data.data));
  }, [purpose]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Stay in the loader state until the session actually produces a QR / connects —
  // the connect API returns instantly but the browser takes 10–30s to start up.
  useEffect(() => {
    if (connecting && status && status.status !== 'Disconnected' && status.qrDataUrl) setConnecting(false);
    if (connecting && status?.status === 'Connected') setConnecting(false);
  }, [status, connecting]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connectWhatsapp(purpose);
    } catch {
      setConnecting(false);
    }
    refresh();
  };

  const handleRefreshQr = async () => {
    setConnecting(true);
    try {
      await refreshWhatsappQr(purpose);
    } catch {
      setConnecting(false);
    }
    refresh();
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: `Log out ${title}?`,
      message: 'The WhatsApp session disconnects and you will need to scan the QR code again to reconnect.',
      confirmText: 'Logout',
      danger: true,
    });
    if (!ok) return;
    await logoutWhatsapp(purpose);
    refresh();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="font-bold text-navy-900">{title}</h3>
      <p className="text-xs text-gray-500 mb-4">{description}</p>

      {status?.status === 'Connected' ? (
        <div className="flex items-center justify-between bg-lime-50 border border-lime-200 rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm text-navy-900 font-semibold">
            <CheckCircle2 size={16} className="text-lime-600" /> Connected {status.connectedNumber ? `(+${status.connectedNumber})` : ''}
          </div>
          <Button variant="outline" onClick={handleLogout}><Power size={13} /> Logout</Button>
        </div>
      ) : status?.status === 'Connecting' ? (
        <div className="flex flex-col gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shrink-0" />
            Reconnecting... this takes 10–30 seconds after a server restart
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              className="text-xs text-navy-900 underline hover:text-black font-medium"
              onClick={handleRefreshQr}
            >
              Stuck? Force Reconnect / Get Fresh QR
            </button>
          </div>
        </div>
      ) : (status?.status === 'QrPending' && !status.qrDataUrl) || (connecting && (!status || status.status === 'Disconnected')) ? (
        <div className="flex flex-col gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shrink-0" />
            Generating QR code... this takes 10–30 seconds
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              className="text-xs text-navy-900 underline hover:text-black font-medium"
              onClick={handleRefreshQr}
            >
              Stuck? Force Reconnect / Get Fresh QR
            </button>
          </div>
        </div>
      ) : status?.status === 'QrPending' && status.qrDataUrl ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <img src={status.qrDataUrl} alt="Scan with WhatsApp" className="w-40 h-40 border border-gray-200 rounded-lg" />
          <p className="text-xs text-gray-400">Open WhatsApp on the phone for this number → Linked Devices → Link a Device</p>
          <button
            type="button"
            className="text-xs text-navy-900 underline"
            onClick={handleRefreshQr}
          >
            QR not working? Get a fresh one
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
          <span className="text-sm text-gray-500 flex items-center gap-2"><QrCode size={16} /> Not connected</span>
          <Button variant="accent" onClick={handleConnect} disabled={connecting}>
            {connecting ? 'Starting...' : 'Connect'}
          </Button>
        </div>
      )}
    </div>
  );
}
