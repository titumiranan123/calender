import { GoogleGenAI, Type } from "@google/genai";
import { AIScheduleResponse, CalendarEvent, UserSettings } from "../types";

const getApiKey = () => {
  // In some environments, process.env might not be directly available on the client
  // but the platform might inject it. We check multiple common locations.
  return (
    (globalThis as any).process?.env?.GEMINI_API_KEY ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    ""
  );
};

export async function planSchedule(
  userInput: string,
  existingEvents: CalendarEvent[],
  currentDate: Date,
  settings: UserSettings
): Promise<AIScheduleResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      actions: [],
      explanation: "Gemini API key is missing. Please check your environment variables."
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const localTime = currentDate.toLocaleString();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  console.log('Planning schedule with:', { localTime, timeZone, userInput });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        User Local Time: ${localTime}
        User Timezone: ${timeZone}
        Sleep Schedule: ${settings.sleepStart} to ${settings.sleepEnd}
        Existing Events: ${JSON.stringify(existingEvents.map(e => ({
          id: e.id,
          title: e.title,
          start: e.startTime.toLocaleString(),
          end: e.endTime.toLocaleString(),
          priority: e.priority
        })))}
        User Request: ${userInput}
        
        You are a world-class AI Productivity Coach. Your task is to transform the user's request into a structured schedule.
        
        RULES:
        1. TIMEZONE: All times you return must be in the user's local time (${timeZone}). Use "YYYY-MM-DDTHH:mm:ss" format.
        2. SLEEP: NEVER schedule anything during the user's sleep time (${settings.sleepStart} to ${settings.sleepEnd}).
        3. TITLE: Keep titles extremely short (2-4 words). Example: "Gym Session", "Project Review". 
           - NEVER include time, priority, or descriptions in the title.
        4. DURATION: Estimate duration based on task type. 
           - Deep work: 60-90m. 
           - Admin/Quick: 15-30m.
        5. PRIORITY: 
           - 'high' (Red): Critical/Deadlines.
           - 'medium' (Yellow): Important.
           - 'low' (Green): Routine/Personal.
        6. BREAKS: Automatically insert 15m breaks between tasks.
        7. EXPLANATION: You MUST provide a helpful, encouraging explanation of the schedule you've created. This will be shown to the user in the chat.
        
        Return ONLY valid JSON.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            actions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ["ADD", "DELETE", "UPDATE", "CLEAR"] },
                  eventId: { type: Type.STRING },
                  eventData: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      durationMinutes: { type: Type.NUMBER },
                      priority: { type: Type.STRING, enum: ["low", "medium", "high"] },
                      suggestedTime: { type: Type.STRING }
                    },
                    required: ["title"]
                  }
                },
                required: ["type"]
              }
            },
            explanation: { type: Type.STRING }
          },
          required: ["actions", "explanation"]
        }
      }
    });

    console.log('AI raw response:', response);
    if (!response) throw new Error("No response from AI");
    
    const text = response.text;
    console.log('AI response text:', text);
    if (!text) throw new Error("Empty response from AI");
    
    const result = JSON.parse(text);
    
    // Ensure explanation is never empty
    if (!result.explanation) {
      result.explanation = "I've updated your schedule based on your request. Let me know if you'd like any adjustments!";
    }
    
    return result as AIScheduleResponse;
  } catch (error) {
    console.error("AI Service Error:", error);
    return {
      actions: [],
      explanation: "I'm sorry, I had trouble processing that. Could you try rephrasing your request?"
    };
  }
}
