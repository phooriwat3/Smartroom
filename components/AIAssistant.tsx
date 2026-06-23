import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Sparkles, X } from 'lucide-react';
import { ChatMessage, Booking, Room, BookingStatus } from '../types';
import { getGeminiSuggestion } from '../services/geminiService';
import { TRANSLATIONS, isRoomClosedAt } from '../translations';
import { db } from '../firebase';
import { setDoc, doc } from 'firebase/firestore';
import { BOOKING_START_HOUR, BOOKING_END_HOUR } from '../constants';

interface AIAssistantProps {
  currentBookings: Booking[];
  rooms: Room[];
  language: 'th' | 'en';
  onBookRoom: (room: Room, dateStr?: string, hours?: number[]) => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ currentBookings, rooms, language, onBookRoom }) => {
  const t = TRANSLATIONS[language];
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = language === 'th' ? [
    "มีห้องว่างตอนนี้บ้างไหม?",
    "ต้องการห้องสำหรับ 10 คนตอนบ่ายสอง",
    "ห้องประชุมไหนมีโปรเจคเตอร์บ้าง?",
    "วันนี้ห้องประชุมใหญ่มีจองช่วงไหนบ้าง?",
    "แนะนำห้องเงียบๆ สำหรับคุยงานส่วนตัวหน่อย"
  ] : [
    "Are there any rooms free now?",
    "I need a room for 10 people at 2:00 PM.",
    "Which meeting rooms have a projector?",
    "What is the schedule for the main room today?",
    "Recommend a quiet room for a private call."
  ];

  useEffect(() => {
    setMessages([
      { role: 'model', text: t.chatWelcomeMsg, timestamp: new Date() }
    ]);
    setFollowUps([]);
  }, [language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
        scrollToBottom();
    }
  }, [messages, isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setFollowUps([]);

    // Pass the rooms list & language context to Gemini Service
    const responseText = await getGeminiSuggestion(text, currentBookings, rooms, language);
    
    if (responseText.startsWith('__TOOL_CALL__:')) {
      const parts = responseText.split(':');
      const toolName = parts[1];
      const argsJson = responseText.substring('__TOOL_CALL__:'.length + toolName.length + 1);
      
      if (toolName === 'bookRoom') {
        try {
          const args = JSON.parse(argsJson);
          const { roomName, date, startTime, endTime, title, organizer, department, employeeId, deskNumber } = args;
          
          const targetRoom = rooms.find(r => r.name.toLowerCase() === roomName.toLowerCase() || r.id.toLowerCase() === roomName.toLowerCase());
          
          if (!targetRoom) {
            const errorMsg = language === 'th'
              ? `ขออภัยครับ ไม่พบห้องประชุมชื่อ "${roomName}" ในระบบ กรุณาระบุชื่อห้องประชุมให้ถูกต้อง`
              : `Sorry, I couldn't find a room named "${roomName}". Please specify a valid room name.`;
            setMessages(prev => [...prev, { role: 'model', text: errorMsg, timestamp: new Date() }]);
            setIsLoading(false);
            return;
          }
          
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          const timeRegex = /^\d{2}:\d{2}$/;
          if (!dateRegex.test(date) || !timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            const errorMsg = language === 'th'
              ? `รูปแบบข้อมูล วันที่ หรือ เวลา ไม่ถูกต้องสำหรับการจอง`
              : `Invalid date or time format for booking.`;
            setMessages(prev => [...prev, { role: 'model', text: errorMsg, timestamp: new Date() }]);
            setIsLoading(false);
            return;
          }
          
          const [y, m, dVal] = date.split('-').map(Number);
          const [sh, sm] = startTime.split(':').map(Number);
          const [eh, em] = endTime.split(':').map(Number);
          const start = new Date(y, m - 1, dVal, sh, sm);
          const end = new Date(y, m - 1, dVal, eh, em);
          
          const now = new Date();
          if (start < now) {
            const errorMsg = language === 'th'
              ? `ไม่สามารถจองห้องประชุมย้อนหลังหรือในอดีตได้ (เวลาที่เลือก: ${startTime} น. วันที่ ${date})`
              : `Cannot book a room in the past (Selected time: ${startTime} on ${date}).`;
            setMessages(prev => [...prev, { role: 'model', text: errorMsg, timestamp: new Date() }]);
            setIsLoading(false);
            return;
          }
          
          if (end <= start) {
            const errorMsg = language === 'th'
              ? `เวลาสิ้นสุดการจองต้องอยู่หลังเวลาเริ่มต้นการจอง`
              : `Booking end time must be after the start time.`;
            setMessages(prev => [...prev, { role: 'model', text: errorMsg, timestamp: new Date() }]);
            setIsLoading(false);
            return;
          }

          if (sm !== 0 || em !== 0) {
            const errorMsg = language === 'th'
              ? 'กรุณาเลือกเวลาเป็นรายชั่วโมงเต็ม เช่น 07:00, 08:00 หรือ 19:00'
              : 'Please choose full-hour booking times, such as 07:00, 08:00, or 19:00.';
            setMessages(prev => [...prev, { role: 'model', text: errorMsg, timestamp: new Date() }]);
            setIsLoading(false);
            return;
          }

          const startHour = parseInt(startTime.split(':')[0], 10);
          const endHour = parseInt(endTime.split(':')[0], 10);
          const bookingDayStart = new Date(start);
          bookingDayStart.setHours(BOOKING_START_HOUR, 0, 0, 0);
          const bookingDayEnd = new Date(start);
          bookingDayEnd.setHours(BOOKING_END_HOUR, 0, 0, 0);
          if (start < bookingDayStart || end > bookingDayEnd || end <= start) {
            const errorMsg = language === 'th'
              ? 'สามารถจองห้องได้เฉพาะเวลา 07:00 - 19:00 เท่านั้น กรุณาเลือกช่วงเวลาใหม่'
              : 'Rooms can only be booked between 07:00 and 19:00. Please choose a different time range.';
            setMessages(prev => [...prev, { role: 'model', text: errorMsg, timestamp: new Date() }]);
            setIsLoading(false);
            return;
          }

          const closedSlot = Array.from({ length: Math.max(0, endHour - startHour) }, (_, i) => startHour + i)
            .map(hour => ({ hour, closure: isRoomClosedAt(targetRoom, date, hour) }))
            .find(item => item.closure.closed);

          if (closedSlot) {
            const errorMsg = language === 'th'
              ? `ห้อง "${targetRoom.name}" ปิดใช้งานชั่วคราวในช่วง ${String(closedSlot.hour).padStart(2, '0')}:00 (${closedSlot.closure.reason || targetRoom.closureReason || 'ไม่มีการระบุสาเหตุ'})`
              : `Room "${targetRoom.name}" is temporarily disabled at ${String(closedSlot.hour).padStart(2, '0')}:00 (${closedSlot.closure.reason || targetRoom.closureReason || 'No reason specified'}).`;
            setMessages(prev => [...prev, { role: 'model', text: errorMsg, timestamp: new Date() }]);
            setIsLoading(false);
            return;
          }
          
          const isOverlapping = currentBookings.some(b => 
            b.roomId === targetRoom.id &&
            b.status !== BookingStatus.REJECTED &&
            b.startTime.getTime() < end.getTime() &&
            b.endTime.getTime() > start.getTime()
          );
          
          if (isOverlapping) {
            const errorMsg = language === 'th'
              ? `ห้อง "${targetRoom.name}" ถูกจองในช่วงเวลาดังกล่าวแล้ว (${startTime} - ${endTime} น.) กรุณาเลือกช่วงเวลาอื่น`
              : `Room "${targetRoom.name}" is already booked during this time slot (${startTime} - ${endTime}). Please choose another time.`;
            setMessages(prev => [...prev, { role: 'model', text: errorMsg, timestamp: new Date() }]);
            setIsLoading(false);
            return;
          }
          
          const selectedHours: number[] = [];
          for (let h = startHour; h < endHour; h++) {
            selectedHours.push(h);
          }

          // Call parent handler to open the room booking modal popup with details prefilled
          onBookRoom(targetRoom, date, selectedHours);
          
          // Minimize the AI Assistant chat window so the modal is clearly visible
          setIsOpen(false);
          
          const popupOpenedMsg = language === 'th'
            ? `📝 เปิดหน้าต่างระบุรายละเอียดการจองห้อง **${targetRoom.name}** เรียบร้อยแล้วครับ\n\n📅 **วันที่:** ${date}\n⏰ **เวลา:** ${startTime} - ${endTime} น.\n\nกรุณากรอกข้อมูลผู้ใช้งานเพิ่มเติมในหน้าต่างป๊อปอัพเพื่อทำการยืนยันการจองครับ`
            : `📝 Opened the booking details popup form for room **${targetRoom.name}**.\n\n📅 **Date:** ${date}\n⏰ **Time:** ${startTime} - ${endTime}\n\nPlease complete your details on the popup form to confirm your booking.`;
            
          setMessages(prev => [...prev, { role: 'model', text: popupOpenedMsg, timestamp: new Date() }]);
          
          const successFollowUps = language === 'th'
            ? ["แนะนำข้อมูลห้องนี้หน่อย", "ห้อง Meeting อื่นๆ มีว่างช่วงนี้ไหม?", "ขอบคุณมากครับ"]
            : ["Tell me more about this room", "Are there other rooms free now?", "Thank you"];
          setFollowUps(successFollowUps);
        } catch (err) {
          console.error("Failed to parse and trigger AI booking popup:", err);
          const errorMsg = language === 'th'
            ? `ขออภัยครับ เกิดข้อผิดพลาดในการเปิดหน้าต่างจองห้องประชุม (${err instanceof Error ? err.message : String(err)})`
            : `Sorry, an error occurred while opening the booking popup. (${err instanceof Error ? err.message : String(err)})`;
          setMessages(prev => [...prev, { role: 'model', text: errorMsg, timestamp: new Date() }]);
        }
        setIsLoading(false);
        return;
      }
    }
    
    // Parse the response for Suggestions block
    let cleanedText = responseText;
    let parsedFollowUps: string[] = [];
    
    const suggestionIndex = responseText.indexOf('[Suggestions]:');
    if (suggestionIndex !== -1) {
      cleanedText = responseText.substring(0, suggestionIndex).trim();
      const suggestionLine = responseText.substring(suggestionIndex + '[Suggestions]:'.length);
      parsedFollowUps = suggestionLine
        .split('|')
        .map(q => q.trim())
        .filter(q => q.length > 0);
    }
    
    const modelMsg: ChatMessage = { role: 'model', text: cleanedText, timestamp: new Date() };
    setMessages(prev => [...prev, modelMsg]);
    setFollowUps(parsedFollowUps);
    setIsLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const textToSend = input;
    setInput('');
    await sendMessage(textToSend);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    await sendMessage(suggestion);
  };

  const renderMessageContent = (text: string, isUser: boolean) => {
    return text.split('\n').map((line, lineIdx) => {
      const parts = [];
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;
      let lastIndex = 0;

      const parseFormattedText = (chunk: string) => {
        const chunkParts = [];
        const italicRegex = /\*(.*?)\*/g;
        let itMatch;
        let itLastIndex = 0;
        
        while ((itMatch = italicRegex.exec(chunk)) !== null) {
          if (itMatch.index > itLastIndex) {
            chunkParts.push(chunk.substring(itLastIndex, itMatch.index));
          }
          chunkParts.push(
            <em 
              key={`em-${itMatch.index}`} 
              className={isUser ? "italic not-italic font-normal opacity-85 text-white" : "italic not-italic font-normal text-slate-500"}
            >
              {itMatch[1]}
            </em>
          );
          itLastIndex = italicRegex.lastIndex;
        }
        if (itLastIndex < chunk.length) {
          chunkParts.push(chunk.substring(itLastIndex));
        }
        return chunkParts;
      };

      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(...parseFormattedText(line.substring(lastIndex, match.index)));
        }
        parts.push(
          <strong 
            key={`b-${match.index}`} 
            className={isUser ? "font-bold text-white" : "font-bold text-slate-900"}
          >
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < line.length) {
        parts.push(...parseFormattedText(line.substring(lastIndex)));
      }

      return (
        <div key={lineIdx} className={line.trim() === '' ? 'h-2' : 'min-h-[1.25rem]'}>
          {parts}
        </div>
      );
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg transition-all duration-300 z-40 ${
          isOpen ? 'bg-red-500 hover:bg-red-600 rotate-90' : 'bg-brand-500 hover:bg-brand-600'
        }`}
      >
        {isOpen ? <X className="text-white w-6 h-6" /> : <Sparkles className="text-white w-6 h-6 animate-pulse" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-205 z-40 flex flex-col overflow-hidden h-[500px] animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-gradient-to-r from-brand-500 to-brand-700 p-4 flex items-center text-white">
            <div className="bg-white/20 p-2 rounded-full mr-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">{t.smartAssistant}</h3>
              <p className="text-xs text-brand-100">{t.poweredByGemini}</p>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-brand-500 text-white rounded-br-none font-medium'
                      : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none font-medium'
                  }`}
                >
                  {renderMessageContent(msg.text, msg.role === 'user')}
                </div>
              </div>
            ))}
            {messages.filter(m => m.role === 'user').length === 0 && (
              <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <p className="text-xs font-semibold text-slate-400 px-1">
                  {language === 'th' ? '💡 คำถามที่พบบ่อย:' : '💡 Suggested Questions:'}
                </p>
                <div className="flex flex-col gap-2">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-xs text-left bg-white hover:bg-brand-50 text-slate-600 hover:text-brand-700 border border-slate-200 hover:border-brand-300 px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98] font-medium"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!isLoading && followUps.length > 0 && (
              <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <p className="text-xs font-semibold text-slate-400 px-1">
                  {language === 'th' ? '💡 ถามต่อ:' : '💡 Follow-up:'}
                </p>
                <div className="flex flex-col gap-2">
                  {followUps.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-xs text-left bg-white hover:bg-brand-50 text-slate-600 hover:text-brand-700 border border-slate-200 hover:border-brand-300 px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98] font-medium"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-slate-200 col-span-1">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={t.askForRoomPlaceholder}
                className="flex-grow px-4 py-2 rounded-full bg-slate-100 border-transparent focus:bg-white focus:border-brand-300 focus:ring-2 focus:ring-brand-100 text-sm outline-none transition-all font-medium"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="p-2 bg-brand-500 text-white rounded-full hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
