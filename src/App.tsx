import React, { useState } from 'react';
import { Calendar } from './components/Calendar';
import { Chat } from './components/Chat';
import { CalendarEvent, ChatMessage, UserSettings, AIScheduleResponse } from './types';
import { planSchedule } from './services/ai';
import { addMinutes, startOfHour, addHours, isAfter, isSameDay } from 'date-fns';
import { LayoutGrid, Calendar as CalendarIcon, Settings, User, X, Sparkles, Moon } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    sleepStart: '23:30',
    sleepEnd: '06:00',
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your AI Productivity Coach. 🚀\n\nTell me what you need to achieve today. I'll analyze your tasks, estimate the time needed, assign priorities, and schedule breaks to keep you at your peak performance.",
      timestamp: new Date(),
    }
  ]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async (content: string) => {
    console.log('handleSendMessage called with:', content);
    const apiKey = (globalThis as any).process?.env?.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
    console.log('API Key present:', !!apiKey);
    
    if (!apiKey) {
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "⚠️ Gemini API Key is missing. Please add it to your environment variables (GEMINI_API_KEY) in the Settings menu to enable the AI assistant.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content, timestamp: new Date() }, errorMsg]);
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    console.log('Selected Date:', selectedDate);
    console.log('Settings:', settings);
    console.log('Current Events:', events);
    console.log('Current Messages:', messages);
    console.log('Is Typing:', true);

    try {
      console.log('Calling planSchedule...');
      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI response timed out')), 45000);
      });

      const result = await Promise.race([
        planSchedule(content, events, selectedDate, settings),
        timeoutPromise
      ]) as AIScheduleResponse;
      
      console.log('AI Result received:', result);

      let updatedEvents = [...events];
      
      // Initialize lastEndTime to the start of the day on selectedDate, 
      // but after the sleep schedule ends
      const sleepEnd = settings.sleepEnd || '06:00';
      const [sleepEndHours, sleepEndMinutes] = sleepEnd.split(':').map(Number);
      let lastEndTime = new Date(selectedDate);
      
      if (!isNaN(sleepEndHours)) {
        lastEndTime.setHours(sleepEndHours, sleepEndMinutes || 0, 0, 0);
      } else {
        lastEndTime.setHours(6, 0, 0, 0);
      }
      
      // If we're looking at today, ensure we don't schedule in the past
      if (isSameDay(lastEndTime, new Date())) {
        const nowPlusBuffer = addMinutes(new Date(), 30);
        if (isAfter(nowPlusBuffer, lastEndTime)) {
          lastEndTime = nowPlusBuffer;
        }
      }

      if (result.actions && Array.isArray(result.actions)) {
        result.actions.forEach((action, index) => {
          try {
            switch (action.type) {
              case 'ADD':
                if (action.eventData) {
                  let startTime: Date;
                  const suggestedTime = action.eventData.suggestedTime;
                  
                  if (suggestedTime) {
                    // If AI returns a full ISO-like string without Z, it's local time
                    // If it returns just HH:mm, we combine with selectedDate
                    if (suggestedTime.includes('T')) {
                      const parsedDate = new Date(suggestedTime);
                      if (!isNaN(parsedDate.getTime())) {
                        startTime = parsedDate;
                      } else {
                        startTime = lastEndTime;
                      }
                    } else {
                      // Fallback: try to parse as time on current selected date
                      const timeMatch = suggestedTime.match(/(\d{1,2}):(\d{2})/);
                      if (timeMatch) {
                        const hours = parseInt(timeMatch[1]);
                        const minutes = parseInt(timeMatch[2]);
                        startTime = new Date(selectedDate);
                        startTime.setHours(hours, minutes, 0, 0);
                      } else {
                        startTime = lastEndTime;
                      }
                    }
                  } else {
                    startTime = lastEndTime;
                  }

                  // Ensure start time is not in the past relative to now if it's today
                  if (isSameDay(startTime, new Date()) && isAfter(new Date(), startTime)) {
                    startTime = addMinutes(new Date(), 15);
                  }

                  const duration = action.eventData.durationMinutes || 60;
                  const endTime = addMinutes(startTime, duration);
                  
                  // Clean title: remove metadata if AI included it
                  let cleanTitle = action.eventData.title || 'Untitled Task';
                  cleanTitle = cleanTitle.split('.')[0].split(',')[0].split('(')[0].trim();

                  updatedEvents.push({
                    id: `ai-${Date.now()}-${index}`,
                    title: cleanTitle,
                    description: action.eventData.description,
                    startTime,
                    endTime,
                    priority: action.eventData.priority || 'medium',
                  });
                  lastEndTime = addMinutes(endTime, 15); // Add 15m buffer for next task
                }
                break;
              case 'DELETE':
                if (action.eventId) {
                  updatedEvents = updatedEvents.filter(e => e.id !== action.eventId);
                }
                break;
              case 'UPDATE':
                if (action.eventId && action.eventData) {
                  updatedEvents = updatedEvents.map(e => {
                    if (e.id === action.eventId) {
                      const startTime = action.eventData?.suggestedTime ? new Date(action.eventData.suggestedTime) : e.startTime;
                      const duration = action.eventData?.durationMinutes || (e.endTime.getTime() - e.startTime.getTime()) / (1000 * 60);
                      return {
                        ...e,
                        title: action.eventData?.title || e.title,
                        description: action.eventData?.description || e.description,
                        startTime,
                        endTime: addMinutes(startTime, duration),
                        priority: action.eventData?.priority || e.priority,
                      };
                    }
                    return e;
                  });
                }
                break;
              case 'CLEAR':
                updatedEvents = [];
                break;
            }
          } catch (err) {
            console.error('Error processing AI action:', action, err);
          }
        });
      }
      
      console.log('Updated Events:', updatedEvents);
      setEvents(updatedEvents);
      
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.explanation || "I've updated your schedule. Let me know if you'd like any more changes!",
        timestamp: new Date(),
      };
      console.log('Assistant Message:', assistantMsg);
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Scheduling error:', error);
      console.log('Error object:', error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error && error.message.includes('timed out') 
          ? "I'm sorry, the AI took too long to respond. Please try again with a simpler request."
          : "I'm sorry, I encountered an error while trying to schedule your tasks. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      console.log('Finally block hit');
      console.log('handleSendMessage finished, setting isTyping to false');
      setIsTyping(false);
      console.log('Is Typing reset to false');
    }
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const handleUpdateEvent = (id: string, updates: Partial<CalendarEvent>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#F8F9FA] p-6 gap-6 overflow-hidden relative">
      {/* Main Content */}
      <main className="flex-1 flex gap-6 min-w-0 h-full">
        <Calendar 
          events={events} 
          selectedDate={selectedDate} 
          onDateChange={setSelectedDate}
          onDeleteEvent={handleDeleteEvent}
          onUpdateEvent={handleUpdateEvent}
          onClearAll={() => setEvents([])}
        />
      </main>

      {/* Floating Settings Button */}
      <button
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        className={cn(
          "fixed bottom-8 left-8 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all z-50",
          isSettingsOpen ? "bg-black text-white" : "bg-white text-black hover:bg-black/5"
        )}
      >
        <Settings size={20} />
      </button>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white">
                  <Settings size={20} />
                </div>
                <h2 className="text-xl font-semibold tracking-tight">Preferences</h2>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-black/5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-[#F8F9FA] rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-black/60">
                  <Moon size={16} />
                  <span>Sleep Schedule</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-black/40">Sleeps At</label>
                    <input 
                      type="time" 
                      value={settings.sleepStart}
                      onChange={(e) => setSettings(prev => ({ ...prev, sleepStart: e.target.value }))}
                      className="w-full bg-white border border-black/5 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-black/40">Wakes At</label>
                    <input 
                      type="time" 
                      value={settings.sleepEnd}
                      onChange={(e) => setSettings(prev => ({ ...prev, sleepEnd: e.target.value }))}
                      className="w-full bg-white border border-black/5 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 outline-none"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-black/40 leading-relaxed">
                  The AI Assistant will avoid scheduling any tasks during these hours to ensure you get your rest.
                </p>
              </div>

              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-full bg-black text-white py-4 rounded-2xl font-semibold hover:bg-black/80 transition-all shadow-lg shadow-black/10"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className={cn(
          "fixed bottom-8 right-8 w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-all z-50",
          isChatOpen ? "bg-white text-black border border-black/5" : "bg-black hover:scale-110"
        )}
      >
        {isChatOpen ? <X size={28} /> : <Sparkles size={28} />}
      </button>

      {/* Chat Popup */}
      {isChatOpen && (
        <div className="fixed bottom-28 right-8 w-[400px] h-[600px] z-50 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <Chat 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            isTyping={isTyping} 
          />
        </div>
      )}
    </div>
  );
}

function SidebarItem({ icon, active = false }: { icon: React.ReactNode; active?: boolean }) {
  return (
    <button className={cn(
      "p-3 rounded-xl transition-all",
      active ? "bg-black text-white shadow-lg shadow-black/10" : "text-black/40 hover:bg-black/5"
    )}>
      {icon}
    </button>
  );
}
