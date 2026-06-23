import React, { useState, useEffect, useMemo } from 'react';
import { Booking, Room, RoomType, BookingStatus, AdminUser, AdminRole } from '../types';
import { INITIAL_ADMIN_USERS, DEPARTMENTS } from '../constants';
import { Lock, Trash2, Search, Calendar, User, Clock, LayoutGrid, Edit, Plus, X, Save, Building2, IdCard, Check, XCircle, Shield, ShieldCheck, UserCog, LogIn, Upload, FileText, Flame, Sparkles, TrendingUp, Users, AlertCircle, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';
import { TRANSLATIONS, formatDate, formatTimeRange, translateText, translateAmenities, formatTimeValue, isRoomCurrentlyClosed } from '../translations';
import ConfirmationModal from './ConfirmationModal';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

export const CLOSURE_REASONS = [
  { key: 'Renovation', labelEn: 'Renovation', labelTh: 'ปิดปรับปรุงชั่วคราว' },
  { key: 'Electrical Maintenance', labelEn: 'Electrical Maintenance', labelTh: 'ซ่อมบำรุงระบบไฟฟ้า' },
  { key: 'AC Maintenance', labelEn: 'AC Maintenance', labelTh: 'ซ่อมบำรุงเครื่องปรับอากาศ' },
  { key: 'Cleaning', labelEn: 'Cleaning', labelTh: 'ทำความสะอาดใหญ่' },
  { key: 'Private Event', labelEn: 'Private Event', labelTh: 'กิจกรรมพิเศษ/ประชุมส่วนตัว' },
  { key: 'Equipment Repair', labelEn: 'Equipment Repair', labelTh: 'ซ่อมแซมอุปกรณ์ชำรุด' },
  { key: 'System Maintenance', labelEn: 'System Maintenance', labelTh: 'ซ่อมบำรุงระบบเครือข่ายและไอที' },
  { key: 'Other', labelEn: 'Other (Custom)', labelTh: 'อื่นๆ (ระบุเอง)' }
];

interface AdminPanelProps {
  rooms: Room[];
  bookings: Booking[];
  onDeleteBooking: (id: string) => void;
  onUpdateBooking?: (id: string, updatedFields: Partial<Booking>) => Promise<boolean>;
  onApproveBooking: (id: string) => void;
  onRejectBooking: (id: string) => void;
  onAddRoom: (room: Room) => void;
  onUpdateRoom: (room: Room) => void;
  onDeleteRoom: (id: string) => void;
  language: 'th' | 'en';
  setLanguage?: (lang: 'th' | 'en') => void;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  currentUser?: AdminUser | null;
  setCurrentUser?: (user: AdminUser | null) => void;
  onBackToUser?: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  rooms, 
  bookings, 
  onDeleteBooking,
  onUpdateBooking,
  onApproveBooking,
  onRejectBooking,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
  language,
  setLanguage,
  showNotification,
  currentUser: controlledCurrentUser,
  setCurrentUser: setControlledCurrentUser,
  onBackToUser
}) => {
  const t = TRANSLATIONS[language];

  // Auth State
  const [localCurrentUser, setLocalCurrentUser] = useState<AdminUser | null>(null);
  const currentUser = controlledCurrentUser !== undefined ? controlledCurrentUser : localCurrentUser;
  const updateCurrentUser = (user: AdminUser | null) => {
    setLocalCurrentUser(user);
    setControlledCurrentUser?.(user);
  };
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Data State with Firebase Persistence
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  // Real-time admins listener and seeding on Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'admins'), (snapshot) => {
      if (snapshot.empty) {
        console.log("Admins collection is empty, seeding defaults...");
        INITIAL_ADMIN_USERS.forEach(async (u) => {
          try {
            await setDoc(doc(db, 'admins', u.id), u);
          } catch (e) {
            console.error("Failed to seed admin", u.id, e);
          }
        });
      } else {
        const loadedAdmins: AdminUser[] = [];
        snapshot.forEach((snap) => {
          loadedAdmins.push(snap.data() as AdminUser);
        });
        setAdminUsers(loadedAdmins);
      }
    }, (error) => {
      console.warn("Could not list admins from Firestore (likely unauthenticated). Using local fallbacks:", error);
      setAdminUsers(INITIAL_ADMIN_USERS);
    });

    return () => unsubscribe();
  }, []);
  
  // UI State
  const [activeTab, setActiveTab ] = useState<'bookings' | 'rooms' | 'users' | 'analytics'>('bookings');
  
  const sortedRooms = useMemo(() => {
    const order: Record<string, number> = {
      [RoomType.MEETING]: 1,
      [RoomType.RECEPTION]: 2,
      [RoomType.TRAINING]: 3,
    };
    return [...rooms].sort((a, b) => {
      const scoreA = order[a.type] || 99;
      const scoreB = order[b.type] || 99;
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.name.localeCompare(b.name, language);
    });
  }, [rooms, language]);
  
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
  const [analyticsDateStr, setAnalyticsDateStr] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    password: '',
    employeeId: '',
    phone: '',
    department: 'HR',
    role: 'APPROVER' as AdminRole
  });
  const [newUserFormErrors, setNewUserFormErrors] = useState({
    password: '',
    employeeId: '',
    phone: ''
  });
  const passwordErrorMessage = language === 'th'
    ? 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลขอย่างน้อยอย่างละ 1 ตัว'
    : 'Password must be at least 8 characters and include at least 1 lowercase letter, 1 uppercase letter, and 1 number';
  const validatePassword = (password: string) => (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );

  // Room Form State
  const [roomForm, setRoomForm] = useState<Partial<Room>>({
    name: '',
    type: RoomType.MEETING,
    capacity: 1,
    amenities: [],
    imageUrl: ''
  });
  const [amenitiesString, setAmenitiesString] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = adminUsers.find(u => u.username === loginUsername && u.password === loginPassword);
    
    if (user) {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (authErr) {
        console.warn("Background Firebase Auth login failed (working offline?):", authErr);
      }
      updateCurrentUser(user);
      setLoginError('');
      if (user.role === 'APPROVER') {
          setActiveTab('bookings');
      }
    } else {
      setLoginError(t.invalidUserPass);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (user) {
        const isSuperMail = user.email === "phooriwat456@gmail.com";
        const adminDoc = adminUsers.find(u => u.username === user.email || u.id === user.uid);
        const role: AdminRole = isSuperMail ? 'SUPER_ADMIN' : (adminDoc ? adminDoc.role : 'APPROVER');
        
        updateCurrentUser({
          id: user.uid,
          username: user.email || user.displayName || 'Google Admin',
          password: '',
          role
        });
        setLoginError('');
      }
    } catch (e) {
      console.error("Google Authentication Failure", e);
      setLoginError(language === 'th' ? "การเข้าสู่ระบบด้วย Google ผิดพลาด" : "Google Authentication failed");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (currentUser?.role !== 'SUPER_ADMIN') {
          showNotification(language === 'th' ? "เฉพาะผู้ดูแลหลักระบบเท่านั้นที่สามารถสร้างผู้ดูแลระบบคนอื่นได้" : "Only Super Admins can create new admins", 'error');
          return;
      }

      const password = newUserForm.password.trim();
      const employeeId = newUserForm.employeeId.trim();
      const phone = newUserForm.phone.trim();
      const passwordError = validatePassword(password) ? '' : passwordErrorMessage;
      const employeeIdError = /^\d{7}$/.test(employeeId)
        ? ''
        : language === 'th'
          ? 'รหัสพนักงานต้องเป็นตัวเลข 7 หลัก'
          : 'Employee ID must be exactly 7 digits';
      const phoneError = /^\d{4}$/.test(phone)
        ? ''
        : language === 'th'
          ? 'เบอร์โต๊ะต้องเป็นตัวเลข 4 หลัก'
          : 'Desk Phone must be exactly 4 digits';

      if (passwordError || employeeIdError || phoneError) {
          setNewUserFormErrors({ password: passwordError, employeeId: employeeIdError, phone: phoneError });
          showNotification(passwordError || employeeIdError || phoneError, 'error');
          return;
      }
      setNewUserFormErrors({ password: '', employeeId: '', phone: '' });

      if (adminUsers.some(u => u.username === newUserForm.username)) {
          showNotification(t.usernameExists, 'error');
          return;
      }
      
      const newUserId = Math.random().toString(36).substr(2, 9);
      const newUser: AdminUser = {
          id: newUserId,
          username: newUserForm.username,
          password,
          role: newUserForm.role,
          employeeId,
          department: newUserForm.department,
          phone
      };
      
      try {
        await setDoc(doc(db, 'admins', newUserId), newUser);
        setIsUserModalOpen(false);
        setNewUserForm({ username: '', password: '', employeeId: '', phone: '', department: 'HR', role: 'APPROVER' });
        setNewUserFormErrors({ password: '', employeeId: '', phone: '' });
        showNotification(language === 'th' ? "เพิ่มแอดมินสำเร็จ!" : "Admin created successfully!", 'success');
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `admins/${newUserId}`);
      }
  };

  const handleDeleteUser = async (id: string) => {
      if (id === currentUser?.id) {
          setConfirmModal({
            isOpen: true,
            title: language === 'th' ? "ไม่สามารถดำเนินการได้" : "Action Restricted",
            message: t.cannotDeleteSelf,
            isDanger: false,
            confirmText: language === 'th' ? 'รับทราบ' : 'OK',
            cancelText: language === 'th' ? 'ปิด' : 'Close',
            onConfirm: () => {
              setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
          });
          return;
      }
      setConfirmModal({
        isOpen: true,
        title: language === 'th' ? 'ยืนยันการลบแอดมิน' : 'Confirm Delete Admin',
        message: t.confirmDeleteUser,
        isDanger: true,
        confirmText: language === 'th' ? 'ลบออก' : 'Delete',
        cancelText: language === 'th' ? 'ยกเลิก' : 'Cancel',
        onConfirm: async () => {
          try {
            await deleteDoc(doc(db, 'admins', id));
          } catch (e) {
            handleFirestoreError(e, OperationType.DELETE, `admins/${id}`);
          }
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      });
  };

  const getRoomName = (roomId: string) => {
    return rooms.find(r => r.id === roomId)?.name || 'Unknown Room';
  };

  const openAddRoomModal = () => {
    setEditingRoom(null);
    setRoomForm({
      name: '',
      type: RoomType.MEETING,
      capacity: 4,
      amenities: [],
      imageUrl: '',
      isClosed: false,
      closureReason: '',
      closureStartDate: '',
      closureEndDate: '',
      closureStartTime: 7,
      closureEndTime: 24
    });
    setAmenitiesString('');
    setIsRoomModalOpen(true);
  };

  const openEditRoomModal = (room: Room) => {
    setEditingRoom(room);
    setRoomForm({ 
      ...room,
      isClosed: room.isClosed || false,
      closureReason: room.closureReason || '',
      closureStartDate: room.closureStartDate || '',
      closureEndDate: room.closureEndDate || '',
      closureStartTime: room.closureStartTime !== undefined ? room.closureStartTime : 7,
      closureEndTime: room.closureEndTime !== undefined ? room.closureEndTime : 24
    });
    setAmenitiesString(room.amenities.join(', '));
    setIsRoomModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDimension = 620; // Perfect standard size for preview
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDimension) {
              height *= maxDimension / width;
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width *= maxDimension / height;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress image to JPEG at 70% quality to ensure it is very small (~40-60KB) and stays well below limits
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            setRoomForm(prev => ({ ...prev, imageUrl: compressedBase64 }));
          } else {
            setRoomForm(prev => ({ ...prev, imageUrl: reader.result as string }));
          }
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure Firebase auth session exists before save (attempt anonymous auth silently, but proceed anyway)
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (authErr) {
        console.warn("Firebase Anonymous Auth failed (continuing as guest/mock):", authErr);
      }
    }

    // Default premium workspace search pictures from Unsplash based on the selected RoomType
    let finalImageUrl = roomForm.imageUrl;
    if (!finalImageUrl) {
      if (roomForm.type === RoomType.MEETING) {
        finalImageUrl = 'https://images.unsplash.com/photo-1517502884422-41eaaced0168?auto=format&fit=crop&w=600&q=80';
      } else if (roomForm.type === RoomType.TRAINING) {
        finalImageUrl = 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80';
      } else {
        finalImageUrl = 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80';
      }
    }

    const amenities = amenitiesString.split(',').map(s => s.trim()).filter(s => s !== '');
    
    const { id: _, ...restRoomForm } = roomForm;

    const closureData = roomForm.isClosed ? {
      isClosed: true,
      closureReason: roomForm.closureReason || '',
      closureStartDate: roomForm.closureStartDate || '',
      closureEndDate: roomForm.closureEndDate || '',
      closureStartTime: roomForm.closureStartTime !== undefined ? roomForm.closureStartTime : 7,
      closureEndTime: roomForm.closureEndTime !== undefined ? roomForm.closureEndTime : 24
    } : {
      isClosed: false,
      closureReason: '',
      closureStartDate: '',
      closureEndDate: '',
      closureStartTime: 7,
      closureEndTime: 24
    };

    try {
      if (editingRoom) {
        await onUpdateRoom({ 
          ...editingRoom, 
          ...restRoomForm, 
          ...closureData,
          id: editingRoom.id, 
          imageUrl: finalImageUrl, 
          amenities 
        } as Room);
        showNotification(language === 'th' ? "บันทึกและแก้ไขข้อมูลห้องประชุมสำเร็จ!" : "Room updated successfully!", 'success');
      } else {
        const randomId = Math.random().toString(36).substr(2, 9);
        await onAddRoom({
          ...restRoomForm,
          ...closureData,
          id: randomId,
          imageUrl: finalImageUrl,
          amenities
        } as Room);
        showNotification(language === 'th' ? "เพิ่มห้องประชุมสำเร็จ!" : "Room created successfully!", 'success');
      }
      setIsRoomModalOpen(false);
    } catch (err: any) {
      console.error("Room Save Failure:", err);
      // Retrieve the clean error message if available
      let errorDesc = err.message || "";
      try {
        if (errorDesc.startsWith('{')) {
          const parsed = JSON.parse(errorDesc);
          errorDesc = parsed.error || errorDesc;
        }
      } catch (ex) {}

      showNotification(language === 'th'
        ? `เกิดข้อผิดพลาดในการบันทึกห้องประชุม: ${errorDesc || 'ไม่มีสิทธิ์ในการบันทึกหรือขนาดไฟล์รูปภาพใหญ่เกินไป'}`
        : `Failed to save room: ${errorDesc || 'Permission Denied or image file too large'}`, 'error');
    }
  };

  const analyticsBookingsForDate = useMemo(() => {
    return bookings.filter(b => {
      const year = b.startTime.getFullYear();
      const month = String(b.startTime.getMonth() + 1).padStart(2, '0');
      const day = String(b.startTime.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      return dateStr === analyticsDateStr;
    });
  }, [bookings, analyticsDateStr]);

  const analyticsData = useMemo(() => {
    const totalBookings = analyticsBookingsForDate.length;
    
    // Occupied hours per room (assume standard 10-hour workday segment: 08:00 - 18:00)
    const roomStats = sortedRooms.map(room => {
      const roomBookings = analyticsBookingsForDate.filter(b => b.roomId === room.id);
      let hoursBooked = 0;
      roomBookings.forEach(b => {
        const overlapStart = Math.max(b.startTime.getTime(), new Date(analyticsDateStr).setHours(0, 0, 0, 0));
        const overlapEnd = Math.min(b.endTime.getTime(), new Date(analyticsDateStr).setHours(23, 59, 59, 999));
        const diffMs = Math.max(0, overlapEnd - overlapStart);
        hoursBooked += diffMs / (1000 * 60 * 60);
      });
      
      const occupancyRate = Math.min(Math.round((hoursBooked / 10) * 100), 100); // Out of a standard 10-hour workday
      
      return {
        room,
        bookingsCount: roomBookings.length,
        hoursBooked: parseFloat(hoursBooked.toFixed(1)),
        occupancyRate
      };
    });

    const busiestRoomObj = [...roomStats].sort((a, b) => b.hoursBooked - a.hoursBooked)[0];
    const busiestRoom = busiestRoomObj && busiestRoomObj.hoursBooked > 0 ? busiestRoomObj.room.name : (language === 'th' ? 'ยังไม่มีการประชุม' : 'No bookings');

    // Department breakdown
    const departmentCounts: Record<string, number> = {};
    analyticsBookingsForDate.forEach(b => {
      const dept = b.department || 'Other';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });
    
    const departmentData = Object.entries(departmentCounts).map(([name, count]) => ({
      name,
      count,
      pct: totalBookings > 0 ? Math.round((count / totalBookings) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    // Peak booking hour
    const hourCounts = Array(24).fill(0);
    analyticsBookingsForDate.forEach(b => {
      const startH = b.startTime.getHours();
      const endH = b.endTime.getHours();
      for (let h = startH; h < endH; h++) {
        if (h >= 0 && h < 24) {
          hourCounts[h]++;
        }
      }
    });

    let peakHour = -1;
    let peakCount = 0;
    hourCounts.forEach((count, h) => {
      if (count > peakCount) {
        peakCount = count;
        peakHour = h;
      }
    });

    return {
      totalBookings,
      busiestRoom,
      busiestRoomHours: busiestRoomObj ? busiestRoomObj.hoursBooked : 0,
      departmentData,
      peakHour,
      peakCount,
      roomStats
    };
  }, [analyticsBookingsForDate, rooms, analyticsDateStr, language]);

  const navigateAnalyticsDate = (days: number) => {
    const newDate = new Date(analyticsDateStr);
    newDate.setDate(newDate.getDate() + days);
    
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const day = String(newDate.getDate()).padStart(2, '0');
    setAnalyticsDateStr(`${year}-${month}-${day}`);
  };

  const filteredBookings = bookings.filter(b => 
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.organizer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.department && b.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (b.employeeId && b.employeeId.toLowerCase().includes(searchTerm.toLowerCase())) ||
    getRoomName(b.roomId).toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

  const pendingCount = bookings.filter(b => b.status === BookingStatus.PENDING).length;

  const getRoomTypeLabel = (type: string) => {
    if (type === 'Meeting') return t.meetingRoom;
    if (type === 'Reception') return t.receptionArea;
    if (type === 'Training') return t.trainingRoom;
    return type;
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)] animate-in fade-in zoom-in duration-300">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="bg-brand-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-brand-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{t.adminPortal}</h2>
            <p className="text-slate-500 text-sm mt-2">{t.adminSignInSub}</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 ml-1">{t.username}</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all font-medium"
                    placeholder={t.enterUsername}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 ml-1">{t.password}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all font-medium"
                    placeholder={t.enterPassword}
                />
              </div>
            </div>
            {loginError && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg font-medium">{loginError}</p>}
            <button
              type="submit"
              className="w-full bg-brand-500 text-white py-2.5 rounded-xl font-bold hover:bg-brand-600 transition-colors shadow-sm hover:shadow flex items-center justify-center"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {t.signIn}
            </button>

            <div className="relative my-4 flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                {language === 'th' ? 'หรือเชื่อมต่อด้วย' : 'or continue with'}
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-white border border-slate-200 hover:border-slate-300 text-slate-700 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.67-.35-1.37-.35-2.09z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>{language === 'th' ? 'เข้าสู่ระบบด้วย Google' : 'Sign In with Google'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.welcomeBack}</h1>
          <p className="text-slate-500 font-medium">Username: <span className="font-semibold text-brand-500">{currentUser.username}</span>.</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
            <div className={`flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${currentUser.role === 'SUPER_ADMIN' ? 'bg-brand-100 text-brand-700' : 'bg-teal-100 text-teal-700'}`}>
                {currentUser.role === 'SUPER_ADMIN' ? <ShieldCheck className="w-4 h-4 mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                {currentUser.role === 'SUPER_ADMIN' ? t.superAdmin : t.approver}
            </div>
            <button 
                onClick={() => {
                    updateCurrentUser(null);
                    setLoginUsername('');
                    setLoginPassword('');
                }}
                className="text-sm text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors font-semibold"
            >
                {t.logout}
            </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex space-x-1 bg-white p-1 rounded-xl border border-slate-200 w-fit overflow-x-auto">
        <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center whitespace-nowrap ${activeTab === 'bookings' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
        >
            {t.bookingsTab}

        </button>

        <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center whitespace-nowrap ${activeTab === 'analytics' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
        >
            <BarChart2 className="w-4 h-4 mr-2" />
            {t.insightsStats}
        </button>
        
        {/* Room management is accessible to all admins */}
        <button
            onClick={() => setActiveTab('rooms')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'rooms' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
        >
            {t.roomMgmtTab}
        </button>

        {/* Only Super Admin can see User Management */}
        {currentUser.role === 'SUPER_ADMIN' && (
            <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center whitespace-nowrap ${activeTab === 'users' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
                <UserCog className="w-4 h-4 mr-2" />
                {t.userMgmtTab}
            </button>
        )}
      </div>

      {activeTab === 'bookings' && (
        <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-500 text-sm font-medium">{t.totalBookingsHeader}</span>
                    <Calendar className="w-5 h-5 text-indigo-500 opacity-75" />
                </div>
                <p className="text-3xl font-bold text-slate-800">{bookings.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-500 text-sm font-medium">{t.activeRooms}</span>
                    <LayoutGrid className="w-5 h-5 text-green-500 opacity-75" />
                </div>
                <p className="text-3xl font-bold text-slate-800">{rooms.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-500 text-sm font-medium">{t.upcomingToday}</span>
                    <Calendar className="w-5 h-5 text-brand-500 opacity-75" />
                </div>
                <p className="text-3xl font-bold text-slate-800">
                    {bookings.filter(b => {
                        const now = new Date();
                        return b.startTime.getDate() === now.getDate() && b.startTime > now && b.status === BookingStatus.CONFIRMED;
                    }).length}
                </p>
                </div>
            </div>

            {/* Booking Management Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="font-bold text-slate-800">{t.allBookings}</h2>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent font-medium"
                    />
                </div>
                </div>
                
                <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-3">{t.room}</th>
                        <th className="px-6 py-3">{t.dateTimeCol}</th>
                        <th className="px-6 py-3">{t.eventCol}</th>
                        <th className="px-6 py-3">{t.userCol}</th>
                        <th className="px-6 py-3">{t.status}</th>
                        <th className="px-6 py-3 text-right">{t.actionsCol}</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredBookings.length === 0 ? (
                        <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">
                            {t.noBookingsTable}
                        </td>
                        </tr>
                    ) : (
                        filteredBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">
                                    {getRoomName(booking.roomId)}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">
                                {formatDate(booking.startTime, language, { weekday: undefined, month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className="text-slate-500 text-xs font-semibold font-mono mt-0.5">
                                {formatTimeRange(booking.startTime, booking.endTime, language)}
                            </div>
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-800">{translateText(booking.title, language)}</td>
                            <td className="px-6 py-4 text-slate-500">
                                <div className="flex flex-col space-y-1">
                                    <div className="flex items-center">
                                        <User className="w-3 h-3 mr-1.5 text-brand-500" />
                                        {booking.organizer}
                                    </div>
                                    <div className="flex items-center text-xs text-slate-400">
                                        <IdCard className="w-3 h-3 mr-1.5" />
                                        {booking.employeeId || 'N/A'}
                                    </div>
                                    <div className="flex items-center text-xs text-slate-400">
                                        <Building2 className="w-3 h-3 mr-1.5" />
                                        {booking.department ? translateText(booking.department, language) : '-'}
                                    </div>
                                    {booking.deskNumber && (
                                        <div className="flex items-center text-xs text-slate-400">
                                            <span className="font-bold text-[10px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded mr-1.5 shrink-0">
                                                {language === 'th' ? 'โต๊ะ' : 'Desk'}
                                            </span>
                                            {booking.deskNumber}
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 mr-0">
                                {booking.status === BookingStatus.PENDING && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                                        {t.pendingApproval}
                                    </span>
                                )}
                                {booking.status === BookingStatus.CONFIRMED && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                        {t.confirmed}
                                    </span>
                                )}
                                {(booking.status === BookingStatus.REJECTED || !booking.status) && booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                        {language === 'th' ? "ปฏิเสธ" : "Rejected"}
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                    {booking.status === BookingStatus.PENDING && (
                                        <>
                                            <button
                                                onClick={() => onApproveBooking(booking.id)}
                                                className="text-white bg-green-500 hover:bg-green-600 p-1.5 rounded-lg transition-all shadow-sm"
                                                title="Approve"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onRejectBooking(booking.id)}
                                                className="text-white bg-orange-500 hover:bg-orange-600 p-1.5 rounded-lg transition-all shadow-sm"
                                                title="Reject"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                    {/* All admins can delete bookings */}
                                    <button
                                        onClick={() => onDeleteBooking(booking.id)}
                                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                        ))
                    )}
                    </tbody>
                </table>
                </div>
            </div>
        </>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
           {/* Date Navigator Header for Analytics */}
           <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center space-x-2">
                 <button 
                    onClick={() => navigateAnalyticsDate(-1)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600"
                    title={language === 'th' ? "วันก่อนหน้า" : "Previous day"}
                 >
                    <ChevronLeft className="w-5 h-5" />
                 </button>
                 <div className="text-sm font-bold text-slate-800">
                    {formatDate(new Date(analyticsDateStr), language, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                 </div>
                 <button 
                    onClick={() => navigateAnalyticsDate(1)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600"
                    title={language === 'th' ? "วันถัดไป" : "Next day"}
                 >
                    <ChevronRight className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="text-xs text-slate-500 font-bold">
                 {t.insightsStats} - {language === 'th' ? "โหมดผู้ดูแลระบบ" : "Admin Mode"}
              </div>
           </div>

           {/* Metrics Stats Grid */}
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
                 <div className="p-3 rounded-lg bg-brand-50 text-brand-600">
                    <FileText className="w-6 h-6" />
                 </div>
                 <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.totalBookingsHeader}</div>
                    <div className="text-2xl font-bold text-slate-800">{analyticsData.totalBookings}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-bold">{t.todayScheduled}</div>
                 </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
                 <div className="p-3 rounded-lg bg-orange-50 text-orange-600">
                    <Flame className="w-6 h-6 animate-pulse" />
                 </div>
                 <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.busiestRoomHeader}</div>
                    <div className="text-lg font-bold text-slate-800 truncate max-w-[150px]" title={analyticsData.busiestRoom}>{analyticsData.busiestRoom}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-bold">{analyticsData.busiestRoomHours > 0 ? `${analyticsData.busiestRoomHours} ${t.hoursBookedLabel}` : t.noReservations}</div>
                 </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
                 <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">
                    <Clock className="w-6 h-6" />
                 </div>
                 <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.peakActiveTime}</div>
                    <div className="text-2xl font-bold text-slate-800">
                       {analyticsData.peakHour !== -1 ? formatTimeValue(analyticsData.peakHour, language) : (language === 'th' ? 'ไม่มี' : 'None')}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-bold">{analyticsData.peakCount > 0 ? `${analyticsData.peakCount} ${t.overlappingBookings}` : t.noOverlappingBookings}</div>
                 </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
                 <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
                    <TrendingUp className="w-6 h-6" />
                 </div>
                 <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.departmentMax}</div>
                    <div className="text-lg font-bold text-slate-800 truncate max-w-[150px]">
                       {analyticsData.departmentData[0] ? analyticsData.departmentData[0].name : (language === 'th' ? 'ไม่มี' : 'None')}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-bold">{analyticsData.departmentData[0] ? `${analyticsData.departmentData[0].count} ${t.bookingsTotal}` : `0 ${t.bookingsTotal}`}</div>
                 </div>
              </div>
           </div>

           {/* Dual Column Chart lists */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Room Occupancy Rates */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-slate-800">
                 <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4 flex items-center">
                    <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />
                    {t.occupancyLoadHeader}
                 </h4>
                 <p className="text-xs text-slate-400 mb-6 font-semibold">{t.occupancyLoadSub}</p>
                 
                 <div className="space-y-4">
                    {analyticsData.roomStats.map(item => (
                       <div key={item.room.id} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-705">
                             <span>{item.room.name} ({getRoomTypeLabel(item.room.type)})</span>
                             <span className="font-bold text-slate-800">{item.occupancyRate}% ({item.hoursBooked} {language === 'th' ? "ชม." : "hrs"})</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                             <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                   item.occupancyRate >= 80 
                                      ? 'bg-red-500' 
                                      : item.occupancyRate >= 50 
                                          ? 'bg-amber-500' 
                                          : 'bg-brand-500'
                                }`}
                                style={{ width: `${item.occupancyRate}%` }}
                             />
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              {/* Right Column: Department share */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between text-slate-800">
                 <div>
                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4 flex items-center">
                       <Users className="w-4 h-4 mr-2 text-indigo-500" />
                       {t.deptVolumeHeader}
                    </h4>
                    <p className="text-xs text-slate-400 mb-6 font-semibold">{t.deptVolumeSub}</p>

                    {analyticsData.departmentData.length === 0 ? (
                       <div className="text-center py-8 text-slate-400 text-sm italic font-bold">{t.noDeptBookings}</div>
                    ) : (
                       <div className="space-y-4">
                          {analyticsData.departmentData.map((dept, index) => (
                             <div key={dept.name} className="space-y-1.5">
                                <div className="flex justify-between items-center text-xs font-bold text-slate-707">
                                   <span className="flex items-center">
                                      <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: `hsl(${15 + index * 60}, 75%, 60%)` }} />
                                      {translateText(dept.name, language)}
                                   </span>
                                   <span className="font-bold text-slate-800">{dept.count} {language === 'th' ? "ครั้ง" : "Bookings"} ({dept.pct}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                   <div 
                                      className="h-full rounded-full transition-all duration-300" 
                                      style={{ 
                                         width: `${dept.pct}%`,
                                         backgroundColor: `hsl(${15 + index * 60}, 75%, 60%)`
                                      }} 
                                   />
                                </div>
                             </div>
                          ))}
                       </div>
                    )}
                 </div>
                 
                 <div className="p-3 bg-indigo-50/50 border border-indigo-150 rounded-xl mt-6 text-[11px] text-slate-600 flex items-start font-medium">
                    <AlertCircle className="w-4 h-4 mr-2 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <span>{t.insightsFooter}</span>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'rooms' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-slate-800">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="font-bold text-slate-800">{t.roomMgmtTab}</h2>
                    <button 
                        onClick={openAddRoomModal}
                        className="flex items-center space-x-2 bg-brand-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-brand-600 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{t.addRoom}</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">{t.name}</th>
                                <th className="px-6 py-3">{t.type}</th>
                                <th className="px-6 py-3">{t.capacity}</th>
                                <th className="px-6 py-3">{t.amenities}</th>
                                <th className="px-6 py-3">{t.roomStatusCol}</th>
                                <th className="px-6 py-3 text-right">{t.actionsCol}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {sortedRooms.map(room => (
                                <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-slate-900">{room.name}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                                            {getRoomTypeLabel(room.type)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{room.capacity} {t.ppl}</td>
                                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                                        {translateAmenities(room.amenities, language).join(', ')}
                                    </td>
                                    <td className="px-6 py-4">
                                        {isRoomCurrentlyClosed(room) ? (
                                            <div className="flex flex-col">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                                                    ● {t.statusClosed}
                                                </span>
                                                {room.closureReason && (
                                                    <span className="text-[10px] font-bold text-rose-500 -mt-0.5 truncate max-w-[150px]" title={translateText(room.closureReason, language)}>
                                                        {translateText(room.closureReason, language)}
                                                    </span>
                                                )}
                                                {(room.closureStartDate || room.closureStartTime !== undefined) && (
                                                    <span className="text-[9px] text-slate-500 font-semibold font-mono mt-0.5">
                                                        {room.closureStartDate && `${room.closureStartDate}`}
                                                        {room.closureStartTime !== undefined && ` [${String(room.closureStartTime).padStart(2, '0')}:00-${String(room.closureEndTime || 24).padStart(2, '0')}:00]`}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                                ● {t.statusOpen}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => openEditRoomModal(room)}
                                                className="text-slate-400 hover:text-brand-500 hover:bg-brand-50 p-2 rounded-lg transition-all"
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onDeleteRoom(room.id)}
                                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
      )}

      {activeTab === 'users' && currentUser.role === 'SUPER_ADMIN' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-slate-800">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="font-bold text-slate-800">{t.userMgmtTab}</h2>
                    <button 
                        onClick={() => {
                            setNewUserFormErrors({ password: '', employeeId: '', phone: '' });
                            setIsUserModalOpen(true);
                        }}
                        className="flex items-center space-x-2 bg-brand-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-brand-600 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{t.addAdmin}</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">{t.username}</th>
                                <th className="px-6 py-3">{t.role}</th>
                                <th className="px-6 py-3">{t.password}</th>
                                <th className="px-6 py-3 text-right">{t.actionsCol}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {adminUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-slate-900 flex items-center">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center mr-3">
                                            <User className="w-4 h-4 text-slate-500" />
                                        </div>
                                        {user.username}
                                        {user.id === currentUser.id && <span className="ml-2 text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-bold">(You)</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${user.role === 'SUPER_ADMIN' ? 'bg-brand-100 text-brand-700' : 'bg-teal-100 text-teal-700'}`}>
                                            {user.role === 'SUPER_ADMIN' ? t.superAdmin : t.approver}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 font-mono text-xs font-semibold">
                                        {user.password}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {user.id !== currentUser.id && (
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
          </div>
      )}

      {/* Add/Edit Room Modal */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">
                        {editingRoom ? t.editRoom : t.addNewRoom}
                    </h3>
                    <button onClick={() => setIsRoomModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleRoomSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">{t.roomName}</label>
                        <input 
                            required
                            type="text"
                            value={roomForm.name}
                            onChange={(e) => setRoomForm({...roomForm, name: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                            placeholder="e.g. Conference Room A"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">{t.type}</label>
                            <select 
                                value={roomForm.type}
                                onChange={(e) => setRoomForm({...roomForm, type: e.target.value as RoomType})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold"
                            >
                                <option value={RoomType.MEETING}>{t.meetingRoom}</option>
                                <option value={RoomType.RECEPTION}>{t.receptionArea}</option>
                                <option value={RoomType.TRAINING}>{t.trainingRoom}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">{t.capacity}</label>
                            <input 
                                required
                                type="number"
                                min="1"
                                value={roomForm.capacity}
                                onChange={(e) => setRoomForm({...roomForm, capacity: parseInt(e.target.value)})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">{t.amenitiesCommaSeparated}</label>
                        <input 
                            type="text"
                            value={amenitiesString}
                            onChange={(e) => setAmenitiesString(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                            placeholder={t.amenitiesPlaceholder}
                        />
                    </div>



                    <div className="border-t border-slate-100 pt-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-slate-800">{t.roomStatusLabel}</label>
                            <div className="flex items-center space-x-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setRoomForm({...roomForm, isClosed: false})}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${!roomForm.isClosed ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {t.statusOpen}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRoomForm({...roomForm, isClosed: true})}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${roomForm.isClosed ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {t.statusClosed}
                                </button>
                            </div>
                        </div>

                        {roomForm.isClosed && (
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-in slide-in-from-top-2 duration-150">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">{t.closureReasonLabel}</label>
                                    <select
                                        value={
                                          roomForm.closureReason === ''
                                            ? ''
                                            : CLOSURE_REASONS.some(r => r.key === roomForm.closureReason)
                                              ? roomForm.closureReason
                                              : 'Other'
                                        }
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === 'Other') {
                                            // Set a dynamic placeholder reason for User to start editing
                                            setRoomForm({ ...roomForm, closureReason: language === 'th' ? 'ปรับปรุงห้อง' : 'Custom Renovation' });
                                          } else {
                                            setRoomForm({ ...roomForm, closureReason: val });
                                          }
                                        }}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium bg-white"
                                    >
                                        <option value="">{language === 'th' ? '-- เลือกสาเหตุการปิดห้อง --' : '-- Select Closure Reason --'}</option>
                                        {CLOSURE_REASONS.map(r => (
                                          <option key={r.key} value={r.key}>
                                            {language === 'th' ? r.labelTh : r.labelEn}
                                          </option>
                                        ))}
                                    </select>

                                    {/* Show text input only if 'Other' is selected or a custom reason (not matching any standard values) exists */}
                                    {(roomForm.closureReason !== '' && 
                                      !CLOSURE_REASONS.some(r => r.key === roomForm.closureReason && r.key !== 'Other')) && (
                                        <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <input 
                                                type="text"
                                                value={roomForm.closureReason === 'Custom Renovation' || roomForm.closureReason === 'ปรับปรุงห้อง' ? '' : roomForm.closureReason || ''}
                                                onChange={(e) => setRoomForm({...roomForm, closureReason: e.target.value})}
                                                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium bg-white"
                                                placeholder={language === 'th' ? 'กรุณาระบุกิจกรรม/สาเหตุของท่าน...' : 'Please specify-your custom reason...'}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">{t.closureStartDateLabel}</label>
                                        <input 
                                            type="date"
                                            value={roomForm.closureStartDate || ''}
                                            onChange={(e) => setRoomForm({...roomForm, closureStartDate: e.target.value})}
                                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">{t.closureEndDateLabel}</label>
                                        <input 
                                            type="date"
                                            value={roomForm.closureEndDate || ''}
                                            onChange={(e) => setRoomForm({...roomForm, closureEndDate: e.target.value})}
                                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium bg-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">{t.closureStartTimeLabel}</label>
                                        <select
                                            value={roomForm.closureStartTime !== undefined ? roomForm.closureStartTime : 7}
                                            onChange={(e) => setRoomForm({...roomForm, closureStartTime: parseInt(e.target.value)})}
                                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold bg-white"
                                        >
                                            {Array.from({ length: 17 }, (_, i) => i + 7).map(h => (
                                                <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">{t.closureEndTimeLabel}</label>
                                        <select
                                            value={roomForm.closureEndTime !== undefined ? roomForm.closureEndTime : 24}
                                            onChange={(e) => setRoomForm({...roomForm, closureEndTime: parseInt(e.target.value)})}
                                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold bg-white"
                                        >
                                            {Array.from({ length: 18 }, (_, i) => i + 7).map(h => (
                                                <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex space-x-3">
                        <button 
                            type="button"
                            onClick={() => setIsRoomModalOpen(false)}
                            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
                        >
                            {t.cancel}
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-bold flex justify-center items-center"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {t.saveRoom}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Add User Modal */}
      {isUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">{t.addNewAdmin}</h3>
                    <button
                        onClick={() => {
                            setNewUserFormErrors({ password: '', employeeId: '', phone: '' });
                            setIsUserModalOpen(false);
                        }}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                {t.username} <span className="text-rose-500">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                value={newUserForm.username}
                                onChange={(e) => setNewUserForm({...newUserForm, username: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                                placeholder="Username / Email"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                {t.password} <span className="text-rose-500">*</span>
                            </label>
                            <input
                                required
                                type="password"
                                value={newUserForm.password}
                                onChange={(e) => {
                                    const password = e.target.value;
                                    setNewUserForm({...newUserForm, password});
                                    setNewUserFormErrors(prev => ({
                                        ...prev,
                                        password: prev.password && validatePassword(password.trim()) ? '' : prev.password
                                    }));
                                }}
                                aria-invalid={Boolean(newUserFormErrors.password)}
                                aria-describedby={newUserFormErrors.password ? 'new-admin-password-error' : undefined}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 font-medium ${
                                    newUserFormErrors.password
                                        ? 'border-rose-300 focus:ring-rose-500'
                                        : 'border-slate-300 focus:ring-brand-500'
                                }`}
                                placeholder="Password"
                            />
                            {newUserFormErrors.password && (
                                <p id="new-admin-password-error" className="mt-1 text-xs font-semibold text-rose-600">
                                    {newUserFormErrors.password}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                {language === 'th' ? 'รหัสประจำตัวพนักงาน' : 'Employee ID'} <span className="text-rose-500">*</span>
                            </label>
                            <input
                                required
                                id="new-admin-employee-id"
                                type="text"
                                inputMode="numeric"
                                maxLength={7}
                                value={newUserForm.employeeId}
                                onChange={(e) => {
                                    const employeeId = e.target.value.replace(/\D/g, '').slice(0, 7);
                                    setNewUserForm({...newUserForm, employeeId});
                                    setNewUserFormErrors(prev => ({
                                        ...prev,
                                        employeeId: prev.employeeId && /^\d{7}$/.test(employeeId.trim()) ? '' : prev.employeeId
                                    }));
                                }}
                                aria-invalid={Boolean(newUserFormErrors.employeeId)}
                                aria-describedby={newUserFormErrors.employeeId ? 'new-admin-employee-id-error' : undefined}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 font-medium ${
                                    newUserFormErrors.employeeId
                                        ? 'border-rose-300 focus:ring-rose-500'
                                        : 'border-slate-300 focus:ring-brand-500'
                                }`}
                                placeholder="e.g. 1234567"
                            />
                            {newUserFormErrors.employeeId && (
                                <p id="new-admin-employee-id-error" className="mt-1 text-xs font-semibold text-rose-600">
                                    {newUserFormErrors.employeeId}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                {language === 'th' ? 'เบอร์โต๊ะ/เบอร์โทรศัพท์' : 'Desk Phone'} <span className="text-rose-500">*</span>
                            </label>
                            <input
                                required
                                id="new-admin-phone"
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                value={newUserForm.phone}
                                onChange={(e) => {
                                    const phone = e.target.value.replace(/\D/g, '').slice(0, 4);
                                    setNewUserForm({...newUserForm, phone});
                                    setNewUserFormErrors(prev => ({
                                        ...prev,
                                        phone: prev.phone && /^\d{4}$/.test(phone.trim()) ? '' : prev.phone
                                    }));
                                }}
                                aria-invalid={Boolean(newUserFormErrors.phone)}
                                aria-describedby={newUserFormErrors.phone ? 'new-admin-phone-error' : undefined}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 font-medium ${
                                    newUserFormErrors.phone
                                        ? 'border-rose-300 focus:ring-rose-500'
                                        : 'border-slate-300 focus:ring-brand-500'
                                }`}
                                placeholder="e.g. 5678"
                            />
                            {newUserFormErrors.phone && (
                                <p id="new-admin-phone-error" className="mt-1 text-xs font-semibold text-rose-600">
                                    {newUserFormErrors.phone}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                {t.department} <span className="text-rose-500">*</span>
                            </label>
                            <select
                                required
                                value={newUserForm.department}
                                onChange={(e) => setNewUserForm({...newUserForm, department: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold bg-white"
                            >
                                {DEPARTMENTS.map(d => (
                                    <option key={d} value={d}>{translateText(d, language)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                {t.role} <span className="text-rose-500">*</span>
                            </label>
                            <select
                                required
                                value={newUserForm.role}
                                onChange={(e) => setNewUserForm({...newUserForm, role: e.target.value as AdminRole})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold bg-white"
                            >
                                <option value="APPROVER">{t.approverRoleLabel}</option>
                                <option value="SUPER_ADMIN">{t.superAdminRoleLabel}</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex space-x-3">
                        <button 
                            type="button"
                            onClick={() => {
                                setNewUserFormErrors({ password: '', employeeId: '', phone: '' });
                                setIsUserModalOpen(false);
                            }}
                            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
                        >
                            {t.cancel}
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-bold"
                        >
                            {t.createAdminUser}
                        </button>
                    </div>
                </form>
            </div>
          </div>
      )}

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
    </div>
  );
};

export default AdminPanel;
