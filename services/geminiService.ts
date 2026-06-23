import { GoogleGenAI, Type } from "@google/genai";
import { Booking, Room } from "../types";

export const getGeminiSuggestion = async (
  userQuery: string,
  currentBookings: Booking[],
  rooms: Room[],
  language: 'th' | 'en'
): Promise<string> => {
  const apiKey = process.env.API_KEY || '';
  if (!apiKey) {
    return "API Key is missing. Please set the API_KEY environment variable.";
  }

  const ai = new GoogleGenAI({ apiKey });

  // Context construction using the dynamic rooms list passed to the function
  const roomDataStr = JSON.stringify(rooms.map(r => ({
    name: r.name,
    capacity: r.capacity,
    amenities: r.amenities.join(', '),
    type: r.type
  })));

  const formatDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = formatDateStr(new Date());

  const bookingDataStr = JSON.stringify(currentBookings.map(b => ({
    room: rooms.find(r => r.id === b.roomId)?.name || 'Unknown Room',
    date: formatDateStr(b.startTime),
    start: b.startTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    end: b.endTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    title: b.title,
    organizer: b.organizer,
    department: b.department
  })));

  const systemInstruction = `
    You are a smart office manager assistant for YAGEO SmartRoom Booking system.
    You help users find the best room for their meetings based on the available rooms and current schedule.
    
    Current Date: ${todayStr}
    Here is the list of rooms: ${roomDataStr}
    Here is the list of bookings: ${bookingDataStr}

    Core instructions:
    1. Recommend a room based on capacity requirements and equipment/amenities requested by the user.
    2. Check if a room is open and available based on the schedule of the requested day (default to today: ${todayStr}).
    3. Always be helpful, polite, and extremely concise.
    4. MUST respond strictly in the active language requested by the user interface: ${language === 'th' ? 'Thai (ภาษาไทย)' : 'English'}.
    5. When replying in Thai, use friendly, polite, and natural phrasing. Keep the tone professional, neat, and highly readable.
    6. At the very end of your response, you MUST generate exactly 3 relevant, brief, and highly contextual follow-up questions that the user might want to ask next. Format this section on a single new line exactly like this:
       [Suggestions]: Question 1 | Question 2 | Question 3
       Example:
       [Suggestions]: ห้อง Meeting 2 ว่างช่วงบ่ายโมงไหม? | สิ่งอำนวยความสะดวกในห้อง Training Room คืออะไร? | มีกฎการจองอย่างไร?
       Do not put any other text on that line. Keep the suggestions natural and matching the active language.
    7. Call the \`bookRoom\` function/tool ONLY when the user explicitly requests to book/reserve a room, or when they confirm a proposed booking slot (e.g., by saying "ยืนยัน", "confirm", "จองเลย", "จองให้หน่อย"). Do not call it when they are just asking for room availability or checking options. If they request or confirm a booking and details like organizer name, department, employee ID, or desk number are not specified, please supply standard defaults (organizer: 'ผู้ใช้งานทั่วไป (จองผ่าน AI)', department: 'IT', employeeId: '9999999', deskNumber: '9999') to the function parameters.
  `;

  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-3.5-flash"];
  let lastError: any = null;

  for (const modelName of models) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: userQuery,
        config: {
          systemInstruction: systemInstruction,
          tools: [{
            functionDeclarations: [{
              name: 'bookRoom',
              description: 'Call this function to execute/confirm booking of a meeting room on a specific date and time range.',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  roomName: { 
                    type: Type.STRING, 
                    description: 'The name of the room to book (e.g., Meeting 1, Meeting 2, Training Room)' 
                  },
                  date: { 
                    type: Type.STRING, 
                    description: 'The date of the booking in YYYY-MM-DD format.' 
                  },
                  startTime: { 
                    type: Type.STRING, 
                    description: 'The start time of the booking in HH:MM format.' 
                  },
                  endTime: { 
                    type: Type.STRING, 
                    description: 'The end time of the booking in HH:MM format.' 
                  },
                  title: { 
                    type: Type.STRING, 
                    description: 'A brief title or topic for the meeting.' 
                  },
                  organizer: { 
                    type: Type.STRING, 
                    description: 'The name of the organizer. Default to "ผู้ใช้งานทั่วไป (จองผ่าน AI)" if not specified.' 
                  },
                  department: { 
                    type: Type.STRING, 
                    description: 'The department booking the room. Default to "IT" if not specified.' 
                  },
                  employeeId: { 
                    type: Type.STRING, 
                    description: 'A 7-digit numeric employee ID. Default to "9999999" if not specified.' 
                  },
                  deskNumber: { 
                    type: Type.STRING, 
                    description: 'A 4-digit numeric desk number. Default to "9999" if not specified.' 
                  }
                },
                required: ['roomName', 'date', 'startTime', 'endTime', 'title', 'organizer', 'department', 'employeeId', 'deskNumber']
              }
            }]
          }]
        }
      });
      const functionCalls = response.functionCalls || [];
      if (functionCalls.length > 0) {
        const call = functionCalls[0];
        return `__TOOL_CALL__:${call.name}:${JSON.stringify(call.args)}`;
      }
      return response.text || "I couldn't generate a response.";
    } catch (error) {
      console.warn(`Model ${modelName} failed, trying fallback...`, error);
      lastError = error;
    }
  }

  const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
  return language === 'th' 
    ? `ขออภัยด้วยครับ ขณะนี้ระบบขัดข้องไม่สามารถเชื่อมต่อผู้ช่วยอัจฉริยะได้ชั่วคราว (${errMsg})` 
    : `Sorry, I'm having trouble connecting to the AI assistant right now. (${errMsg})`;
};
