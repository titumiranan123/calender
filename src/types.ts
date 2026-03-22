export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  priority: 'low' | 'medium' | 'high';
  category?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type AIActionType = 'ADD' | 'DELETE' | 'UPDATE' | 'CLEAR';

export interface AIAction {
  type: AIActionType;
  eventId?: string; // For DELETE or UPDATE
  eventData?: {
    title?: string;
    description?: string;
    durationMinutes?: number;
    priority?: 'low' | 'medium' | 'high';
    suggestedTime?: string;
  };
}

export interface UserSettings {
  sleepStart: string; // e.g., "23:30"
  sleepEnd: string;   // e.g., "06:00"
}

export interface AIScheduleResponse {
  actions: AIAction[];
  explanation: string;
}
