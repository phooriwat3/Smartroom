import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Room, Booking, BookingStatus, RoomMaintenanceRecord } from '../types';
import {
  Users,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  Plus,
  FileText,
  Check,
  X,
  User,
  Lock,
  ShieldAlert,
  LayoutGrid,
  Building2,
  IdCard,
  AlertCircle,
  Trash2,
  CheckCircle
} from 'lucide-react';
import { TRANSLATIONS, formatTimeString, formatDate, translateText, isRoomClosedAt, isRoomClosedAllDay } from '../translations';
import { getBookingDepartmentClass } from '../bookingVisualStyles';
import CheckInValidationModal from './CheckInValidationModal';

import { BOOKABLE_HOURS, BOOKING_START_HOUR, BOOKING_END_HOUR, DEPARTMENTS } from '../constants';

interface DashboardProps {
  rooms: Room[];
  bookings: Booking[];
  maintenanceHistory?: RoomMaintenanceRecord[];
  language: 'th' | 'en';
  onDeleteBooking?: (id: string) => void;
  onConfirmBooking?: (bookingData: any) => Promise<boolean>;
  onUpdateBooking?: (id: string, updatedFields: Partial<Booking>) => Promise<boolean>;
  selectedRoomId: string;
  setSelectedRoomId: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  rooms,
  bookings,
  maintenanceHistory = [],
  language,
  onDeleteBooking,
  onConfirmBooking,
  onUpdateBooking,
  selectedRoomId,
  setSelectedRoomId
}) => {
  const t = TRANSLATIONS[language];
  const checkInWindowTooltip = language === 'th'
    ? 'Check in ได้ภายใน 15 นาทีก่อนหรือหลังเวลาเริ่มจอง เช่น หากเริ่มเวลา 15:00 น. สามารถ Check in ได้ตั้งแต่ 14:45 น. ถึง 15:15 น.'
    : 'Check in within 15 minutes before or after the booking start time. For example, if the booking starts at 3:00 PM, check-in is allowed from 2:45 PM to 3:15 PM.';

  // Live running clock state
  const [liveTime, setLiveTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Date selection state
  const [dateStr, setDateStr] = useState<string>(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 105));
    return localDate.toISOString().split('T')[0];
  });

  const selectedDateObj = useMemo(() => {
    return new Date(`${dateStr}T00:00:00`);
  }, [dateStr]);

  const isToday = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return dateStr === todayStr;
  }, [dateStr]);

  // Custom Calendar States & Logic
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => {
    const d = new Date();
    return d.getFullYear();
  });
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return d.getMonth();
  });

  useEffect(() => {
    if (isCalendarOpen && dateStr) {
      const parsed = new Date(`${dateStr}T00:00:00`);
      if (!isNaN(parsed.getTime())) {
        setCalendarYear(parsed.getFullYear());
        setCalendarMonth(parsed.getMonth());
      }
    }
  }, [dateStr, isCalendarOpen]);

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
    const lastDayOfMonth = new Date(calendarYear, calendarMonth + 1, 0);
    const numDays = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= numDays; d++) {
      days.push(new Date(calendarYear, calendarMonth, d));
    }
    return days;
  }, [calendarYear, calendarMonth]);

  // Inline Booking Form States:
  const [title, setTitle] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [department, setDepartment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [deskNumber, setDeskNumber] = useState('');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allRoomsSubView, setAllRoomsSubView] = useState<'cards' | 'matrix'>('cards');
  const [checkInBooking, setCheckInBooking] = useState<Booking | null>(null);

  // Load selected room details
  const selectedRoom = useMemo(() => {
    return rooms.find(r => r.id === selectedRoomId);
  }, [rooms, selectedRoomId]);

  // Reset selected roomId if the current room is not part of the filtered list
  useEffect(() => {
    if (selectedRoomId !== 'ALL' && !rooms.some(r => r.id === selectedRoomId)) {
      setSelectedRoomId('ALL');
    }
  }, [rooms, selectedRoomId]);

  // Clean form selection states on active room change
  useEffect(() => {
    setSelectedHours([]);
    setBookingError(null);
    setTitle('');
  }, [selectedRoomId, dateStr]);

  // Define bookable blocks: 07:00 - 19:00, with the last selectable block ending at 19:00.
  const hours = useMemo(() => BOOKABLE_HOURS, []);
  const timelineGridScrollRef = useRef<HTMLDivElement | null>(null);
  const currentTimelineHour = Math.min(Math.max(liveTime.getHours(), BOOKING_START_HOUR), BOOKING_END_HOUR - 1);

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (selectedRoomId !== 'ALL' || allRoomsSubView !== 'matrix' || !isToday) return;

    const currentHourIndex = hours.findIndex(hour => hour === currentTimelineHour);
    if (currentHourIndex < 0) return;

    window.requestAnimationFrame(() => {
      if (!timelineGridScrollRef.current) return;
      timelineGridScrollRef.current.scrollTo({
        left: currentHourIndex * 140,
        behavior: 'smooth'
      });
    });
  }, [allRoomsSubView, currentTimelineHour, hours, isToday, selectedRoomId]);

  const getMaintenanceAt = (room: Room, targetDateStr: string, hour?: number): { closed: boolean; reason?: string } => {
    const currentClosure = isRoomClosedAt(room, targetDateStr, hour, liveTime);
    if (currentClosure.closed) return currentClosure;
    if (targetDateStr >= getLocalDateString(liveTime)) return { closed: false };

    const combinedMaintenanceHistory = [
      ...(Array.isArray(room.maintenanceHistory) ? room.maintenanceHistory : []),
      ...maintenanceHistory
    ];

    const historicalRecord = combinedMaintenanceHistory.find(record => {
      if (record.roomId !== room.id) return false;
      if (targetDateStr < record.startDate || targetDateStr > record.endDate) return false;
      if (hour === undefined) return true;

      const startHour = record.startTime !== undefined ? record.startTime : 7;
      const endHour = record.endTime !== undefined ? record.endTime : BOOKING_END_HOUR;
      return hour >= startHour && hour < endHour;
    });

    if (!historicalRecord) return { closed: false };
    return { closed: true, reason: historicalRecord.reason };
  };

  const temporarilyDisabledLabel = language === 'th' ? 'ปิดใช้งานชั่วคราว' : 'Temporarily Disabled';

  const getDisabledReasonText = (reason?: string) => (
    translateText(reason || '', language) || (language === 'th' ? 'ปิดใช้งานชั่วคราว' : 'Temporarily Disabled')
  );

  const getDisabledTimePeriod = (startHour?: number, endHour?: number) => {
    const start = startHour !== undefined ? startHour : BOOKING_START_HOUR;
    const end = endHour !== undefined ? endHour : BOOKING_END_HOUR;
    return `${formatTimeValue(start, language)} - ${formatTimeValue(end, language)}`;
  };

  const getRoomTypeLabel = (type: string) => {
    if (type === 'Meeting') return t.meetingRoom;
    if (type === 'Reception') return t.receptionArea;
    if (type === 'Training') return t.trainingRoom;
    return type;
  };

  const translateAmenities = (amenities: string[] | undefined, lang: 'th' | 'en') => {
    if (!amenities) return [];
    return amenities.map(amenity => translateText(amenity, lang));
  };

  const formatTimeLocal = (d: Date | string, lang: 'th' | 'en') => {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    const hours = dateObj.getHours();
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    if (lang === 'th') {
      const h = hours.toString().padStart(2, '0');
      return `${h}:${minutes} น.`;
    } else {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    }
  };

  const formatTimeValue = (hour: number, lang: 'th' | 'en') => {
    if (lang === 'th') {
      const h = hour.toString().padStart(2, '0');
      return `${h}:00 น.`;
    } else {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:00 ${ampm}`;
    }
  };

  // Helper inside All-Room cards stats calculation
  const getAllBookingsForDate = useMemo(() => {
    return bookings.filter(b => {
      const bDate = new Date(b.startTime);
      const selDate = new Date(selectedDateObj);
      const isSameDate = bDate.getDate() === selDate.getDate() &&
        bDate.getMonth() === selDate.getMonth() &&
        bDate.getFullYear() === selDate.getFullYear();
      if (!isSameDate) return false;

      if (b.status === BookingStatus.REJECTED) return false;
      return true;
    });
  }, [bookings, selectedDateObj, liveTime]);

  const isNoCheckIn = (b: Booking) => {
    if (b.status === BookingStatus.NO_SHOW) return true;
    if (b.status !== BookingStatus.CONFIRMED || b.actualStartTime) return false;
    const cutoffTime = new Date(b.startTime.getTime() + 15 * 60 * 1000);
    return liveTime > cutoffTime;
  };

  const sortBookingsByCurrentPriority = (a: Booking, b: Booking) => {
    const nowTime = liveTime.getTime();
    const getSortBucket = (booking: Booking) => {
      const start = booking.startTime.getTime();
      const end = booking.endTime.getTime();
      if (start <= nowTime && end >= nowTime) return 0;
      if (start >= nowTime) return 1;
      return 2;
    };

    const bucketDiff = getSortBucket(a) - getSortBucket(b);
    if (bucketDiff !== 0) return bucketDiff;
    return a.startTime.getTime() - b.startTime.getTime();
  };

  const getRoomStateAtDateStr = (
    room: Room,
    todaysBookings: Booking[],
    isTodayFlag: boolean,
    nowTime: Date
  ) => {
    const roomBookings = todaysBookings.filter(b => b.roomId === room.id);
    const activeBooking = isTodayFlag ? roomBookings.find(b => {
      const start = new Date(b.startTime);
      const end = new Date(b.endTime);
      return nowTime >= start && nowTime <= end && b.status !== BookingStatus.REJECTED && !isNoCheckIn(b);
    }) : undefined;

    const pendingBooking = isTodayFlag ? roomBookings.find(b => {
      const start = new Date(b.startTime);
      const end = new Date(b.endTime);
      return nowTime >= start && nowTime <= end && b.status === BookingStatus.PENDING;
    }) : undefined;

    return {
      todaysBookings: roomBookings,
      isOccupied: !!activeBooking,
      isPending: !!pendingBooking,
      currentBooking: activeBooking || null
    };
  };

  const navigateDate = (days: number) => {
    const d = new Date(selectedDateObj);
    d.setDate(d.getDate() + days);

    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    setDateStr(localDate.toISOString().split('T')[0]);
  };

  const getCellStatus = (roomId: string, hour: number) => {
    const booking = getAllBookingsForDate.find(b => {
      if (b.roomId !== roomId) return false;
      const startH = new Date(b.startTime).getHours();
      const endH = new Date(b.endTime).getHours();
      return hour >= startH && hour < endH;
    });

    if (booking) return { status: 'occupied' as const, booking };
    return { status: 'free' as const, booking: null };
  };

  // Single Room Detail Sub-State Helpers
  const singleRoomBookings = useMemo(() => {
    return bookings.filter(b => {
      const bDate = new Date(b.startTime);
      const sDate = new Date(selectedDateObj);
      const isSameDate = b.roomId === selectedRoomId &&
        bDate.getDate() === sDate.getDate() &&
        bDate.getMonth() === sDate.getMonth() &&
        bDate.getFullYear() === sDate.getFullYear();
      if (!isSameDate) return false;

      if (b.status === BookingStatus.REJECTED) return false;
      return true;
    }).sort(sortBookingsByCurrentPriority);
  }, [bookings, selectedRoomId, selectedDateObj, liveTime]);

  const getSingleRoomSlotStatus = (hour: number) => {
    const booking = singleRoomBookings.find(b => {
      const startH = new Date(b.startTime).getHours();
      const endH = new Date(b.endTime).getHours();
      return hour >= startH && hour < endH;
    });

    if (booking) return { status: 'occupied' as const, booking };
    return { status: 'free' as const, booking: null };
  };

  const getSelectedRangesStr = (hoursList: number[]) => {
    if (hoursList.length === 0) return '';
    const sorted = [...hoursList].sort((a, b) => a - b);
    const groups: number[][] = [];

    let currentGroup: number[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (currentGroup.length === 0) {
        currentGroup.push(sorted[i]);
      } else if (sorted[i] === currentGroup[currentGroup.length - 1] + 1) {
        currentGroup.push(sorted[i]);
      } else {
        groups.push(currentGroup);
        currentGroup = [sorted[i]];
      }
    }
    if (currentGroup.length > 0) groups.push(currentGroup);

    return groups.map(g => {
      const startStr = g[0].toString().padStart(2, '0') + ':00';
      const endStr = (g[g.length - 1] + 1).toString().padStart(2, '0') + ':00';
      return language === 'th' ? `${startStr} - ${endStr} น.` : `${startStr} - ${endStr}`;
    }).join(', ');
  };

  const canCheckIn = (b: Booking) => {
    if (b.actualStartTime) return false;
    if (b.status !== BookingStatus.CONFIRMED) return false;
    const nowTime = new Date();
    const isToday = b.startTime.toDateString() === nowTime.toDateString();
    if (!isToday) return false;

    // Can check in 15 minutes early up to 15 minutes late
    const startCheckIn = new Date(b.startTime.getTime() - 15 * 60 * 1000);
    const cutoffCheckIn = new Date(b.startTime.getTime() + 15 * 60 * 1000);
    return nowTime >= startCheckIn && nowTime <= cutoffCheckIn;
  };

  const canCheckOut = (b: Booking) => {
    return !!b.actualStartTime && !b.actualEndTime;
  };

  const handleCheckIn = async (bookingId: string) => {
    if (!onUpdateBooking) return;
    const success = await onUpdateBooking(bookingId, {
      actualStartTime: new Date()
    });
    if (!success) {
      throw new Error('Check-in update failed');
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    if (!onUpdateBooking) return;
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const confirmMsg = language === 'th'
      ? 'คุณต้องการเช็คเอาท์และยกเลิกเวลาที่เหลือของห้องประชุมนี้ใช่หรือไม่?'
      : 'Are you sure you want to check out and release the remaining time for this room?';

    if (window.confirm(confirmMsg)) {
      try {
        const nowTime = new Date();

        // Calculate elapsed minutes since the scheduled start time
        const elapsedMinutes = (nowTime.getTime() - booking.startTime.getTime()) / (60 * 1000);
        let usedHours = Math.floor(elapsedMinutes / 60);
        const remainingMinutes = elapsedMinutes % 60;

        // If used more than 15 minutes of the current hour, it counts as a used hour
        if (remainingMinutes >= 15) {
          usedHours += 1;
        }

        // Cap usedHours between 0 and total scheduled hours
        const totalScheduledHours = Math.round((booking.endTime.getTime() - booking.startTime.getTime()) / (3600 * 1000));
        if (usedHours < 0) {
          usedHours = 0;
        } else if (usedHours > totalScheduledHours) {
          usedHours = totalScheduledHours;
        }

        const finalEndTime = new Date(booking.startTime);
        finalEndTime.setHours(finalEndTime.getHours() + usedHours);

        await onUpdateBooking(bookingId, {
          actualEndTime: nowTime,
          endTime: finalEndTime
        });
      } catch (err) {
        console.error("Checkout error:", err);
      }
    }
  };

  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onConfirmBooking || !selectedRoom) return;

    if (selectedHours.length === 0) {
      setBookingError(language === 'th' ? 'กรุณาเลือกช่วงเวลาบนตารางอย่างน้อย 1 ชั่วโมง' : 'Please select at least 1 hour block on the timeline grid.');
      return;
    }

    if (selectedHours.some(hour => !Number.isInteger(hour) || hour < BOOKING_START_HOUR || hour >= BOOKING_END_HOUR)) {
      setBookingError(language === 'th' ? 'สามารถจองห้องได้เฉพาะเวลา 07:00 - 19:00 เท่านั้น' : 'Rooms can only be booked between 07:00 and 19:00.');
      return;
    }

    if (!title.trim()) {
      setBookingError(language === 'th' ? 'กรุณากรอกหัวข้อการประชุม' : 'Please fill in the meeting title.');
      return;
    }

    if (!organizer.trim()) {
      setBookingError(language === 'th' ? 'กรุณากรอกชื่อผู้จอง' : 'Please fill in the organizer name.');
      return;
    }

    if (!employeeId.trim()) {
      setBookingError(language === 'th' ? 'กรุณากรอกรหัสพนักงาน' : 'Please fill in the employee ID.');
      return;
    }

    if (!/^\d{7}$/.test(employeeId.trim())) {
      setBookingError(language === 'th' ? 'กรุณากรอกรหัสพนักงานเป็นตัวเลข 7 หลัก' : 'Employee ID must be exactly 7 digits');
      return;
    }

    if (!department) {
      setBookingError(language === 'th' ? 'กรุณาเลือกแผนกผู้ใช้สิทธิ์' : 'Please select a department.');
      return;
    }

    if (!deskNumber.trim()) {
      setBookingError(language === 'th' ? 'กรุณากรอกเบอร์โต๊ะ' : 'Please enter the desk number.');
      return;
    }

    if (!/^\d{4}$/.test(deskNumber.trim())) {
      setBookingError(language === 'th' ? 'กรุณากรอกเบอร์โต๊ะเป็นตัวเลขสี่หลัก (4 ตัวเท่านั้น)' : 'Desk number must be exactly 4 digits.');
      return;
    }

    setBookingError(null);
    setIsSubmitting(true);

    try {
      const sorted = [...selectedHours].sort((a, b) => a - b);
      const startHour = sorted[0];
      const endHour = sorted[sorted.length - 1] + 1;

      const startTime = new Date(selectedDateObj);
      startTime.setHours(startHour, 0, 0, 0);

      const endTime = new Date(selectedDateObj);
      endTime.setHours(endHour, 0, 0, 0);

      const bookingData = {
        roomId: selectedRoom.id,
        roomName: selectedRoom.name,
        title: title.trim(),
        organizer: organizer.trim(),
        department,
        employeeId: employeeId.trim(),
        deskNumber: deskNumber.trim(),
        startTime,
        endTime,
        status: BookingStatus.CONFIRMED,
        createdAt: new Date()
      };

      const success = await onConfirmBooking(bookingData);
      if (success) {
        setSelectedHours([]);
        setTitle('');
        setOrganizer('');
        setEmployeeId('');
        setDepartment('');
        setDeskNumber('');
        setIsDetailsModalOpen(false);
        setBookingError(null);
      } else {
        setBookingError(language === 'th' ? 'ช่วงเวลานี้ถูกจองหมดแล้ว กรุณาเลือกช่วงเวลาอื่น' : 'The selected times are already booked. Please try different blocks.');
      }
    } catch (err: any) {
      setBookingError(err.message || 'Error occurred during booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReleaseAllBookings = async () => {
    if (!onConfirmBooking || !selectedRoom) return;
    if (window.confirm(language === 'th' ? `คุณต้องการยกเลิกการจองทั้งหมดของวันนี้ใช่หรือไม่?` : `Are you sure you want to release all bookings for today?`)) {
      setIsSubmitting(true);
      try {
        await onConfirmBooking(selectedRoom, {
          title: '',
          organizer: '',
          department: '',
          employeeId: '',
          date: dateStr,
          selectedHours: []
        });
        setSelectedHours([]);
        setBookingError(null);
      } catch (err: any) {
        setBookingError(err.message || 'Error releasing bookings');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [rooms]);

  const onBook = (room: Room, date: string, hours: number[]) => {
    setSelectedRoomId(room.id);
    setSelectedHours(hours);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {selectedRoomId !== 'ALL' && (
            <button
              type="button"
              id="back-to-all-rooms"
              onClick={() => setSelectedRoomId('ALL')}
              className="mr-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-brand-600 rounded-lg shadow-sm active:scale-[0.98] transition-all flex items-center text-xs font-bold"
            >
              <ChevronLeft className="w-4 h-4 mr-1 text-slate-500" />
              <span>{language === 'th' ? 'ย้อนกลับดูทุกห้อง' : 'Back to All Rooms'}</span>
            </button>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-bold text-slate-900">{t.scheduleDashboard}</h2>
              {/* Quick switch selector when viewing a single room */}
              {selectedRoomId !== 'ALL' && (
                <select
                  id="quick-room-switch"
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="ml-3 px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold text-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer transition-all"
                >
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-slate-500 text-sm font-semibold">
              {selectedRoomId === 'ALL' ? t.overviewAllRooms : `${t.detailedTimelineFor} ${selectedRoom?.name || ''}.`}
            </p>
          </div>
        </div>

        {/* Date Controls */}
        <div className="flex flex-col items-start md:items-end space-y-2 self-start md:self-auto shrink-0 select-none">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm relative">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap shrink-0">
              {language === 'th' ? 'วันที่ต้องการจอง:' : 'Booking Date:'}
            </span>
            <div className="relative">
              {/* Toggle Button */}
              <button
                type="button"
                id="booking-date-btn"
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className="flex items-center gap-2 pl-3 pr-3 py-1.5 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg text-sm font-bold text-brand-700 transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-brand-600" />
                <span>
                  {selectedDateObj.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <ChevronDown className={`w-4 h-4 text-brand-500 transition-transform duration-200 ${isCalendarOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Backdrop to close calendar when clicking outside */}
              {isCalendarOpen && (
                <div
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setIsCalendarOpen(false)}
                />
              )}

              {/* Custom Calendar Dropdown */}
              {isCalendarOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (calendarMonth === 0) {
                          setCalendarMonth(11);
                          setCalendarYear(y => y - 1);
                        } else {
                          setCalendarMonth(m => m - 1);
                        }
                      }}
                      className="p-1 hover:bg-slate-100 rounded-lg text-slate-650 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-extrabold text-slate-800">
                      {language === 'th'
                        ? `${['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'][calendarMonth]} ${calendarYear + 543}`
                        : `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][calendarMonth]} ${calendarYear}`
                      }
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (calendarMonth === 11) {
                          setCalendarMonth(0);
                          setCalendarYear(y => y + 1);
                        } else {
                          setCalendarMonth(m => m + 1);
                        }
                      }}
                      className="p-1 hover:bg-slate-100 rounded-lg text-slate-650 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Weekdays Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[11px] font-bold text-slate-400">
                    {(language === 'th' ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']).map((day, idx) => (
                      <div key={idx} className="py-1">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {calendarDays.map((day, idx) => {
                      if (!day) {
                        return <div key={`empty-${idx}`} />;
                      }

                      const isSelected =
                        day.getDate() === selectedDateObj.getDate() &&
                        day.getMonth() === selectedDateObj.getMonth() &&
                        day.getFullYear() === selectedDateObj.getFullYear();

                      const today = new Date();
                      const isTodayDay =
                        day.getDate() === today.getDate() &&
                        day.getMonth() === today.getMonth() &&
                        day.getFullYear() === today.getFullYear();

                      return (
                        <button
                          key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const y = day.getFullYear();
                            const m = String(day.getMonth() + 1).padStart(2, '0');
                            const d = String(day.getDate()).padStart(2, '0');
                            setDateStr(`${y}-${m}-${d}`);
                            setIsCalendarOpen(false);
                          }}
                          className={`py-1 text-xs font-semibold rounded-lg transition-all active:scale-95 ${isSelected
                            ? 'bg-brand-500 text-white font-bold animate-in fade-in duration-100'
                            : isTodayDay
                              ? 'bg-slate-100 text-brand-600 font-bold border border-brand-200'
                              : 'hover:bg-slate-100 text-slate-700'
                            }`}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="text-[11px] font-bold text-slate-500 flex items-center space-x-1.5 bg-slate-50 border border-slate-200/60 rounded-lg py-1 px-2.5 w-full md:w-auto justify-center shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span>
              {language === 'th' ? 'เวลาปัจจุบัน:' : 'Current Time:'} <span className="font-mono font-extrabold text-slate-700 text-xs tracking-wider">{liveTime.toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US', { hour12: false })}</span> {language === 'th' ? 'น.' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* VIEW: ALL ROOMS MATRIX & EXTENSIONS */}
      {selectedRoomId === 'ALL' && (
        <div className="space-y-6">
          {/* Subview Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setAllRoomsSubView('cards')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${allRoomsSubView === 'cards'
                  ? 'bg-white text-brand-605 shadow-sm font-bold text-brand-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{t.statusCards}</span>
              </button>
              <button
                type="button"
                onClick={() => setAllRoomsSubView('matrix')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${allRoomsSubView === 'matrix'
                  ? 'bg-white text-brand-605 shadow-sm font-bold text-brand-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{t.timelineGrid}</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 font-semibold">
              {t.schedulesFor} {formatDate(selectedDateObj, language, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          {/* Subview 1: Status Cards */}
          {allRoomsSubView === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {sortedRooms.map(room => {
                const roomStats = getRoomStateAtDateStr(room, getAllBookingsForDate, isToday, liveTime);

                const isClosedAllDayCheck = isRoomClosedAllDay(room, dateStr, liveTime);
                const isClosedAllDay = isClosedAllDayCheck.closed;

                const closureCheckDay = getMaintenanceAt(room, dateStr);
                const hasDisabledPeriod = isClosedAllDay || closureCheckDay.closed;

                const currentClosureCheck = getMaintenanceAt(room, dateStr, liveTime.getHours());
                const isClosedBadge = isToday && (isClosedAllDay || currentClosureCheck.closed);
                const currentClosureReason = isClosedAllDay ? isClosedAllDayCheck.reason : closureCheckDay.reason;

                const maintStartTime = new Date(selectedDateObj);
                maintStartTime.setHours(room.closureStartTime !== undefined ? room.closureStartTime : BOOKING_START_HOUR, 0, 0, 0);
                const maintEndTime = new Date(selectedDateObj);
                maintEndTime.setHours(room.closureEndTime !== undefined ? room.closureEndTime : BOOKING_END_HOUR, 0, 0, 0);

                const sortedItineraryItems = [
                  ...roomStats.todaysBookings.map(b => ({ type: 'booking' as const, data: b, time: b.startTime.getTime() })),
                  ...(hasDisabledPeriod ? [{
                    type: 'maintenance' as const,
                    title: getDisabledReasonText(currentClosureReason || room.closureReason),
                    startTime: maintStartTime,
                    endTime: maintEndTime,
                    startHour: room.closureStartTime,
                    endHour: room.closureEndTime,
                    time: maintStartTime.getTime()
                  }] : [])
                ].sort((a, b) => a.time - b.time);

                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col h-[460px] text-slate-800 cursor-pointer hover:border-brand-300 hover:scale-[1.01]"
                  >
                    <div
                      className="relative h-32 overflow-hidden flex-shrink-0 z-0"
                    >
                      {room.imageUrl ? (
                        <>
                          <img
                            src={room.imageUrl}
                            alt={room.name}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105 -z-20"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent -z-10"></div>
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-brand-600 -z-10"></div>
                      )}

                      <div className="absolute top-3 left-3 flex items-center space-x-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white font-bold">
                        <Users className="w-3 h-3 text-white" />
                        <span>{room.capacity} {t.ppl}</span>
                      </div>

                      {isClosedBadge ? (
                        <div className="absolute top-3 right-3 bg-slate-500 text-white font-bold text-[9px] px-2 py-0.5 rounded-full shadow-md flex items-center z-10">
                          <span className="w-1.5 h-1.5 rounded-full bg-white mr-1"></span>
                          <span>{temporarilyDisabledLabel}</span>
                        </div>
                      ) : (
                        <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm text-white ${!roomStats.isOccupied
                          ? 'bg-emerald-500'
                          : roomStats.isPending
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                          }`}>
                          {!roomStats.isOccupied
                            ? t.availableNow
                            : roomStats.isPending
                              ? t.pending
                              : t.occupiedNow}
                        </div>
                      )}

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <h3 className="font-bold text-base leading-tight truncate">{room.name}</h3>
                        <p className="text-[10px] text-white/80 font-medium">{getRoomTypeLabel(room.type)}</p>
                      </div>
                    </div>

                    {/* Amenities & Dynamic Details */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between overflow-hidden">
                      <div>
                        {/* Key-Value details */}
                        {room.amenities && room.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3.5">
                            {translateAmenities(room.amenities, language).slice(0, 3).map((amenity, index) => (
                              <span
                                key={index}
                                className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-500 font-bold"
                              >
                                {amenity}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Daily Itinerary / Scrollable Timeline */}
                        <div className="space-y-2">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            {t.scheduleToday}
                          </div>

                          {sortedItineraryItems.length === 0 ? (
                            <div className="py-4 text-center text-[11px] text-slate-400 italic font-medium">
                              {t.noBookingsToday}
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                              {sortedItineraryItems.map(item => {
                                if (item.type === 'maintenance') {
                                  return (
                                    <div key="maint" className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-start">
                                      <div className="flex justify-between items-start mb-0.5">
                                        <div className="font-bold text-slate-700 text-[11px] truncate flex items-center">
                                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mr-1.5"></span>
                                          {temporarilyDisabledLabel}
                                        </div>
                                        <span className="text-[9px] font-mono text-slate-500 font-bold whitespace-nowrap">
                                          {getDisabledTimePeriod(item.startHour, item.endHour)}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-600 font-semibold italic truncate" title={item.title}>
                                        {item.title}
                                      </div>
                                    </div>
                                  );
                                }
                                const b = item.data;
                                const noCheckIn = isNoCheckIn(b);
                                return (
                                  <div key={b.id} className={`p-2 rounded-lg border text-[11px] transition-colors ${getBookingDepartmentClass(b.department)} ${noCheckIn ? 'bg-rose-50 border-rose-200' : b.id === roomStats.currentBooking?.id
                                    ? 'bg-orange-50 border-orange-300'
                                    : 'bg-orange-50 border-orange-200 hover:border-orange-300'
                                    }`}>
                                    <div className="flex justify-between items-start mb-0.5">
                                      <span className="font-bold text-slate-800 truncate max-w-[130px]">
                                        {translateText(b.title, language)}
                                      </span>
                                      <span className="text-[9px] font-mono text-slate-500 font-bold whitespace-nowrap">
                                        {formatTimeLocal(b.startTime, language)} - {formatTimeLocal(b.endTime, language)}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                                      <div className="flex items-center">
                                        <User className="w-2.5 h-2.5 mr-1 text-slate-400" />
                                        <span>{b.organizer}</span>
                                      </div>
                                      {noCheckIn ? (
                                        <span title={checkInWindowTooltip} className="text-[9px] bg-rose-100 border border-rose-200 text-rose-700 px-1.5 py-0.5 rounded font-bold">{language === 'th' ? 'ไม่มา Check-in' : 'No Check-in'}</span>
                                      ) : b.actualStartTime ? (
                                        b.actualEndTime ? (
                                          <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold">{language === 'th' ? 'เช็คเอาท์แล้ว' : 'Checked out'}</span>
                                        ) : (
                                          <span title={checkInWindowTooltip} className="text-[9px] bg-blue-50 border border-blue-200 text-blue-700 px-1.5 py-0.5 rounded font-bold animate-pulse">{language === 'th' ? 'กำลังใช้งาน' : 'Room In Use'}</span>
                                        )
                                      ) : b.status === BookingStatus.PENDING ? (
                                        <span className="text-[9px] bg-amber-50 border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded font-bold">{t.pendingApproval}</span>
                                      ) : (
                                        <span className="text-[9px] bg-emerald-50 border border-emerald-250/60 text-emerald-700 px-1.5 py-0.5 rounded font-bold">{t.confirmed}</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Booking Action Footer */}
                      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center flex-shrink-0 mt-3.5 -mx-3.5 -mb-3.5">
                        <button
                          type="button"
                          disabled={isClosedAllDay}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRoomId(room.id);
                          }}
                          className={`flex-1 py-1.5 font-bold text-[11px] rounded-lg flex items-center justify-center space-x-1 transition-all ${isClosedAllDay
                            ? 'bg-slate-150 border border-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm hover:shadow active:scale-[0.98]'
                            }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{t.bookRoom}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Subview 2: Timeline Grid Heatmap */}
          {allRoomsSubView === 'matrix' && (
            <div className="bg-white rounded-xl shadow-sm border border-cyan-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div ref={timelineGridScrollRef} className="overflow-x-auto border-b border-cyan-100">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-cyan-50 via-sky-50 to-blue-50 border-b border-cyan-100">
                      <th className="px-4 py-4 text-left font-bold text-sky-900 w-44 sticky left-0 bg-cyan-50 z-10 shadow-sm md:shadow-none border-r border-cyan-100">{language === 'th' ? 'ห้อง' : 'Type of Room'}</th>
                      <th className="px-3 py-4 text-left font-bold text-sky-800 w-36 border-r border-cyan-100 bg-sky-50">{language === 'th' ? 'รายการ' : 'Description'}</th>
                      {hours.map(h => (
                        <th key={h} className="px-2 py-3 text-center font-mono text-xs text-sky-700 min-w-[140px] font-bold">
                          {formatTimeValue(h, language)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {sortedRooms.map(room => {
                      const row1Cells = hours.map(hour => {
                        const { status, booking } = getCellStatus(room.id, hour);
                        const isPastDay = new Date(selectedDateObj).setHours(0, 0, 0, 0) < new Date(liveTime).setHours(0, 0, 0, 0);
                        const isTodayDate = new Date(selectedDateObj).toDateString() === liveTime.toDateString();
                        const isPast = isPastDay || (isTodayDate && (hour < liveTime.getHours() || (hour === liveTime.getHours() && liveTime.getMinutes() >= 15)));
                        const isPending = booking?.status === BookingStatus.PENDING;
                        const isNoCheckInStatus = booking ? isNoCheckIn(booking) : false;
                        const closureCheck = getMaintenanceAt(room, dateStr, hour);
                        const isClosedHour = closureCheck.closed;

                        return {
                          hour,
                          status,
                          booking,
                          isPast,
                          isPending,
                          isNoCheckInStatus,
                          isClosedHour,
                          closureCheck
                        };
                      });

                      return (
                        <React.Fragment key={room.id}>
                          {/* ROW 1: Reserved Person */}
                          <tr className="hover:bg-emerald-50/20">
                            {/* Room details cell - rowSpan={2} */}
                            <td rowSpan={2} className="px-4 py-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-cyan-100 shadow-[2px_0_8px_rgba(14,165,233,0.08)] align-middle">
                              <div className="flex items-center">
                                <div className={`w-2.5 h-2.5 rounded-full mr-2 shrink-0 ${room.id === 'm1' || room.id === 'm2' ? 'bg-indigo-400' : room.id.startsWith('r') ? 'bg-pink-400' : 'bg-teal-400'}`}></div>
                                <span className="truncate text-sm font-bold text-slate-800">{room.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 pl-4.5 font-bold mt-0.5 whitespace-nowrap">
                                {room.capacity} {t.ppl} • {getRoomTypeLabel(room.type)}
                              </div>
                            </td>

                            {/* Description Category for Row 1 */}
                            <td className="px-3 py-2.5 text-xs font-bold text-sky-700 bg-cyan-50/60 border-r border-cyan-100 whitespace-nowrap align-middle">
                              {language === 'th' ? 'ผู้จอง (Reserved)' : 'Reserved person'}
                            </td>

                            {/* Hour Cells for Row 1 */}
                            {row1Cells.map(({ hour, status, booking, isPast, isPending, isNoCheckInStatus, isClosedHour, closureCheck }) => {
                              return (
                                <td key={hour} className="px-1 py-1 relative h-11 border-r border-cyan-50 min-w-[140px]">
                                  <div className={`w-full h-full rounded-md flex items-center justify-center text-[10.5px] transition-all border px-2 font-semibold ${status === 'occupied' && booking ? getBookingDepartmentClass(booking.department) : ''}
                                      ${status === 'occupied'
                                      ? isNoCheckInStatus
                                        ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold'
                                        : isPending
                                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                                          : 'bg-orange-100 border-orange-300 text-orange-950'
                                      : isClosedHour
                                        ? 'bg-slate-100 border-slate-300 text-slate-700 font-semibold'
                                        : isPast
                                          ? 'bg-slate-100 border-slate-200 text-slate-400 font-medium'
                                          : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 hover:text-emerald-950 cursor-pointer shadow-sm hover:scale-[1.01] transition-all duration-200'
                                    }`}
                                    onClick={() => {
                                      if (status !== 'occupied' && !isPast && !isClosedHour && onBook) {
                                        onBook(room, dateStr, [hour]);
                                      }
                                    }}
                                    title={status === 'occupied' && booking
                                      ? `${translateText(booking.title, language)} (${booking.organizer} - ${booking.department}) [${formatTimeValue(booking.startTime.getHours(), language)} - ${formatTimeValue(booking.endTime.getHours(), language)}]`
                                      : isClosedHour
                                        ? `${temporarilyDisabledLabel}: ${getDisabledReasonText(closureCheck.reason)}`
                                        : (language === 'th' ? 'ห้องว่าง' : 'Available')
                                    }
                                  >
                                    {status === 'occupied' && booking ? (
                                      <span className="block w-full truncate text-center font-bold">
                                        {isNoCheckInStatus ? (
                                          language === 'th' ? 'ไม่มา Check-in' : 'No Check-in'
                                        ) : (
                                          <>{booking.organizer} <span className="text-[9px] px-1 bg-white/65 text-slate-700 rounded-sm font-semibold">{booking.deskNumber}</span></>
                                        )}
                                      </span>
                                    ) : isClosedHour ? (
                                      <span className="block w-full truncate text-center text-[9px] font-bold text-slate-700">
                                        {temporarilyDisabledLabel}
                                      </span>
                                    ) : isPast && status !== 'occupied' ? (
                                      <span className="opacity-30">-</span>
                                    ) : (
                                      <span className="text-[9.5px] text-emerald-600/70">{language === 'th' ? 'ว่าง' : 'Available'}</span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>

                          {/* ROW 2: Purpose */}
                          <tr className="hover:bg-emerald-50/20 border-b border-cyan-100">
                            {/* Description Category for Row 2 */}
                            <td className="px-3 py-2 text-xs font-bold text-sky-600 bg-sky-50/60 border-r border-cyan-100 whitespace-nowrap align-middle">
                              {language === 'th' ? 'วัตถุประสงค์ (Purpose)' : 'Purpose'}
                            </td>

                            {/* Hour Cells for Row 2 */}
                            {row1Cells.map(({ hour, status, booking, isPast, isPending, isNoCheckInStatus, isClosedHour, closureCheck }) => {
                              return (
                                <td key={hour} className="px-1 py-1 relative h-9 border-r border-cyan-50 min-w-[140px]">
                                  <div className={`w-full h-full rounded-md flex items-center justify-center text-[10px] transition-all border px-2 ${status === 'occupied' && booking ? getBookingDepartmentClass(booking.department) : ''}
                                      ${status === 'occupied'
                                      ? isNoCheckInStatus
                                        ? 'bg-rose-50 border-rose-200 text-rose-700 font-semibold'
                                        : isPending
                                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                                          : 'bg-orange-100 border-orange-300 text-orange-950 font-medium'
                                      : isClosedHour
                                        ? 'bg-slate-50 border-slate-200 text-slate-700'
                                        : isPast
                                          ? 'bg-slate-100 border-slate-200 text-slate-450'
                                          : 'bg-white border-dashed border-emerald-200 text-emerald-500 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer'
                                    }`}
                                    onClick={() => {
                                      if (status !== 'occupied' && !isPast && !isClosedHour && onBook) {
                                        onBook(room, dateStr, [hour]);
                                      }
                                    }}
                                  >
                                    {status === 'occupied' && booking ? (
                                      <span className="block w-full truncate text-center text-slate-700 font-semibold italic">
                                        {isNoCheckInStatus ? (language === 'th' ? 'ไม่มา Check-in' : 'No Check-in') : (translateText(booking.title, language) || (language === 'th' ? 'การประชุม' : 'Meeting'))}
                                      </span>
                                    ) : isClosedHour ? (
                                      <span className="block w-full truncate text-center text-[9px] font-semibold text-slate-600" title={getDisabledReasonText(closureCheck.reason)}>
                                        {getDisabledReasonText(closureCheck.reason)}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] text-slate-300">-</span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-cyan-100 bg-gradient-to-r from-cyan-50 via-white to-blue-50 flex flex-wrap items-center justify-end gap-x-6 gap-y-2 text-xs text-slate-600 font-semibold rounded-b-xl">
                <div className="flex items-center"><div className="w-3 h-3 bg-emerald-50 border border-emerald-300 rounded mr-1.5 font-bold"></div> {t.free}</div>
                <div className="flex items-center"><div className="w-3 h-3 bg-gradient-to-r from-orange-300 to-yellow-200 border border-orange-400 rounded mr-1.5 font-bold text-orange-900"></div> {language === 'th' ? 'ยืนยันจอง' : 'Confirmed'}</div>
                <div className="flex items-center"><div className="w-3 h-3 bg-amber-100 border border-amber-300 rounded mr-1.5 font-bold text-amber-900"></div> {t.pending}</div>
                <div className="flex items-center"><div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded mr-1.5 font-bold"></div> {language === 'th' ? 'หมดเวลาจอง' : 'Passed'}</div>
                <div className="flex items-center"><div className="w-3 h-3 bg-slate-100 border border-slate-300 rounded mr-1.5"></div> {temporarilyDisabledLabel}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: SINGLE ROOM DETAIL */}
      {selectedRoomId !== 'ALL' && selectedRoom && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">

          {/* Left Col: Timeline Visual */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-cyan-100 p-6 overflow-x-auto text-slate-800">
            <div className="flex items-center justify-between mb-6 min-w-[600px]">
              <h3 className="font-bold text-slate-850 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-cyan-500" />
                {t.timelineGrid} ({formatDate(selectedDateObj, language, { weekday: 'short', month: 'short', day: 'numeric' })})
              </h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold">
                <div className="flex items-center"><div className="w-3.5 h-3.5 bg-emerald-50 border border-emerald-300 rounded mr-1"></div> {t.free}</div>
                <div className="flex items-center"><div className="w-3.5 h-3.5 bg-brand-500 border border-brand-600 rounded mr-1"></div> {language === 'th' ? 'เลือกกำลังจอง' : 'Selected (To Book)'}</div>
                <div className="flex items-center"><div className="w-3.5 h-3.5 bg-gradient-to-r from-orange-300 to-yellow-200 border border-orange-400 rounded mr-1"></div> {t.booked}</div>
                <div className="flex items-center"><div className="w-3.5 h-3.5 bg-slate-100 border border-slate-205 rounded mr-1"></div> {language === 'th' ? 'หมดเวลาจอง' : 'Passed'}</div>
                <div className="flex items-center"><div className="w-3.5 h-3.5 bg-slate-100 border border-slate-300 rounded mr-1"></div> {temporarilyDisabledLabel}</div>
              </div>
            </div>

            <div className="space-y-1.5 min-w-[600px]">
              {hours.map(hour => {
                const { status, booking } = getSingleRoomSlotStatus(hour);
                const closureCheck = getMaintenanceAt(selectedRoom, dateStr, hour);
                const isClosedHour = closureCheck.closed;

                // Calculate specific slot end time for past/future logic
                const slotEnd = new Date(selectedDateObj);
                slotEnd.setHours(hour + 1, 0, 0, 0);

                const isPastDay = new Date(selectedDateObj).setHours(0, 0, 0, 0) < new Date(liveTime).setHours(0, 0, 0, 0);
                const isTodayDate = new Date(selectedDateObj).toDateString() === liveTime.toDateString();
                const isPast = isPastDay || (isTodayDate && (hour < liveTime.getHours() || (hour === liveTime.getHours() && liveTime.getMinutes() >= 15)));
                const isCurrentHour = isToday && hour === liveTime.getHours();
                const isPending = booking?.status === BookingStatus.PENDING;
                const isNoCheckInStatus = booking ? isNoCheckIn(booking) : false;
                const isSelected = selectedHours.includes(hour);

                return (
                  <div key={hour} className="flex items-center group">
                    <div className="w-20 text-right text-xs font-mono text-slate-400 pr-4 py-3 font-bold">
                      {formatTimeValue(hour, language)}
                    </div>
                    <div className="flex-grow relative h-10">
                      <div
                        onClick={() => {
                          if (!isPast && !isClosedHour && status !== 'occupied') {
                            setSelectedHours(prev => {
                              if (prev.includes(hour)) {
                                return prev.filter(h => h !== hour).sort((a, b) => a - b);
                              } else {
                                return [...prev, hour].sort((a, b) => a - b);
                              }
                            });
                          }
                        }}
                        className={`absolute inset-0 rounded-lg border flex items-center px-4 transition-all duration-200 ${status === 'occupied' && booking ? getBookingDepartmentClass(booking.department) : ''}
                          ${status === 'occupied'
                            ? isNoCheckInStatus
                              ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold cursor-not-allowed'
                              : isPending
                                ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold cursor-not-allowed'
                                : 'bg-orange-100 border-orange-300 text-orange-950 font-bold cursor-not-allowed'
                            : isClosedHour
                              ? 'bg-slate-100 border-slate-300 text-slate-700 font-semibold cursor-not-allowed'
                              : isSelected
                                ? 'bg-brand-500 border-brand-600 text-white font-bold cursor-pointer hover:bg-brand-600 hover:scale-[1.01] shadow-sm active:scale-[0.99] transition-all'
                                : isPast
                                  ? 'bg-slate-100 border-slate-205 text-slate-400 opacity-70 font-medium cursor-not-allowed'
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 hover:text-emerald-950 font-bold cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all shadow-sm'
                          }`}
                        title={status === 'occupied'
                          ? (language === 'th' ? "ช่วงเวลานี้ถูกจองแล้ว (ติดต่อ Admin เพื่อยกเลิก)" : "Already booked (contact Admin to cancel)")
                          : isClosedHour
                            ? `${temporarilyDisabledLabel}: ${getDisabledReasonText(closureCheck.reason)}`
                            : isPast
                              ? (language === 'th' ? "ชั่วโมงนี้ผ่านมาแล้ว" : "Passed time")
                              : isSelected
                                ? (language === 'th' ? "เลือกแล้ว คลิกซ้ำเพื่อยกเลิก" : "Selected, click again to remove")
                                : (language === 'th' ? "คลิกเพื่อจองชั่วโมงนี้" : "Available, click to select")
                        }
                      >
                        {status === 'occupied' ? (
                          <div className="flex justify-between w-full items-center">
                            <span className="text-sm font-bold truncate">
                              {isNoCheckInStatus ? (language === 'th' ? 'ไม่มา Check-in' : 'No Check-in') : (booking?.title ? translateText(booking.title, language) : '')}
                              {isPending && <span className="ml-2 text-[10px] uppercase font-bold tracking-wider opacity-75">({t.pending})</span>}
                            </span>
                            <span className="text-xs opacity-75 hidden sm:block font-bold">
                              {booking?.organizer} {booking?.department ? `(${booking.department})` : ''}
                            </span>
                          </div>
                        ) : isClosedHour ? (
                          <span className="text-xs font-bold text-slate-700 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mr-2 flex-shrink-0"></span>
                            {temporarilyDisabledLabel}: {getDisabledReasonText(closureCheck.reason)}
                          </span>
                        ) : isSelected ? (
                          <div className="flex justify-between w-full items-center">
                            <span className="text-xs font-bold flex items-center">
                              <CheckCircle className="w-4 h-4 mr-2 text-white" />
                              {title ? title : (language === 'th' ? 'กำลังทำจองชั่วโมงนี้' : 'Selected Selection')}
                            </span>
                            <span className="text-[10px] uppercase font-mono bg-white/20 px-2 py-0.5 rounded text-white font-bold">
                              {language === 'th' ? 'เลือกแล้ว (จอง)' : 'Selected'}
                            </span>
                          </div>
                        ) : isPast ? (
                          <span className="text-xs font-semibold text-slate-400 italic">{language === 'th' ? 'หมดเวลาจอง' : 'Past booking time'}</span>
                        ) : (
                          <span className="text-xs font-bold flex items-center text-emerald-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                            {t.available}
                          </span>
                        )}

                        {/* Current Time Indicator */}
                        {isCurrentHour && (
                          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-fuchsia-500 rounded-full border-2 border-white shadow-[0_0_12px_rgba(217,70,239,0.7)] z-10" title={language === 'th' ? "ชั่วโมงปัจจุบัน" : "Current Hour"}></div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Col: Room Info & Inlined Booking Form */}
          <div className="space-y-6">
            {/* Room Summary Card with Inlined Booking Form */}
            {selectedRoom && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-slate-805">
                {/* Image Header with Overlay */}
                <div className="relative h-44 overflow-hidden flex-shrink-0 z-0">
                  {selectedRoom.imageUrl ? (
                    <>
                      <img
                        src={selectedRoom.imageUrl}
                        alt={selectedRoom.name}
                        className="absolute inset-0 w-full h-full object-cover -z-25"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-transparent -z-10"></div>
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-600 to-brand-850 -z-10"></div>
                  )}

                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="font-bold text-lg leading-tight mb-0.5 drop-shadow-sm">{selectedRoom.name}</h3>
                    <p className="text-xs text-slate-200 font-semibold drop-shadow-sm">{getRoomTypeLabel(selectedRoom.type)} • {selectedRoom.capacity} {t.people}</p>
                    <div className="mt-2 flex items-center text-xs text-slate-300 font-medium drop-shadow-sm">
                      <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-400 flex-shrink-0 animate-pulse" />
                      <span className="truncate">{translateAmenities(selectedRoom?.amenities, language).join(', ')}</span>
                    </div>
                  </div>
                </div>

                {/* Unified Booking Info (No inputs here) */}
                <div className="p-4 space-y-4">
                  {getMaintenanceAt(selectedRoom, dateStr).closed && (
                    <div className="rounded-xl border border-slate-300 bg-slate-100 p-3 text-xs font-semibold text-slate-700">
                      <div className="font-bold">{temporarilyDisabledLabel}</div>
                      <div>{getDisabledTimePeriod(selectedRoom.closureStartTime, selectedRoom.closureEndTime)}</div>
                      <div className="truncate">{getDisabledReasonText(getMaintenanceAt(selectedRoom, dateStr).reason)}</div>
                    </div>
                  )}

                  {/* Selected Booking Times Box */}
                  <div className={`p-4 rounded-xl border transition-all ${selectedHours.length > 0
                    ? 'bg-orange-50 border-orange-200 text-orange-900'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <Clock className={`w-4 h-4 ${selectedHours.length > 0 ? 'text-orange-500 animate-pulse' : 'text-slate-400'}`} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {language === 'th' ? 'ช่วงเวลาที่ลงทะเบียน' : 'SELECTED BOOKING TIMES'}
                      </span>
                    </div>

                    {selectedHours.length > 0 ? (
                      <div className="space-y-1.5 mt-2">
                        <div className="text-sm font-bold text-orange-950 bg-orange-100 py-1 px-2.5 rounded-lg border border-orange-200 inline-block font-mono">
                          {getSelectedRangesStr(selectedHours)}
                        </div>
                        <p className="text-[11px] text-orange-700 font-semibold">
                          {language === 'th'
                            ? `💡 สามารถคลิกเลือก/สลับช่องชั่วโมงในตารางด้านซ้ายเพื่อกรองเวลา`
                            : `💡 Tick or untick slots on the left timeline grid to adjust booking blocks`}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] font-semibold mt-1">
                        {language === 'th'
                          ? 'กรุณาคลิกเลือกช่วงเวลาต้องการจองบนตารางเวลา (ฝั่งซ้าย)'
                          : 'Please click to select your desired hours on the left timeline'}
                      </p>
                    )}
                  </div>

                  {/* Action Button */}
                  {isRoomClosedAllDay(selectedRoom, dateStr, liveTime).closed ? (
                    <div className="p-3.5 bg-slate-100 border border-slate-300 text-slate-700 text-center rounded-lg text-xs font-bold">
                      {temporarilyDisabledLabel}: {getDisabledReasonText(getMaintenanceAt(selectedRoom, dateStr).reason)}
                    </div>
                  ) : selectedHours.length > 0 ? (
                    <div className="flex flex-col space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBookingError(null);
                          setIsDetailsModalOpen(true);
                        }}
                        className="w-full py-2.5 rounded-xl text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white shadow active:scale-[0.98] transition-all flex items-center justify-center space-x-1.5"
                      >
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>{language === 'th' ? 'ดำเนินการจองห้อง' : 'Proceed to Book'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHours([]);
                          setBookingError(null);
                        }}
                        className="w-full py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all flex items-center justify-center"
                      >
                        {language === 'th' ? 'ยกเลิกการเลือกเวลา (Clear)' : 'Clear Selection'}
                      </button>
                    </div>
                  ) : singleRoomBookings.length > 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 text-center rounded-xl text-xs font-bold leading-relaxed flex items-center justify-center space-x-2">
                      <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <span>{language === 'th' ? 'หากต้องการยกเลิกการจอง กรุณาติดต่อผู้ดูแลระบบ (Admin)' : 'To cancel bookings, please contact an administrator.'}</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 text-slate-500 text-center rounded-xl text-xs font-bold leading-relaxed">
                      {language === 'th'
                        ? '👉 กรุณาคลิกเลือกเวลาก่อนเริ่มทำการจอง (จากตารางฝั่งซ้าย)'
                        : '👉 Click hour blocks on the left timeline to start booking'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Booking List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-slate-800">
              <h3 className="font-bold text-slate-850 text-sm uppercase tracking-wider mb-4 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-brand-500" />
                {t.bookingsFor} {formatDate(selectedDateObj, language, { month: 'short', day: 'numeric' })}
              </h3>
              {singleRoomBookings.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-bold">{t.noBookingsDate}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {singleRoomBookings.map(b => {
                    const noCheckIn = isNoCheckIn(b);
                    return (
                      <div key={b.id} className={`p-3 rounded-lg border transition-colors ${getBookingDepartmentClass(b.department)} ${noCheckIn ? 'bg-rose-50 border-rose-200' : 'bg-orange-50 border-orange-200 hover:border-orange-300'}`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-slate-800 text-sm">
                            {translateText(b.title, language)}
                            {b.status === BookingStatus.PENDING && <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">{t.pending}</span>}
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 font-bold">
                              {formatTimeLocal(b.startTime, language)} - {formatTimeLocal(b.endTime, language)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                          <div className="flex flex-col">
                            <div className="flex items-center">
                              <User className="w-3 h-3 mr-1 text-slate-450" />
                              {b.organizer}
                            </div>
                          </div>
                          {b.department && (
                            <div className="flex items-center text-slate-400 self-start font-semibold">
                              <Building2 className="w-3 h-3 mr-1" />
                              {b.department}
                            </div>
                          )}
                        </div>

                        {/* Check-in / Checkout Status and Buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 mt-1">
                          <div className="text-[10px] font-bold">
                            {noCheckIn ? (
                              <span title={checkInWindowTooltip} className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                                {language === 'th' ? 'ไม่มา Check-in' : 'No Check-in'}
                              </span>
                            ) : b.actualStartTime ? (
                              b.actualEndTime ? (
                                <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  {language === 'th' ? '✓ เช็คเอาท์แล้ว' : '✓ Checked out'} ({formatTimeLocal(b.actualStartTime, language)} - {formatTimeLocal(b.actualEndTime, language)})
                                </span>
                              ) : (
                                <span title={checkInWindowTooltip} className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded animate-pulse">
                                  {language === 'th' ? '● กำลังใช้งานห้อง' : '● Room in use'} ({language === 'th' ? 'เข้าใช้:' : 'In:'} {formatTimeLocal(b.actualStartTime, language)})
                                </span>
                              )
                            ) : (
                              <span title={checkInWindowTooltip} className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                {language === 'th' ? 'รอเข้าใช้งาน' : 'Awaiting check-in'}
                              </span>
                            )}
                          </div>

                          {canCheckIn(b) && (
                            <button
                              type="button"
                              onClick={() => setCheckInBooking(b)}
                              className="rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-sm transition-colors hover:bg-emerald-600"
                            >
                              {language === 'th' ? 'Check-in' : 'Check in'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Admin cancellation instruction banner */}
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl mt-4 text-[11.5px] text-rose-700 flex items-start font-bold">
                <AlertCircle className="w-4 h-4 mr-2 text-rose-500 flex-shrink-0 mt-0.5 animate-pulse" />
                <span>
                  {language === 'th'
                    ? '💡 หากต้องการยกเลิกหรือลดชั่วโมงการจอง กรุณาติดต่อผู้ดูแลระบบ (Admin)'
                    : '💡 To cancel or reduce booking hours, please contact the Administrator (Admin)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {checkInBooking && (
        <CheckInValidationModal
          booking={checkInBooking}
          language={language}
          onClose={() => setCheckInBooking(null)}
          onCheckIn={handleCheckIn}
        />
      )}

      {/* Detail Booking Modal Popup */}
      {isDetailsModalOpen && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-800 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg leading-tight">
                  {language === 'th' ? `ระบุรายละเอียดการจอง` : `Enter Booking Details`}
                </h3>
                <p className="text-xs text-white/90 font-medium">
                  {selectedRoom.name} • {getRoomTypeLabel(selectedRoom.type)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleInlineSubmit} className="p-6 space-y-4">
              {/* Selected Time Info */}
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-start text-orange-900">
                <Clock className="w-4.5 h-4.5 text-orange-500 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wider mb-0.5">
                    {language === 'th' ? 'วันและเวลาที่จอง' : 'Date & Selected Times'}
                  </div>
                  <div className="text-sm font-bold text-orange-950">
                    {formatDate(selectedDateObj, language, { weekday: 'short', month: 'short', day: 'numeric' })} {getSelectedRangesStr(selectedHours)}
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t.meetingTitle} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="meeting-titles-list"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={language === 'th' ? 'เช่น ประชุมแผนงาน Q3' : 'e.g. Q3 Strategy Planning'}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium text-slate-800"
                />
                <datalist id="meeting-titles-list">
                  {language === 'th' ? (
                    <>
                      <option value="Meeting" />
                      <option value="Yield Meeting" />
                      <option value="อบรมส่งเสริมสุขภาพใจ" />
                      <option value="อบรม" />
                      <option value="อบรมช่างเทคนิค" />
                      <option value="Training" />
                    </>
                  ) : (
                    <>
                      <option value="Meeting" />
                      <option value="Yield Meeting" />
                      <option value="Mental Health Training" />
                      <option value="Training" />
                      <option value="Technician Training" />
                    </>
                  )}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.organizerName} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={organizer}
                    onChange={(e) => setOrganizer(e.target.value)}
                    placeholder={language === 'th' ? 'สมชาย' : 'John'}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {language === 'th' ? 'รหัสพนักงาน (ตัวเลข 7 หลัก)' : 'Employee ID (7 digits)'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={7}
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234567"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.department} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-semibold text-slate-800"
                  >
                    <option value="">-- {t.selectDept} --</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {language === 'th' ? 'เบอร์โต๊ะ (ตัวเลข 4 หลัก)' : 'Desk Number (4 digits)'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={deskNumber}
                    onChange={(e) => setDeskNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Error feedback */}
              {bookingError && (
                <div className="p-3 bg-rose-50 border border-rose-250 rounded-lg flex items-start text-xs text-rose-700 font-bold">
                  <AlertCircle className="w-4 h-4 mr-2.5 flex-shrink-0 text-rose-600 mt-0.5" />
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="flex-1 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold text-sm transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-semibold text-sm shadow transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{language === 'th' ? 'ยืนยันการจอง' : 'Confirm Booking'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
