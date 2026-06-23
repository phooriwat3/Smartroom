import React from 'react';
import { Room, Booking, BookingStatus } from '../types';
import { Users, Monitor, CalendarPlus } from 'lucide-react';
import { TRANSLATIONS, formatTimeString, translateText, isRoomClosedAt, isRoomCurrentlyClosed } from '../translations';
import { getBookingDepartmentClass } from '../bookingVisualStyles';
import { BOOKING_START_HOUR, BOOKING_END_HOUR } from '../constants';

interface RoomCardProps {
  room: Room;
  currentBookings: Booking[];
  onBook: (room: Room) => void;
  language: 'th' | 'en';
}

const RoomCard: React.FC<RoomCardProps> = ({ room, currentBookings, onBook, language }) => {
  const t = TRANSLATIONS[language];
  const now = new Date();
  const temporarilyDisabledLabel = language === 'th' ? 'ปิดใช้งานชั่วคราว' : 'Temporarily Disabled';
  const checkInWindowTooltip = language === 'th'
    ? 'Check in ได้ภายใน 15 นาทีก่อนหรือหลังเวลาเริ่มจอง เช่น หากเริ่มเวลา 15:00 น. สามารถ Check in ได้ตั้งแต่ 14:45 น. ถึง 15:15 น.'
    : 'Check in within 15 minutes before or after the booking start time. For example, if the booking starts at 3:00 PM, check-in is allowed from 2:45 PM to 3:15 PM.';
  const isNoCheckIn = (booking: Booking) => booking.status === BookingStatus.NO_SHOW;

  // Find current active booking (ignore rejected)
  const currentBooking = currentBookings.find(booking =>
    booking.roomId === room.id &&
    now >= booking.startTime &&
    now <= booking.endTime &&
    booking.status !== BookingStatus.REJECTED &&
    !isNoCheckIn(booking)
  );

  const isOccupied = !!currentBooking;
  const isPending = currentBooking?.status === BookingStatus.PENDING;

  // Get upcoming bookings for this room TODAY only (Exclude rejected)
  const todaysBookings = currentBookings
    .filter(b => {
      return b.roomId === room.id &&
        b.startTime.getDate() === now.getDate() &&
        b.startTime.getMonth() === now.getMonth() &&
        b.startTime.getFullYear() === now.getFullYear() &&
        b.status !== BookingStatus.REJECTED;
    })
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const getHHMM = (d: Date | string) => {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    const h = (dateObj || new Date()).getHours().toString().padStart(2, "0");
    const m = (dateObj || new Date()).getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const formatHour = (hour?: number) => {
    const h = hour !== undefined ? hour : BOOKING_START_HOUR;
    if (language === 'en') {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 || 12;
      return `${displayHour}:00 ${ampm}`;
    }
    return `${String(h).padStart(2, '0')}:00 น.`;
  };

  // Convert room type values based on selected language for elegance
  const getRoomTypeLabel = (type: string) => {
    if (type === 'Meeting') return t.meetingRoom;
    if (type === 'Reception') return t.receptionArea;
    if (type === 'Training') return t.trainingRoom;
    return type;
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col h-full">
      <div className="relative h-32 overflow-hidden p-4 flex flex-col justify-end z-0">
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
          <div className="absolute inset-0 bg-gradient-to-r from-brand-600 to-brand-800 -z-10"></div>
        )}

        {isRoomCurrentlyClosed(room) && (
          <div className="absolute top-3 right-3 bg-slate-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow-md flex items-center z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5"></span>
            {temporarilyDisabledLabel}: {translateText(room.closureReason || '', language) || temporarilyDisabledLabel}
          </div>
        )}
        <h3 className="text-white text-lg font-bold truncate drop-shadow-sm">{room.name}</h3>
        <p className="text-slate-100/90 text-xs font-semibold drop-shadow-sm">{getRoomTypeLabel(room.type)}</p>
      </div>

      <div className="p-4 flex-grow flex flex-col">
        <div className="flex items-center space-x-4 text-sm text-slate-600 mb-4">
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1.5" />
            <span>{room.capacity} {t.ppl}</span>
          </div>
          {(room.amenities || []).slice(0, 2).map((amenity, idx) => (
            <div key={idx} className="flex items-center">
              <Monitor className="w-4 h-4 mr-1.5" />
              <span className="truncate max-w-[100px]">{translateText(amenity, language)}</span>
            </div>
          ))}
        </div>

        {isRoomCurrentlyClosed(room) && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            <div className="font-bold text-slate-700">{temporarilyDisabledLabel}</div>
            <div>{formatHour(room.closureStartTime)} - {formatHour(room.closureEndTime ?? BOOKING_END_HOUR)}</div>
            <div className="truncate">{translateText(room.closureReason || '', language) || temporarilyDisabledLabel}</div>
          </div>
        )}

        <div className="flex-grow">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.scheduleToday}</h4>
          {todaysBookings.length === 0 ? (
            <p className="text-sm text-slate-400 italic">{t.noBookingsToday}</p>
          ) : (
            <div className="space-y-2">
              {todaysBookings.slice(0, 2).map(booking => (
                <div key={booking.id} className={`flex justify-between items-center text-sm rounded-lg px-2 py-1 bg-orange-50 border border-orange-200 ${getBookingDepartmentClass(booking.department)}`}>
                  <div className="flex items-center truncate max-w-[140px]">
                    <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0 bg-orange-500"></span>
                    <span className="text-orange-900 font-medium truncate">{translateText(booking.title, language)}</span>
                    {isNoCheckIn(booking) && <span title={checkInWindowTooltip} className="ml-1.5 text-[9px] bg-rose-100 text-rose-700 px-1 py-0.5 rounded font-bold">{language === 'th' ? 'ไม่มา Check-in' : 'No Check-in'}</span>}
                  </div>
                  <span className="text-slate-500 text-xs flex-shrink-0">
                    {formatTimeString(getHHMM(booking.startTime), language)}
                  </span>
                </div>
              ))}
              {todaysBookings.length > 2 && <p className="text-xs text-slate-400">+{todaysBookings.length - 2} {t.more}</p>}
            </div>
          )}
        </div>

        <button
          onClick={() => onBook(room)}
          className="mt-6 w-full flex items-center justify-center space-x-2 bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg transition-colors font-medium border border-transparent shadow-sm"
        >
          <CalendarPlus className="w-4 h-4" />
          <span>{t.bookRoom}</span>
        </button>
      </div>
    </div>
  );
};

export default RoomCard;
