import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AVAILABLE_ROOMS, INITIAL_BOOKINGS_MOCK, BOOKING_START_HOUR, BOOKING_END_HOUR } from './constants';
import { Room, Booking, RoomType, BookingStatus, AdminUser, RoomMaintenanceRecord } from './types';
import RoomCard from './components/RoomCard';
import BookingModal from './components/BookingModal';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import AIAssistant from './components/AIAssistant';
import ConfirmationModal from './components/ConfirmationModal';
import VerifyBookingPage from './components/VerifyBookingPage';
import { TRANSLATIONS, getEffectiveRoomStatus, isRoomClosureExpired, isRoomClosedAt, isRoomCurrentlyClosed } from './translations';
import { LayoutGrid, Calendar, BarChart3, Settings, Check, XCircle, AlertCircle, BookOpen, Menu, X } from 'lucide-react';
import { TermsModal, AccessDeniedOverlay } from './components/TermsModal';
import { UserGuideModal } from './components/UserGuideModal';
import { collection, onSnapshot, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { db, auth, functions, handleFirestoreError, OperationType, testFirestoreConnection } from './firebase';

type AppView = 'grid' | 'dashboard' | 'admin';
type RouteMode = 'app' | 'verify';

const USER_DEFAULT_VIEW: AppView = 'dashboard';

const isAdminRoutePath = (path?: string) => {
  const routePath = path ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const normalizedPath = routePath.replace(/\/+$/, '') || '/';
  return normalizedPath === '/admin';
};

const getRouteMode = (path?: string): RouteMode => {
  const routePath = path ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const normalizedPath = routePath.replace(/\/+$/, '') || '/';
  if (normalizedPath === '/verify') return 'verify';
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verify') === 'booking') return 'verify';
  }
  return 'app';
};

const isYageoEmail = (email?: string) => /^[^\s@]+@yageo\.com$/i.test((email || '').trim());

const getStoredLanguage = (): 'th' | 'en' => {
  try {
    const saved = localStorage.getItem('smartroom_lang');
    return (saved === 'th' || saved === 'en') ? saved : 'th';
  } catch (e) {
    return 'th';
  }
};

