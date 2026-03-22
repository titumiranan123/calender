import React, { useState, useMemo, useEffect } from 'react';
import { format, startOfHour, addMinutes, isSameDay, startOfDay, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, areIntervalsOverlapping } from 'date-fns';
import { CalendarEvent } from '../types';
import { cn } from '../lib/utils';
import { Clock, ChevronLeft, ChevronRight, Trash2, GripVertical, Edit2 } from 'lucide-react';
import { DndContext, useDraggable, useDroppable, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { EditEventModal } from './EditEventModal';

interface CalendarProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onDeleteEvent: (id: string) => void;
  onUpdateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  onClearAll: () => void;
}

export const Calendar: React.FC<CalendarProps> = ({ 
  events, 
  selectedDate, 
  onDateChange, 
  onDeleteEvent,
  onUpdateEvent,
  onClearAll
}) => {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const eventId = active.id as string;
      const [dayTimestamp, hourStr] = (over.id as string).split('_');
      
      const targetDate = new Date(parseInt(dayTimestamp));
      targetDate.setHours(parseInt(hourStr));
      targetDate.setMinutes(0);
      targetDate.setSeconds(0);

      const calendarEvent = events.find(e => e.id === eventId);
      if (calendarEvent) {
        const duration = calendarEvent.endTime.getTime() - calendarEvent.startTime.getTime();
        onUpdateEvent(eventId, {
          startTime: targetDate,
          endTime: new Date(targetDate.getTime() + duration)
        });
      }
    }
  };

  const days = viewMode === 'day' 
    ? [selectedDate] 
    : eachDayOfInterval({
        start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
        end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
      });

  // Simple overlap detection for a day
  const getEventLayout = (dayEvents: CalendarEvent[]) => {
    const sorted = [...dayEvents].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    const layout = new Map<string, { width: string, left: string }>();
    
    sorted.forEach((event, i) => {
      let overlaps = 0;
      let position = 0;
      
      sorted.forEach((other, j) => {
        if (i === j) return;
        if (areIntervalsOverlapping(
          { start: event.startTime, end: event.endTime },
          { start: other.startTime, end: other.endTime }
        )) {
          overlaps++;
          if (j < i) position++;
        }
      });

      if (overlaps > 0) {
        const width = 100 / (overlaps + 1);
        layout.set(event.id, {
          width: `${width}%`,
          left: `${position * width}%`
        });
      } else {
        layout.set(event.id, { width: '100%', left: '0%' });
      }
    });
    return layout;
  };

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const renderCurrentTimeLine = (day: Date) => {
    if (!isSameDay(day, new Date())) return null;
    
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const top = (hours * 80) + (minutes / 60) * 80;

    return (
      <div 
        className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
        style={{ top: `${top}px` }}
      >
        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
        <div className="flex-1 h-[2px] bg-red-500" />
      </div>
    );
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden flex flex-col h-full">
        <div className="p-6 border-b border-black/5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {viewMode === 'day' 
                  ? format(selectedDate, 'EEEE, MMMM do')
                  : `${format(days[0], 'MMM d')} - ${format(days[6], 'MMM d, yyyy')}`
                }
              </h2>
              <p className="text-sm text-black/40 font-medium uppercase tracking-wider mt-1">
                {events.filter(e => days.some(d => isSameDay(e.startTime, d))).length} Tasks Scheduled
              </p>
            </div>
            
            <div className="flex bg-[#F3F4F6] p-1 rounded-xl">
              <button
                onClick={() => setViewMode('day')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  viewMode === 'day' ? "bg-white shadow-sm text-black" : "text-black/40 hover:text-black/60"
                )}
              >
                DAY
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  viewMode === 'week' ? "bg-white shadow-sm text-black" : "text-black/40 hover:text-black/60"
                )}
              >
                WEEK
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => onDateChange(viewMode === 'day' ? subDays(selectedDate, 1) : subDays(selectedDate, 7))}
              className="p-2 hover:bg-black/5 rounded-lg transition-colors text-black/60"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => onDateChange(new Date())}
              className="px-4 py-2 hover:bg-black/5 rounded-lg transition-colors text-sm font-semibold"
            >
              Today
            </button>
            <button 
              onClick={() => onDateChange(viewMode === 'day' ? addDays(selectedDate, 1) : addDays(selectedDate, 7))}
              className="p-2 hover:bg-black/5 rounded-lg transition-colors text-black/60"
            >
              <ChevronRight size={20} />
            </button>
            <div className="w-[1px] h-6 bg-black/5 mx-2" />
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to clear all events?')) {
                  onClearAll();
                }
              }}
              className="px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xs font-bold"
            >
              CLEAR ALL
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative p-6">
          <div className={cn(
            "relative grid min-h-[1920px]",
            viewMode === 'day' ? "grid-cols-[60px_1fr]" : "grid-cols-[60px_repeat(7,1fr)]"
          )}>
            {/* Hour labels */}
            <div className="flex flex-col">
              {hours.map(hour => (
                <div key={hour} className="h-20 text-xs font-mono text-black/30 pt-1 text-right pr-4">
                  {format(startOfHour(addMinutes(startOfDay(selectedDate), hour * 60)), 'h a')}
                </div>
              ))}
            </div>

            {/* Grid Columns */}
            {days.map((day, dayIdx) => {
              const dayEvents = events.filter(e => isSameDay(e.startTime, day));
              const layout = getEventLayout(dayEvents);

              return (
                <div key={day.toISOString()} className="relative border-l border-black/[0.05]">
                  {viewMode === 'week' && (
                    <div className="absolute -top-10 left-0 right-0 text-center">
                      <div className="text-[10px] font-bold text-black/30 uppercase">{format(day, 'EEE')}</div>
                      <div className={cn(
                        "text-sm font-semibold",
                        isSameDay(day, new Date()) ? "text-black" : "text-black/60"
                      )}>{format(day, 'd')}</div>
                    </div>
                  )}
                  
                  {hours.map(hour => (
                    <DroppableHour 
                      key={`${day.getTime()}_${hour}`} 
                      id={`${day.getTime()}_${hour}`}
                    />
                  ))}

                  {renderCurrentTimeLine(day)}
                  
                  {/* Events for this day */}
                  <div className="absolute inset-0 pointer-events-none">
                    {dayEvents.map(event => (
                      <DraggableEvent 
                        key={event.id} 
                        event={event} 
                        layout={layout.get(event.id)}
                        onDelete={() => onDeleteEvent(event.id)}
                        onEdit={() => setEditingEvent(event)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={(updates) => onUpdateEvent(editingEvent.id, updates)}
        />
      )}
    </DndContext>
  );
};

const DroppableHour: React.FC<{ id: string }> = ({ id }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "h-20 border-t border-black/[0.03] w-full transition-colors",
        isOver && "bg-black/[0.02]"
      )} 
    />
  );
};

const DraggableEvent: React.FC<{ 
  event: CalendarEvent, 
  onDelete: () => void,
  onEdit: () => void,
  layout?: { width: string, left: string }
}> = ({ event, onDelete, onEdit, layout }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
  });

  const startHour = event.startTime.getHours();
  const startMinutes = event.startTime.getMinutes();
  const duration = (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60);
  
  const top = (startHour * 80) + (startMinutes / 60) * 80;
  const height = (duration / 60) * 80;

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    top: `${top}px`,
    height: `${height}px`,
    width: layout?.width || '100%',
    left: layout?.left || '0%',
  } : {
    top: `${top}px`,
    height: `${height}px`,
    width: layout?.width || '100%',
    left: layout?.left || '0%',
  };

  const isBreak = event.title.toLowerCase().includes('break');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "absolute rounded-xl p-3 border shadow-sm transition-all cursor-pointer pointer-events-auto z-10 group overflow-hidden",
        isDragging && "opacity-50 scale-95 z-50 shadow-xl",
        isBreak ? "bg-slate-100 border-slate-200 text-slate-500 italic" :
        event.priority === 'high' ? "bg-red-500 border-red-600 text-white" :
        event.priority === 'medium' ? "bg-amber-400 border-amber-500 text-amber-950" :
        "bg-emerald-500 border-emerald-600 text-white"
      )}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing opacity-40 hover:opacity-100">
            <GripVertical size={14} />
          </div>
          <h3 className="text-sm font-bold leading-tight truncate">
            {event.title}
          </h3>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1 hover:bg-white/20 rounded"
          >
            <Edit2 size={14} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 hover:bg-white/20 rounded"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-1 opacity-80 text-[10px] font-medium">
        <Clock size={12} />
        <span>
          {format(event.startTime, 'h:mm a')} - {format(event.endTime, 'h:mm a')}
        </span>
      </div>
    </div>
  );
};
