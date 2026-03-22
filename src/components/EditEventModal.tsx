import React, { useState } from 'react';
import { CalendarEvent } from '../types';
import { X, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface EditEventModalProps {
  event: CalendarEvent;
  onClose: () => void;
  onSave: (updates: Partial<CalendarEvent>) => void;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({ event, onClose, onSave }) => {
  const [title, setTitle] = useState(event.title);
  const [priority, setPriority] = useState(event.priority);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ title, priority });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-black/5 flex items-center justify-between">
          <h3 className="text-xl font-semibold tracking-tight">Edit Task</h3>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-lg transition-colors">
            <X size={20} className="text-black/40" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-black/40 uppercase tracking-wider">Task Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#F3F4F6] border-none rounded-xl py-4 px-4 text-sm focus:ring-2 focus:ring-black/5 outline-none"
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-black/40 uppercase tracking-wider">Priority & Color</label>
            <div className="grid grid-cols-3 gap-3">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                    priority === p
                      ? p === 'high' ? 'border-red-500 bg-red-50 text-red-700' :
                        p === 'medium' ? 'border-amber-500 bg-amber-50 text-amber-700' :
                        'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-transparent bg-[#F3F4F6] text-black/40 hover:bg-[#E5E7EB]'
                  }`}
                >
                  <span className="text-xs font-bold uppercase">{p}</span>
                  <div className={`w-3 h-3 rounded-full ${
                    p === 'high' ? 'bg-red-500' :
                    p === 'medium' ? 'bg-amber-500' :
                    'bg-emerald-500'
                  }`} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-xl text-blue-700 text-xs">
            <Clock size={14} />
            <span>Scheduled for {format(event.startTime, 'MMM d, h:mm a')} - {format(event.endTime, 'h:mm a')}</span>
          </div>

          <button
            type="submit"
            className="w-full bg-black text-white py-4 rounded-xl font-bold text-sm hover:bg-black/80 transition-colors shadow-lg shadow-black/10"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};