const SmartRoomApplication: React.FC = () => {
  // --- LANGUAGE STATE ---
  const [language, setLanguage] = useState<'th' | 'en'>(() => {
    try {
      const saved = localStorage.getItem('smartroom_lang');
      return (saved === 'th' || saved === 'en') ? saved : 'th'; // Default to Thai search as requested by user's target audience
    } catch (e) {
      return 'th';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('smartroom_lang', language);
    } catch (e) {
      console.error(e);
    }
  }, [language]);

  const t = TRANSLATIONS[language];

  // --- DATABASE STATE (Real-time Firestore) ---
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<RoomMaintenanceRecord[]>([]);
  // Ref to track IDs that admin deleted locally — prevents onSnapshot from restoring them (no stale closure)
  const deletedBookingIdsRef = useRef<Set<string>>(new Set());
  const expiredClosureCleanupKeysRef = useRef<Set<string>>(new Set());
  const noShowRequestIdsRef = useRef<Set<string>>(new Set());
  const [roomStatusNow, setRoomStatusNow] = useState<Date>(() => new Date());

  const getClosureCleanupKey = (room: Room) => [
    room.id,
    room.closureStartDate || '',
    room.closureEndDate || '',
    room.closureStartTime ?? '',
    room.closureEndTime ?? '',
    room.closureReason || ''
  ].join('|');

  const clearExpiredClosureFields = (room: Room): Room => ({
    ...room,
    isClosed: false,
    closureReason: '',
    closureStartDate: '',
    closureEndDate: '',
    closureStartTime: undefined,
    closureEndTime: undefined
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setRoomStatusNow(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const effectiveRooms = useMemo(() => {
    return rooms.map(room => (
      expiredClosureCleanupKeysRef.current.has(getClosureCleanupKey(room))
        ? clearExpiredClosureFields(room)
        : getEffectiveRoomStatus(room, roomStatusNow)
    ));
  }, [rooms, roomStatusNow]);

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const selectedRoomForModal = useMemo(() => {
    if (!selectedRoom) return null;
    return effectiveRooms.find(room => room.id === selectedRoom.id) || getEffectiveRoomStatus(selectedRoom, roomStatusNow);
  }, [selectedRoom, effectiveRooms, roomStatusNow]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (isAdminRoutePath()) {
      return 'admin';
    }

    try {
      const saved = localStorage.getItem('smartroom_view');
      return (saved === 'grid' || saved === 'dashboard') ? saved : USER_DEFAULT_VIEW;
    } catch (e) {
      return USER_DEFAULT_VIEW;
    }
  });

  const navigateToView = (view: AppView) => {
    try {
      const targetPath = view === 'admin' ? '/admin' : '/';
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ smartroomView: view }, '', targetPath);
      }
    } catch (e) {
      console.error(e);
    }
    setCurrentView(view);
  };
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('All');
  const [preselectedDate, setPreselectedDate] = useState<string | undefined>(undefined);
  const [preselectedHours, setPreselectedHours] = useState<number[] | undefined>(undefined);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('smartroom_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (currentView === 'admin') {
        localStorage.removeItem('smartroom_view');
      } else {
        localStorage.setItem('smartroom_view', currentView);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentView]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(prev => {
        if (isAdminRoutePath()) return 'admin';
        return prev === 'admin' ? USER_DEFAULT_VIEW : prev;
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    try {
      if (adminUser) {
        localStorage.setItem('smartroom_admin_user', JSON.stringify(adminUser));
      } else {
        localStorage.removeItem('smartroom_admin_user');
      }
    } catch (e) {
      console.error(e);
    }
  }, [adminUser]);

  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // --- TOAST NOTIFICATION STATE ---
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isOpen: boolean }>({
    message: '',
    type: 'success',
    isOpen: false
  });

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type, isOpen: true });
    // Keep it open for 4 seconds
    const timer = setTimeout(() => {
      setToast(prev => {
        if (prev.message === message) {
          return { ...prev, isOpen: false };
        }
        return prev;
      });
    }, 4000);
    return () => clearTimeout(timer);
  };

  // --- FIRESTORE SUBSCRIPTIONS & SEEDING ---

  // Verify Firestore connection on mount
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth)
          .then(() => {
            console.log("Automatically signed in anonymously on mount");
          })
          .catch(err => {
            console.error("Failed to sign in anonymously on mount:", err);
          });
      } else {
        console.log("Firebase Auth user session active:", user.uid);
      }
    });

    testFirestoreConnection();

    return () => unsubscribeAuth();
  }, []);

  // 1. Subscribe to Rooms
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'rooms'), (snapshot) => {
      if (snapshot.empty) {
        const hasSeeded = localStorage.getItem('smartroom_rooms_seeded');
        if (!hasSeeded) {
          console.log("Rooms collection is empty, seeding defaults...");
          AVAILABLE_ROOMS.forEach(async (room) => {
            try {
              await setDoc(doc(db, 'rooms', room.id), room);
            } catch (e) {
              console.error("Failed to seed room to Firestore", room.id, e);
            }
          });
          localStorage.setItem('smartroom_rooms_seeded', 'true');
        } else {
          setRooms([]);
        }
      } else {
        localStorage.setItem('smartroom_rooms_seeded', 'true');
        const loadedRooms: Room[] = [];
        snapshot.forEach((docSnap) => {
          loadedRooms.push(docSnap.data() as Room);
        });
        setRooms(loadedRooms);
      }
    }, (error) => {
      // Firestore rules may not be deployed yet — fall back to local constants
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn("Firestore rooms subscription failed (falling back to local data):", errMsg);
      if (rooms.length === 0) {
        setRooms(AVAILABLE_ROOMS);
      }
    });

    return () => unsubscribe();
  }, []);

  // 1.5 Subscribe to room maintenance history
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'roomMaintenanceHistory'), (snapshot) => {
      const loadedRecords: RoomMaintenanceRecord[] = [];
      snapshot.forEach((docSnap) => {
        loadedRecords.push({
          ...docSnap.data(),
          id: docSnap.id
        } as RoomMaintenanceRecord);
      });
      setMaintenanceHistory(loadedRecords);
    }, (error) => {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn("Firestore maintenance history subscription failed:", errMsg);
      setMaintenanceHistory([]);
    });

    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Bookings
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      if (snapshot.empty) {
        const hasSeeded = localStorage.getItem('smartroom_bookings_seeded');
        if (!hasSeeded) {
          console.log("Bookings collection is empty, seeding defaults...");
          INITIAL_BOOKINGS_MOCK.forEach(async (b) => {
            try {
              const start = b.startTime ? new Date(b.startTime) : new Date();
              const end = b.endTime ? new Date(b.endTime) : new Date();
              await setDoc(doc(db, 'bookings', b.id), {
                ...b,
                startTime: start,
                endTime: end,
                createdAt: b.createdAt || new Date()
              });
            } catch (e) {
              console.error("Failed to seed booking to Firestore", b.id, e);
            }
          });
          localStorage.setItem('smartroom_bookings_seeded', 'true');
        } else {
          setBookings([]);
        }
      } else {
        localStorage.setItem('smartroom_bookings_seeded', 'true');
        const loadedBookings: Booking[] = [];
        snapshot.forEach((docSnap) => {
          // Skip any bookings that admin has locally deleted this session
          if (deletedBookingIdsRef.current.has(docSnap.id)) return;

          const data = docSnap.data();
          const start = (data.startTime && typeof data.startTime.toDate === 'function')
            ? data.startTime.toDate()
            : new Date(data.startTime);
          const end = (data.endTime && typeof data.endTime.toDate === 'function')
            ? data.endTime.toDate()
            : new Date(data.endTime);
          
          const actualStart = (data.actualStartTime && typeof data.actualStartTime.toDate === 'function')
            ? data.actualStartTime.toDate()
            : (data.actualStartTime ? new Date(data.actualStartTime) : undefined);
          const actualEnd = (data.actualEndTime && typeof data.actualEndTime.toDate === 'function')
            ? data.actualEndTime.toDate()
            : (data.actualEndTime ? new Date(data.actualEndTime) : undefined);

          loadedBookings.push({
            ...data,
            id: docSnap.id,
            startTime: start,
            endTime: end,
            actualStartTime: actualStart,
            actualEndTime: actualEnd
          } as Booking);
        });
        setBookings(loadedBookings);
      }
    }, (error) => {
      // Firestore rules may not be deployed yet — fall back to seeded local bookings
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn("Firestore bookings subscription failed (falling back to local data):", errMsg);
      if (bookings.length === 0) {
        const fallbackBookings: Booking[] = INITIAL_BOOKINGS_MOCK.map(b => ({
          ...b,
          startTime: b.startTime ? new Date(b.startTime) : new Date(),
          endTime: b.endTime ? new Date(b.endTime) : new Date(),
          actualStartTime: b.actualStartTime ? new Date(b.actualStartTime) : undefined,
          actualEndTime: b.actualEndTime ? new Date(b.actualEndTime) : undefined,
        } as Booking));
        setBookings(fallbackBookings);
      }
    });

    return () => unsubscribe();
  }, []);

  // 3. Mark bookings as NO_SHOW if they are not checked in within 15 minutes of scheduled start time
  useEffect(() => {
    const checkAutoCancellation = async () => {
      const nowTime = new Date();
      const bookingsToCancel = bookings.filter(b => {
        if (b.status === BookingStatus.REJECTED || b.status === BookingStatus.NO_SHOW) return false;
        if (noShowRequestIdsRef.current.has(b.id)) return false;
        if (b.actualStartTime) return false; // Already checked in
        
        const cutoffTime = new Date(b.startTime.getTime() + 15 * 60 * 1000);
        return nowTime > cutoffTime;
      });

      for (const booking of bookingsToCancel) {
        console.log(`Marking booking ${booking.id} (${booking.title}) as NO_SHOW - not checked in within 15 minutes.`);
        noShowRequestIdsRef.current.add(booking.id);
        try {
          await markBookingNoShow(booking.id);
          setBookings(prev => prev.map(b => (
            b.id === booking.id ? { ...b, status: BookingStatus.NO_SHOW } : b
          )));
        } catch (e) {
          console.error("Failed to update booking to NO_SHOW:", e);
          noShowRequestIdsRef.current.delete(booking.id);
        }
      }
    };

    checkAutoCancellation();
    const interval = setInterval(checkAutoCancellation, 15000); // Check every 15 seconds
    return () => clearInterval(interval);
  }, [bookings]);

  // 3.5 Preserve past usage history by closing incomplete checked-in bookings at their scheduled end time
  useEffect(() => {
    const finalizePastIncomplete = async () => {
      if (bookings.length === 0) return;
      const nowTime = new Date();
      const todayStart = new Date(nowTime.getFullYear(), nowTime.getMonth(), nowTime.getDate());
      
      const pastIncomplete = bookings.filter(b => {
        const isBeforeToday = b.startTime < todayStart;
        if (!isBeforeToday) return false;
        
        if (b.status === BookingStatus.NO_SHOW) return false;
        if (!b.actualStartTime) return false;
        return !b.actualEndTime;
      });
      
      for (const b of pastIncomplete) {
        console.log(`Finalizing past incomplete booking ${b.id}`);
        try {
          await updateDoc(doc(db, 'bookings', b.id), {
            actualEndTime: b.endTime
          });
        } catch (e) {
          console.error("Failed to finalize past incomplete booking:", e);
        }
      }
    };
    
    finalizePastIncomplete();
  }, [bookings]);

  // 4. Clean up orphaned bookings (bookings where the room has been deleted)
  useEffect(() => {
    if (rooms.length > 0 && bookings.length > 0) {
      bookings.forEach(async (booking) => {
        const roomExists = rooms.some(r => r.id === booking.roomId);
        if (!roomExists) {
          console.log(`Cleaning up orphaned booking ${booking.id} for non-existent room ${booking.roomId}`);
          try {
            await deleteDoc(doc(db, 'bookings', booking.id));
          } catch (e) {
            console.error("Failed to clean up orphaned booking:", e);
          }
        }
      });
    }
  }, [rooms, bookings]);

  // 5. Automatically reopen rooms after their temporary closure window ends.
  useEffect(() => {
    rooms.forEach(async (room) => {
      if (!isRoomClosureExpired(room, roomStatusNow)) return;

      const cleanupKey = getClosureCleanupKey(room);

      if (expiredClosureCleanupKeysRef.current.has(cleanupKey)) return;
      expiredClosureCleanupKeysRef.current.add(cleanupKey);

      try {
        await updateDoc(doc(db, 'rooms', room.id), {
          isClosed: false,
          closureReason: '',
          closureStartDate: '',
          closureEndDate: '',
          closureStartTime: BOOKING_START_HOUR,
          closureEndTime: 24
        });
      } catch (e) {
        console.warn("Failed to clear expired room closure; UI will still treat it as open:", e);
      }
    });
  }, [rooms, roomStatusNow]);

  const handleBookRoom = (room: Room, dateStr?: string, hours?: number[]) => {
    setSelectedRoom(getEffectiveRoomStatus(room, roomStatusNow));
    setPreselectedDate(dateStr);
    setPreselectedHours(hours);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRoom(null);
    setPreselectedDate(undefined);
    setPreselectedHours(undefined);
  };

  const handleAcceptTerms = () => {
    setTermsAccepted(true);
  };

  const handleDeclineTerms = () => {
    setTermsAccepted(false);
  };

  const handleDeleteBooking = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: language === 'th' ? 'ยืนยันการลบการจอง' : 'Confirm Delete Booking',
      message: t.confirmDeleteBooking,
      isDanger: true,
      confirmText: language === 'th' ? 'ลบข้อมูล' : 'Delete',
      cancelText: language === 'th' ? 'ยกเลิก' : 'Cancel',
      onConfirm: async () => {
        // Step 1: Remove immediately from local state and mark as deleted
        // This prevents onSnapshot from restoring it even if Firebase delete fails
        deletedBookingIdsRef.current.add(id);
        setBookings(prev => prev.filter(b => b.id !== id));

        // Step 2: Try to delete from Firebase in background
        try {
          await deleteDoc(doc(db, 'bookings', id));
          showNotification(
            language === 'th' ? 'ลบข้อมูลการจองสำเร็จแล้ว' : 'Booking successfully deleted',
            'success'
          );
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          const isPermissionDenied = errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('missing or insufficient') || errMsg.toLowerCase().includes('firestore');
          console.warn("Firestore delete failed (booking kept hidden locally):", errMsg);

          if (isPermissionDenied) {
            // UI already updated above — just show a soft warning
            showNotification(
              language === 'th'
                ? 'ลบออกจากหน้าจอแล้ว (จะกลับมาหลัง Refresh — โปรด Deploy Firebase Rules)'
                : 'Hidden from view (will reappear on refresh — please Deploy Firebase Rules)',
              'info'
            );
          } else {
            showNotification(
              language === 'th' ? `ลบข้อมูลไม่สำเร็จ: ${errMsg}` : `Delete failed: ${errMsg}`,
              'error'
            );
          }
        }

        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleUpdateBooking = async (id: string, updatedFields: Partial<Booking>) => {
    try {
      await updateDoc(doc(db, 'bookings', id), updatedFields);
      showNotification(language === 'th' ? 'แก้ไขข้อมูลการจองสำเร็จแล้ว' : 'Booking successfully updated', 'success');
      return true;
    } catch (e) {
      console.error("Failed to update booking:", e);
      showNotification(language === 'th' ? `แก้ไขข้อมูลไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)}` : `Update failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
      try {
        handleFirestoreError(e, OperationType.UPDATE, `bookings/${id}`);
      } catch (loggingError) {}
      return false;
    }
  };

  const handleApproveBooking = async (id: string) => {
    try {
      await updateDoc(doc(db, 'bookings', id), {
        status: BookingStatus.CONFIRMED
      });
      showNotification(language === 'th' ? 'อนุมัติการจองเรียบร้อยแล้ว' : 'Booking approved successfully', 'success');
    } catch (e) {
      console.error("Failed to approve booking:", e);
      showNotification(language === 'th' ? `อนุมัติไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)}` : `Approval failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
      try {
        handleFirestoreError(e, OperationType.UPDATE, `bookings/${id}`);
      } catch (loggingError) {}
    }
  };

  const handleRejectBooking = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: language === 'th' ? 'ปฏิเสธคำขอการจอง' : 'Reject Booking Request',
      message: t.confirmRejectBooking,
      isDanger: true,
      confirmText: language === 'th' ? 'ปฏิเสธ' : 'Reject',
      cancelText: language === 'th' ? 'ยกเลิก' : 'Cancel',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'bookings', id), {
            status: BookingStatus.REJECTED
          });
          showNotification(language === 'th' ? 'ปฏิเสธความปรารถนาสำเร็จ' : 'Booking rejected successfully', 'success');
        } catch (e) {
          console.error("Failed to reject booking:", e);
          showNotification(language === 'th' ? `การปฏิเสธไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)}` : `Rejection failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
          try {
            handleFirestoreError(e, OperationType.UPDATE, `bookings/${id}`);
          } catch (loggingError) {}
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Room Management Handlers
  const getLocalDateString = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const getBookingHourSlots = (startTime: Date, endTime: Date) => {
    const slots: number[] = [];
    for (let hour = startTime.getHours(); hour < endTime.getHours(); hour++) {
      slots.push(hour);
    }
    return slots;
  };

  const hasClosedBookingSlot = (room: Room | undefined, startTime: Date, endTime: Date) => {
    if (!room) return false;
    const dateStr = getLocalDateString(startTime);
    return getBookingHourSlots(startTime, endTime).some(hour => (
      isRoomClosedAt(room, dateStr, hour, roomStatusNow).closed
    ));
  };

  const buildMaintenanceHistoryRecord = (room: Room): RoomMaintenanceRecord | null => {
    if (!room.isClosed) return null;

    const today = getLocalDateString(new Date());
    const startDate = room.closureStartDate || today;
    const endDate = room.closureEndDate || startDate;
    const startTime = room.closureStartTime !== undefined ? room.closureStartTime : BOOKING_START_HOUR;
    const endTime = room.closureEndTime !== undefined ? room.closureEndTime : BOOKING_END_HOUR;
    const reason = room.closureReason || 'Maintenance';
    const historyId = [
      room.id,
      startDate,
      endDate,
      startTime,
      endTime,
      reason
    ].join('_').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 180);

    return {
      id: historyId,
      roomId: room.id,
      roomName: room.name,
      reason,
      startDate,
      endDate,
      startTime,
      endTime,
      createdAt: new Date()
    };
  };

  const saveMaintenanceHistoryForRoom = async (room: Room) => {
    const record = buildMaintenanceHistoryRecord(room);
    if (!record) return;

    setMaintenanceHistory(prev => {
      const withoutExisting = prev.filter(item => item.id !== record.id);
      return [...withoutExisting, record];
    });

    try {
      await setDoc(doc(db, 'roomMaintenanceHistory', record.id), record);
    } catch (e) {
      console.warn("Failed to persist room maintenance history; current room status was still saved:", e);
    }
  };

  const withRoomMaintenanceHistory = (room: Room, record: RoomMaintenanceRecord | null): Room => {
    if (!record) return room;
    const existingHistory = Array.isArray(room.maintenanceHistory) ? room.maintenanceHistory : [];
    return {
      ...room,
      maintenanceHistory: [
        ...existingHistory.filter(item => item.id !== record.id),
        record
      ]
    };
  };

  const handleAddRoom = async (newRoom: Room) => {
    const historyRecord = buildMaintenanceHistoryRecord(newRoom);
    const roomToSave = withRoomMaintenanceHistory(newRoom, historyRecord);
    try {
      await setDoc(doc(db, 'rooms', roomToSave.id), roomToSave);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `rooms/${roomToSave.id}`);
    }
    await saveMaintenanceHistoryForRoom(roomToSave);
  };

  const handleUpdateRoom = async (updatedRoom: Room) => {
    const previousRoom = rooms.find(room => room.id === updatedRoom.id);
    const closingRecord = updatedRoom.isClosed
      ? buildMaintenanceHistoryRecord(updatedRoom)
      : previousRoom?.isClosed
        ? buildMaintenanceHistoryRecord({
            ...previousRoom,
            closureEndDate: previousRoom.closureEndDate || getLocalDateString(new Date())
          })
        : null;
    const roomToSave = withRoomMaintenanceHistory(updatedRoom, closingRecord);
    try {
      await setDoc(doc(db, 'rooms', roomToSave.id), roomToSave);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `rooms/${roomToSave.id}`);
    }

    if (roomToSave.isClosed) {
      await saveMaintenanceHistoryForRoom(roomToSave);
    } else if (closingRecord && previousRoom) {
      await saveMaintenanceHistoryForRoom(withRoomMaintenanceHistory({
        ...previousRoom,
        closureEndDate: previousRoom.closureEndDate || getLocalDateString(new Date())
      }, closingRecord));
    }
  };

  const handleDeleteRoom = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: language === 'th' ? 'ยืนยันการลบห้องประชุม' : 'Confirm Delete Room',
      message: t.confirmDeleteRoom,
      isDanger: true,
      confirmText: language === 'th' ? 'ลบห้อง' : 'Delete Room',
      cancelText: language === 'th' ? 'ยกเลิก' : 'Cancel',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'rooms', id));
          // Clean up related bookings
          const relatedBookings = bookings.filter(b => b.roomId === id);
          for (const b of relatedBookings) {
            await deleteDoc(doc(db, 'bookings', b.id));
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `rooms/${id}`);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const sendVerificationEmail = async (bookingId: string, email?: string) => {
    if (!isYageoEmail(email)) {
      return;
    }

    const sendEmail = httpsCallable(functions, 'sendBookingVerificationEmail');
    await sendEmail({
      bookingId,
      email: email!.trim().toLowerCase(),
      origin: window.location.origin,
    });
  };

  const markBookingNoShow = async (bookingId: string) => {
    const markNoShow = httpsCallable(functions, 'markBookingNoShow');
    await markNoShow({ bookingId });
  };

  const handleConfirmBooking = async (roomOrBookingData: any, optionalData?: { title: string; organizer: string; department: string; employeeId: string; date: string; selectedHours: number[] }): Promise<boolean> => {
    try {
      if (optionalData === undefined) {
        // Direct booking data passed from Dashboard inline booking form
        const bookingData = roomOrBookingData;
        const hasValidBookingTimes = bookingData.startTime instanceof Date &&
          bookingData.endTime instanceof Date &&
          !Number.isNaN(bookingData.startTime.getTime()) &&
          !Number.isNaN(bookingData.endTime.getTime()) &&
          bookingData.startTime.getMinutes() === 0 &&
          bookingData.startTime.getSeconds() === 0 &&
          bookingData.startTime.getMilliseconds() === 0 &&
          bookingData.endTime.getMinutes() === 0 &&
          bookingData.endTime.getSeconds() === 0 &&
          bookingData.endTime.getMilliseconds() === 0;

        if (!hasValidBookingTimes) {
          showNotification(language === 'th' ? 'กรุณาเลือกเวลาเป็นรายชั่วโมงเต็มภายในช่วง 07:00 - 19:00' : 'Please choose full-hour booking times within 07:00 and 19:00.', 'error');
          return false;
        }

        const bookingDayStart = new Date(bookingData.startTime);
        bookingDayStart.setHours(BOOKING_START_HOUR, 0, 0, 0);
        const bookingDayEnd = new Date(bookingData.startTime);
        bookingDayEnd.setHours(BOOKING_END_HOUR, 0, 0, 0);

        if (bookingData.startTime < bookingDayStart || bookingData.endTime > bookingDayEnd || bookingData.endTime <= bookingData.startTime) {
          showNotification(language === 'th' ? 'สามารถจองห้องได้เฉพาะเวลา 07:00 - 19:00 เท่านั้น' : 'Rooms can only be booked between 07:00 and 19:00.', 'error');
          return false;
        }

        const roomForBooking = effectiveRooms.find(room => room.id === bookingData.roomId) || rooms.find(room => room.id === bookingData.roomId);
        if (hasClosedBookingSlot(roomForBooking, bookingData.startTime, bookingData.endTime)) {
          showNotification(language === 'th' ? 'ไม่สามารถจองช่วงเวลาที่ห้องปิดใช้งานชั่วคราวได้' : 'Cannot book during a temporary disabled period.', 'error');
          return false;
        }

        const newBookingId = Math.random().toString(36).substr(2, 9);

        // Check for double-bookings
        const isOverlapping = bookings.some(b => 
          b.roomId === bookingData.roomId &&
          b.status !== BookingStatus.REJECTED &&
          b.startTime.getTime() < bookingData.endTime.getTime() &&
          b.endTime.getTime() > bookingData.startTime.getTime()
        );

        if (isOverlapping) {
          return false;
        }

        const newBooking: any = {
          id: newBookingId,
          roomId: bookingData.roomId,
          title: bookingData.title,
          organizer: bookingData.organizer,
          department: bookingData.department,
          employeeId: bookingData.employeeId,
          deskNumber: bookingData.deskNumber || '',
          startTime: bookingData.startTime,
          endTime: bookingData.endTime,
          status: BookingStatus.CONFIRMED, // Automatically confirm new bookings
          createdAt: new Date()
        };

        if (isYageoEmail(bookingData.email)) {
          newBooking.email = bookingData.email.trim().toLowerCase();
        }

        await setDoc(doc(db, 'bookings', newBookingId), newBooking);
        try {
          await sendVerificationEmail(newBookingId, newBooking.email);
          showNotification(t.bookingConfirmedOk, 'success');
        } catch (emailError) {
          const emailFailure = {
            code: (emailError as any)?.code,
            message: (emailError as any)?.message,
            details: (emailError as any)?.details,
          };
          console.error(
            "Booking was created, but verification email failed:",
            JSON.stringify(emailFailure, null, 2),
            emailError
          );
          showNotification(
            language === 'th'
              ? 'บันทึกการจองสำเร็จ แต่ส่งอีเมลยืนยันไม่สำเร็จ กรุณาตรวจสอบ Power Automate'
              : `Booking saved, but the verification email could not be sent. ${emailFailure.code || 'Check Power Automate configuration.'}`,
            'error'
          );
        }
        return true;
      } else {
        // Dual argument structure (Legacy / modal form usage)
        const room = roomOrBookingData as Room;
        const data = optionalData;
        const [y, m, d] = data.date.split('-').map(Number);
        const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
        const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999);

        if (data.selectedHours.some(hour => !Number.isInteger(hour) || hour < BOOKING_START_HOUR || hour >= BOOKING_END_HOUR)) {
          showNotification(language === 'th' ? 'สามารถจองห้องได้เฉพาะเวลา 07:00 - 19:00 เท่านั้น' : 'Rooms can only be booked between 07:00 and 19:00.', 'error');
          return false;
        }

        if (data.selectedHours.some(hour => isRoomClosedAt(room, data.date, hour, roomStatusNow).closed)) {
          showNotification(language === 'th' ? 'ไม่สามารถจองช่วงเวลาที่ห้องปิดใช้งานชั่วคราวได้' : 'Cannot book during a temporary disabled period.', 'error');
          return false;
        }

        // Find all existing non-rejected bookings for this room on this date that haven't been checked in
        const existingDateRoomBookings = bookings.filter(b => 
          b.roomId === room.id &&
          b.status !== BookingStatus.REJECTED &&
          b.startTime < dayEnd &&
          b.endTime > dayStart &&
          !b.actualStartTime
        );

        // Delete them all to update or release
        for (const b of existingDateRoomBookings) {
          await deleteDoc(doc(db, 'bookings', b.id));
        }

        if (data.selectedHours.length === 0) {
          setIsModalOpen(false);
          setSelectedRoom(null);
          showNotification(language === 'th' ? 'ยกเลิกการเข้าร่วมและคืนเวลาจองห้องเรียบร้อย' : 'Booking released successfully', 'success');
          return true;
        }

        // Group selected hours into contiguous segments to create minimal bookings
        const sorted = [...data.selectedHours].sort((a, b) => a - b);
        const segments: { startHour: number; endHour: number }[] = [];
        
        let currentStart = sorted[0];
        let currentEnd = sorted[0] + 1;
        
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i] === currentEnd) {
            currentEnd = sorted[i] + 1;
          } else {
            segments.push({ startHour: currentStart, endHour: currentEnd });
            currentStart = sorted[i];
            currentEnd = sorted[i] + 1;
          }
        }
        segments.push({ startHour: currentStart, endHour: currentEnd });

        for (const seg of segments) {
          const start = new Date(y, m - 1, d, seg.startHour, 0);
          const end = new Date(y, m - 1, d, seg.endHour, 0);
          const newBookingId = Math.random().toString(36).substr(2, 9);

          const newBooking = {
            id: newBookingId,
            roomId: room.id,
            title: data.title,
            organizer: data.organizer,
            department: data.department,
            employeeId: data.employeeId,
            deskNumber: (data as any).deskNumber || '',
            startTime: start,
            endTime: end,
            status: BookingStatus.CONFIRMED, // Automatically confirm new bookings
            createdAt: new Date()
          };

          await setDoc(doc(db, 'bookings', newBookingId), newBooking);
        }
        setIsModalOpen(false);
        setSelectedRoom(null);
        showNotification(t.bookingConfirmedOk, 'success');
        return true;
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'bookings');
      return false;
    }
  };

  const filteredRooms = filterType === 'All' 
    ? effectiveRooms 
    : effectiveRooms.filter(room => room.type === filterType);

  const stats = {
      total: effectiveRooms.length,
      available: effectiveRooms.filter(r => {
          if (isRoomCurrentlyClosed(r, roomStatusNow)) return false;
          return !bookings.some(b =>
            b.roomId === r.id && 
            roomStatusNow >= b.startTime && 
            roomStatusNow <= b.endTime &&
            b.status !== BookingStatus.REJECTED
          )
      }).length
  };

  // Get bookings only for the currently selected room to pass to the modal (Exclude Rejected)
  const selectedRoomBookings = selectedRoomForModal 
    ? bookings.filter(b => b.roomId === selectedRoomForModal.id && b.status !== BookingStatus.REJECTED)
    : [];

  if (currentView === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8 overflow-y-auto">
         <AdminPanel 
            rooms={effectiveRooms} 
            bookings={bookings} 
            onDeleteBooking={handleDeleteBooking}
            onUpdateBooking={handleUpdateBooking}
            onApproveBooking={handleApproveBooking}
            onRejectBooking={handleRejectBooking}
            onAddRoom={handleAddRoom}
            onUpdateRoom={handleUpdateRoom}
            onDeleteRoom={handleDeleteRoom}
            language={language}
            setLanguage={setLanguage}
            showNotification={showNotification}
            currentUser={adminUser}
            setCurrentUser={setAdminUser}
            onBackToUser={() => navigateToView('dashboard')}
         />
         {/* Toast message overlay for admin */}
         {toast.isOpen && (
           <div className="fixed bottom-6 right-6 z-[9999] animate-in fade-in slide-in-from-bottom-5 duration-300">
             <div className={`p-4 rounded-xl shadow-lg border flex items-center space-x-3 text-sm font-semibold max-w-sm ${
               toast.type === 'success' 
                 ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                 : toast.type === 'error'
                 ? 'bg-rose-50 text-rose-800 border-rose-100'
                 : 'bg-slate-50 text-slate-800 border-slate-100'
             }`}>
               {toast.type === 'success' ? (
                 <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
               ) : toast.type === 'error' ? (
                 <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
               ) : (
                 <AlertCircle className="w-5 h-5 text-slate-500 flex-shrink-0" />
               )}
               <span className="flex-1">{toast.message}</span>
               <button 
                 type="button"
                 onClick={() => setToast(prev => ({ ...prev, isOpen: false }))} 
                 className="text-slate-400 hover:text-slate-600 font-bold px-1 text-md leading-none"
               >
                 ×
               </button>
             </div>
           </div>
         )}

         {/* ConfirmationModal must be here too — admin view is a separate early-return block */}
         <ConfirmationModal
           isOpen={confirmModal.isOpen}
           title={confirmModal.title}
           message={confirmModal.message}
           confirmText={confirmModal.confirmText}
           cancelText={confirmModal.cancelText}
           isDanger={confirmModal.isDanger}
           onConfirm={confirmModal.onConfirm}
           onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
         />
      </div>
    );
  }

  if (termsAccepted === false) {
    return (
      <AccessDeniedOverlay 
        language={language} 
        onReview={() => setTermsAccepted(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <button
        type="button"
        onClick={() => setIsMobileDrawerOpen(true)}
        className="fixed left-4 top-4 z-30 md:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-700 shadow-lg border border-slate-200"
        aria-label={language === 'th' ? 'เปิดเมนู' : 'Open menu'}
      >
        <Menu className="h-6 w-6" />
      </button>

      {isMobileDrawerOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
          onClick={() => setIsMobileDrawerOpen(false)}
          aria-label={language === 'th' ? 'ปิดเมนู' : 'Close menu'}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white border-r border-slate-200 flex-shrink-0 flex flex-col transform transition-transform duration-300 ease-out md:sticky md:top-0 md:z-10 md:h-screen md:w-64 md:max-w-none md:translate-x-0 ${isMobileDrawerOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="p-6">
            <div className="mb-4 flex justify-end md:hidden">
                <button
                    type="button"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    aria-label={language === 'th' ? 'ปิดเมนู' : 'Close menu'}
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
            <div 
                onClick={() => {
                  if (adminUser) {
                    showNotification(language === 'th' ? 'กรุณาออกจากระบบก่อนกลับไปหน้าผู้ใช้งาน' : 'Please log out before returning to User mode', 'info');
                    return;
                  }
                  navigateToView('dashboard');
                  setSelectedRoomId('ALL');
                  setFilterType('All');
                  setIsMobileDrawerOpen(false);
                }}
                className={`flex items-center space-x-2 text-brand-500 mb-6 transition-all ${adminUser ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-85 active:scale-[0.99]'}`}
            >
                <LayoutGrid className="w-8 h-8" />
                <span className="text-xl font-bold tracking-tight">YAGEO SmartRoom</span>
            </div>

            {/* Language Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-lg mb-6 border border-slate-200 shadow-sm">
                <button 
                    onClick={() => setLanguage('en')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${language === 'en' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    English
                </button>
                <button 
                    onClick={() => setLanguage('th')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${language === 'th' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    ภาษาไทย
                </button>
            </div>

            <div className="space-y-6">
                <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.menu}</h3>
                    <div className="space-y-1">
                        <button 
                            onClick={() => {
                              if (adminUser) {
                                showNotification(language === 'th' ? 'กรุณาออกจากระบบก่อนกลับไปหน้าผู้ใช้งาน' : 'Please log out before returning to User mode', 'info');
                                return;
                              }
                              navigateToView('dashboard');
                              setSelectedRoomId('ALL');
                              setIsMobileDrawerOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-3 ${currentView === 'dashboard' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'} ${adminUser ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <LayoutGrid className="w-5 h-5" />
                            <span>{language === 'th' ? 'ภาพรวมและแดชบอร์ด' : 'Overview & Dashboard'}</span>
                        </button>
                        
                        <button 
                            type="button"
                            onClick={() => {
                              setIsUserGuideOpen(true);
                              setIsMobileDrawerOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-3 text-slate-600 hover:bg-slate-50 cursor-pointer"
                        >
                            <BookOpen className="w-5 h-5" />
                            <span>{t.userGuideBtn}</span>
                        </button>
                    </div>
                </div>

                {currentView === 'dashboard' && (
                    <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.filterRooms}</h3>
                        <div className="space-y-1">
                            <button 
                                onClick={() => {
                                  setFilterType('All');
                                  setIsMobileDrawerOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${filterType === 'All' ? 'text-slate-900 bg-slate-100' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                <span>{t.allRoomsSelector}</span>
                                <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">{effectiveRooms.length}</span>
                            </button>
                            <button 
                                onClick={() => {
                                  setFilterType(RoomType.MEETING);
                                  setIsMobileDrawerOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${filterType === RoomType.MEETING ? 'text-slate-900 bg-slate-100' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                <span>{t.meetingRoom}</span>
                                <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">{effectiveRooms.filter(r => r.type === RoomType.MEETING).length}</span>
                            </button>
                            <button 
                                onClick={() => {
                                  setFilterType(RoomType.RECEPTION);
                                  setIsMobileDrawerOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${filterType === RoomType.RECEPTION ? 'text-slate-900 bg-slate-100' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                <span>{t.receptionArea}</span>
                                <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">{effectiveRooms.filter(r => r.type === RoomType.RECEPTION).length}</span>
                            </button>
                            <button 
                                onClick={() => {
                                  setFilterType(RoomType.TRAINING);
                                  setIsMobileDrawerOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${filterType === RoomType.TRAINING ? 'text-slate-900 bg-slate-100' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                <span>{t.trainingRoom}</span>
                                <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">{effectiveRooms.filter(r => r.type === RoomType.TRAINING).length}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Admin Link at bottom */}
        <div className="p-6 mt-auto border-t border-slate-200">
             <button 
                onClick={() => {
                  navigateToView('admin');
                  setIsMobileDrawerOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-3 ${currentView === 'admin' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
                <Settings className="w-5 h-5" />
                <span>{t.adminPanel}</span>
            </button>
        </div>

        <div className="px-6 py-6 border-t border-slate-100 hidden md:block">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">{t.liveStatus}</h3>
            <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">{t.totalRooms}</span>
                    <span className="font-semibold text-slate-900">{stats.total}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">{t.availableNow}</span>
                    <span className="font-semibold text-green-600">{stats.available}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">{t.occupied}</span>
                    <span className="font-semibold text-red-600">{stats.total - stats.available}</span>
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 pt-20 md:p-8 overflow-y-auto">

        {currentView === 'dashboard' && (
             <Dashboard 
                rooms={filteredRooms} 
                bookings={bookings} 
                maintenanceHistory={maintenanceHistory}
                language={language} 
                onDeleteBooking={handleDeleteBooking} 
                onConfirmBooking={handleConfirmBooking}
                onUpdateBooking={handleUpdateBooking}
                selectedRoomId={selectedRoomId}
                setSelectedRoomId={setSelectedRoomId}
             />
        )}
      </main>



      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        isDanger={confirmModal.isDanger}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Booking Modal */}
      <BookingModal
        room={selectedRoomForModal}
        existingBookings={selectedRoomBookings}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={(data) => handleConfirmBooking(selectedRoomForModal!, data)}
        language={language}
        initialDate={preselectedDate}
        initialHours={preselectedHours}
      />

      {/* AI Assistant */}
      <AIAssistant 
        currentBookings={bookings} 
        rooms={effectiveRooms} 
        language={language} 
        onBookRoom={handleBookRoom}
      />

      {/* Modern custom safe Toast message overlay */}
      {toast.isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`p-4 rounded-xl shadow-lg border flex items-center space-x-3 text-sm font-semibold max-w-sm ${
            toast.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
              : toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-100'
              : 'bg-slate-50 text-slate-800 border-slate-100'
          }`}>
            {toast.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            ) : toast.type === 'error' ? (
              <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-slate-500 flex-shrink-0" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button 
              type="button"
              onClick={() => setToast(prev => ({ ...prev, isOpen: false }))} 
              className="text-slate-400 hover:text-slate-600 font-bold px-1 text-md leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
      {/* Terms Agreement Overlay */}
      {termsAccepted === null && (
        <TermsModal 
          language={language}
          setLanguage={setLanguage}
          rooms={effectiveRooms}
          onAccept={handleAcceptTerms}
          onDecline={handleDeclineTerms}
        />
      )}

      {/* User Guide Manual Overlay */}
      {isUserGuideOpen && (
        <UserGuideModal 
          language={language}
          rooms={effectiveRooms}
          onClose={() => setIsUserGuideOpen(false)}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [routeMode, setRouteMode] = useState<RouteMode>(() => getRouteMode());
  const [language] = useState<'th' | 'en'>(() => getStoredLanguage());

  useEffect(() => {
    const handlePopState = () => setRouteMode(getRouteMode());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (routeMode === 'verify') {
    return <VerifyBookingPage language={language} />;
  }

  return <SmartRoomApplication />;
};

export default App;
