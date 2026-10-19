import React from 'react';
import { Modal } from './Modal.tsx';
import { Download, FileText, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface ReceiptViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseId: string;
  paymentId: string;
  title: string;
  receiptName?: string;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  isOpen,
  onClose,
  expenseId,
  paymentId,
  title,
  receiptName,
}) => {
  const { currentWorkspace, token } = useAuth();

  if (!isOpen || !currentWorkspace) return null;

  // Build authenticated URL with query token for safe preview
  const receiptUrl = `/api/workspaces/${currentWorkspace.id}/expenses/${expenseId}/receipt?token=${encodeURIComponent(
    token || ''
  )}`;

  const isPdf = receiptName?.toLowerCase().endsWith('.pdf');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bill Attachment: ${paymentId}`}
      subtitle={title}
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span className="font-medium truncate max-w-xs">{receiptName || 'Attached Receipt'}</span>
          </div>
          <a
            href={receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={receiptName || `${paymentId}-receipt`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
        </div>

        <div className="max-h-[60vh] overflow-auto flex items-center justify-center p-2 bg-slate-100 rounded-xl border border-slate-200">
          {isPdf ? (
            <div className="py-12 text-center">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-xs text-slate-600 mb-3">This receipt is a PDF document.</p>
              <a
                href={receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open PDF in New Tab</span>
              </a>
            </div>
          ) : (
            <img
              src={receiptUrl}
              alt="Receipt attachment"
              className="max-h-[55vh] object-contain rounded-lg shadow-xs"
              onError={(e) => {
                (e.target as any).style.display = 'none';
              }}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};
