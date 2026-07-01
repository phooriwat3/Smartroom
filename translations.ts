import { Room } from './types';
import { BOOKING_START_HOUR, BOOKING_END_HOUR } from './constants';

export const TRANSLATIONS = {
  en: {
    roomOverview: "Room Overview",
    dashboard: "Dashboard",
    adminPanel: "TOKIN Smart Room Admin",
    menu: "Menu",
    filterRooms: "Filter Rooms",
    allRooms: "All Rooms",
    meetingRoom: "Meeting Room",
    receptionArea: "Reception Area",
    trainingRoom: "Training Room",
    liveStatus: "Live Status",
    totalRooms: "Total Rooms",
    availableNow: "Available Now",
    occupiedNow: "Occupied Now",
    occupied: "Occupied Now",
    manageBookings: "Manage bookings and view room availability.",
    ppl: "ppl",
    scheduleToday: "Schedule Today",
    noBookingsToday: "No bookings today.",
    bookRoom: "Book Room",
    available: "Available",
    pending: "Pending",
    more: "more",
    availabilityLabel: "Availability",
    select: "Select",
    free: "Free",
    booked: "Booked",
    bookBtn: "Book",
    people: "People",
    date: "Date",
    meetingTitle: "Meeting Title",
    organizerName: "Name",
    employeeId: "Employee ID",
    department: "Department",
    selectDept: "Select Dept",
    startTime: "Start Time",
    endTime: "End Time",
    cancel: "Cancel",
    save: "Save",
    confirm: "Confirm",
    errSelectDateTime: "Please select date, start time, and end time.",
    errSelectDept: "Please select a department.",
    errEnterEmpId: "Please enter Employee ID.",
    errEndTimeAfter: "End time must be after start time.",
    errOverlap: "This time slot overlaps with an existing booking.",
    scheduleDashboard: "TOKIN Smart Room Dashboard",
    overviewAllRooms: "Overview and schedules for all rooms.",
    detailedTimelineFor: "Detailed timeline for",
    today: "Today",
    statusCards: "Status",
    timelineGrid: "Timeline Grid",
    insightsStats: "Insights & Stats",
    schedulesFor: "Schedules for",
    pax: "Pax",
    currentBooking: "Current Booking",
    itinerary: "Itinerary",
    freeAllDay: "Free all day",
    room: "Room",
    confirmedBooked: "Confirmed Booked",
    pendingWaitApproval: "Pending Wait Approval",
    hoverTip: "💡 Hover over a slot box to view full title and organizer information.",
    totalBookingsHeader: "Total Bookings",
    todayScheduled: "scheduled for today",
    busiestRoomHeader: "Busiest Room",
    hoursBookedLabel: "hours booked",
    noReservations: "No reservations",
    peakActiveTime: "Peak Active Time",
    overlappingBookings: "overlapping bookings",
    noOverlappingBookings: "No overlapping bookings",
    departmentMax: "Department Max",
    bookingsTotal: "bookings total",
    occupancyLoadHeader: "Room Occupancy Load Indicator (10-Hr Workday)",
    occupancyLoadSub: "Percentage calculation representing daily booked load relative to standard 12 workday hours (7:00 AM - 7:00 PM).",
    deptVolumeHeader: "Booking Volume by Department",
    deptVolumeSub: "Proportional distribution of current daily room reservations across operational departments.",
    noDeptBookings: "No bookings registered for today.",
    insightsFooter: "Insights are derived using local memory cache databases. Booking patterns show load spikes on specific department requests.",
    fullDailyAgenda: "Full Daily Agenda",
    noRoomsBookings: "No bookings scheduled across any of the rooms.",
    bookingTitle: "Booking Title",
    organizerStaff: "Organizer / Staff",
    timeSlot: "Time slot",
    status: "Status",
    pendingApproval: "Pending approval",
    confirmed: "Confirmed",
    roomInfoList: "Room Info & List",
    bookingsFor: "Bookings for",
    noBookingsDate: "No bookings for this date.",
    chatWelcomeMsg: "Hello! I am your TOKIN Smart Room Assistant. Ask me about room availability or recommendations.",
    smartAssistant: "Smart Assistant",
    poweredByGemini: "Powered by Gemini",
    askForRoomPlaceholder: "Ask for a room...",
    adminPortal: "TOKIN Smart Room Admin Portal",
    adminSignInSub: "Sign in to manage the office.",
    languageLabel: "Language",
    thaiLanguage: "Thai",
    englishLanguage: "English",
    username: "Username",
    password: "Password",
    currentAdmin: "Username",
    enterUsername: "Enter username",
    enterPassword: "Enter password",
    signIn: "Sign In",
    orContinueWith: "or continue with",
    signInWithGoogle: "Sign In with Google",
    googleAuthFailed: "Google Authentication failed",
    invalidUserPass: "Invalid username or password",
    welcomeBack: "Welcome back",
    superAdmin: "Super Admin",
    approver: "Approver",
    logout: "Logout",
    bookingsTab: "Bookings",
    roomMgmtTab: "Room Management",
    userMgmtTab: "Admin Management",
    emailHistoryTab: "Email Sent History",
    emailHistoryTitle: "Email Sent History",
    emailHistorySub: "Persistent log of booking verification emails sent by TOKIN Smart Room.",
    refreshEmailHistory: "Refresh",
    loadingEmailHistory: "Loading email history",
    recipientCol: "Recipient",
    subjectPurposeCol: "Subject / Purpose",
    relatedCol: "Related Booking / Room",
    sentAtCol: "Sent Date & Time",
    sentStatusCol: "Sent Status",
    noEmailHistory: "No sent email history found.",
    emailStatusSuccessful: "Successful",
    emailStatusFailed: "Failed",
    emailHistoryLoadFailed: "Could not load email sent history.",
    bookingVerificationPurpose: "Booking Verification",
    bookingLabel: "Booking",
    roomLabel: "Room",
    errorLabel: "Error",
    noRelatedItem: "No related item",
    pendingRequests: "Pending Requests",
    activeRooms: "Active Rooms",
    upcomingToday: "Upcoming Today",
    allBookings: "All Bookings",
    searchPlaceholder: "Search name, ID, or room...",
    dateTimeCol: "Date & Time",
    eventCol: "Event",
    userCol: "User",
    actionsCol: "Actions",
    noBookingsTable: "No bookings found.",
    addRoom: "Add Room",
    image: "Image",
    name: "Name",
    unknownRoom: "Unknown Room",
    type: "Type",
    capacity: "Capacity",
    amenities: "Amenities",
    addAdmin: "Add Admin",
    role: "Role",
    addNewRoom: "Add New Room",
    editRoom: "Edit Room",
    roomName: "Room Name",
    roomNamePlaceholder: "e.g. Conference Room A",
    amenitiesPlaceholder: "TV, Whiteboard, Projector",
    amenitiesCommaSeparated: "Amenities (comma separated)",
    roomImage: "Room Image",
    clickToUpload: "Click to upload",
    orDragDrop: "or drag and drop",
    uploadRoomImageHelp: "Upload JPG or PNG. The image will appear on room cards and detail panels.",
    replaceRoomImage: "Replace image",
    saveRoom: "Save Room",
    addNewAdmin: "Add New Admin",
    createAdminUser: "Create User",
    adminPasswordRequirement: "Password must be at least 8 characters and include at least 1 lowercase letter, 1 uppercase letter, and 1 number",
    employeeIdSevenDigits: "Employee ID must be exactly 7 digits",
    deskPhone: "Desk Phone",
    deskShort: "Desk",
    deskPhoneFourDigits: "Desk Phone must be exactly 4 digits",
    usernameEmailPlaceholder: "Username / Email",
    passwordPlaceholder: "Password",
    employeeIdPlaceholder: "e.g. 1234567",
    deskPhonePlaceholder: "e.g. 5678",
    onlySuperAdminsCanCreate: "Only Super Admins can create new admins",
    adminCreatedSuccess: "Admin created successfully!",
    usernameExists: "Username already exists",
    cannotDeleteSelf: "You cannot delete yourself.",
    actionRestricted: "Action Restricted",
    ok: "OK",
    deleteAdminTitle: "Confirm Delete Admin",
    deleteButton: "Delete",
    confirmDeleteUser: "Are you sure you want to delete this admin user?",
    confirmDeleteRoom: "Are you sure you want to delete this room? This will also remove associated bookings.",
    confirmDeleteBooking: "Are you sure you want to delete this booking?",
    confirmRejectBooking: "Are you sure you want to reject this booking?",
    bookingConfirmedOk: "Booking confirmed successfully!",
    roomUpdatedSuccess: "Room updated successfully!",
    roomCreatedSuccess: "Room created successfully!",
    roomSaveFailed: "Failed to save room: {reason}",
    roomSaveFallbackReason: "Permission Denied or image file too large",
    noBookings: "No bookings",
    adminModeLabel: "Admin Mode",
    none: "None",
    previousDay: "Previous day",
    nextDay: "Next day",
    hoursShort: "hrs",
    timesCount: "Bookings",
    verified: "Verified",
    waitForVerify: "Wait for Verify",
    roomInUseStatus: "Room In Use",
    usedRoomStatus: "Used",
    cancelledNoVerification: "Cancelled / No verification",
    rejected: "Rejected",
    approve: "Approve",
    reject: "Reject",
    edit: "Edit",
    currentUserBadge: "(You)",
    allRoomsSelector: "All Rooms",
    selectDeptOption: "Select Dept",
    approverRoleLabel: "Approver (Can only Approve/Reject)",
    superAdminRoleLabel: "Super Admin (Full Access)",
    roomStatusLabel: "Room Availability Status",
    statusOpen: "Open / Available",
    statusClosed: "Temporarily Disabled",
    closureReasonLabel: "Closure / Renovation Reason",
    closureReasonPlaceholder: "State reason, e.g., Room renovation or maintenance",
    closureSelectedDateLabel: "Temporary Disabled Date",
    selectDisableDateFirst: "Select a date first, then choose the disabled time range for that date.",
    closureDateRequired: "Please select a temporary disabled date.",
    closureTimeInvalid: "End hour must be after start hour and within booking hours.",
    closureReasonSelectPlaceholder: "-- Select Closure Reason --",
    customClosureReasonPlaceholder: "Please specify your custom reason...",
    customRenovationReason: "Custom Renovation",
    closureDateRangeLabel: "Closure Date Range (Optional)",
    closureStartDateLabel: "Start Date (MM/DD/YYYY)",
    closureEndDateLabel: "End Date (MM/DD/YYYY)",
    closureTimeRangeLabel: "Closure Time Range (Optional)",
    closureStartTimeLabel: "Start Hour",
    closureEndTimeLabel: "End Hour",
    closureAllDay: "All Day (07:00 - 19:00)",
    roomIsClosedAlert: "This room is temporarily closed for: ",
    roomClosedSubtitle: "(Temporarily Disabled)",
    roomStatusCol: "Availability",
    allDayClosedText: "Temporarily disabled all day",
    tempClosedText: "Temporarily disabled {timeRange}",
    yearlyView: "Yearly",
    monthlyView: "Monthly",
    weeklyView: "Weekly",
    dailyView: "Daily",
    selectYear: "Select Year",
    selectMonth: "Select Month",
    selectWeek: "Select Week",
    roomUsageHistory: "Room Usage History",
    departmentUsageRank: "Department Usage Rank",
    purpose: "Purpose / Title",
    noHistory: "No history found for the selected timeframe.",
    roomRankHeader: "Room Popularity & Usage Rankings",
    termsTitle: "Room Service Agreement & Rules",
    acceptTerms: "I Accept the Service Agreement",
    declineTerms: "Decline",
    declineTitle: "Access Denied",
    declineMessage: "You must accept the Room Service Agreement and rules to access and book search/meeting rooms.",
    reviewTermsBtn: "Review Agreement Rules",
    userGuideBtn: "User Guide",
    userGuideTitle: "TOKIN Smart Room User Guide & Manual",
    close: "Close",
    ruleEligibleTitle: "1. Eligible Users",
    ruleEligibleDesc: "TOKIN employees and authorized office personnel may book rooms using their own name, employee ID, department, desk number, and YAGEO email.",
    ruleSystemOnlyTitle: "2. Official Booking and Date Format",
    ruleSystemOnlyDesc: "All reservations must be created in TOKIN Smart Room. Dates are shown as MM/DD/YYYY, times use the room schedule from 7:00 AM to 7:00 PM, and bookings must not overlap existing reservations or temporary disabled periods.",
    ruleLateTitle: "3. Verification Email and 15-Minute Check-in Window",
    ruleLateDesc: "After booking, the system sends or schedules a verification email. The link can be used from 15 minutes before until 15 minutes after the booking start time. If the booking is not verified/check-in within that window, the system may release the room and mark the booking as cancelled/no verification.",
    ruleCapacityTitle: "4. Capacity and Correct Booking Details",
    ruleCapacityDesc: "Users must choose a suitable room, stay within room capacity, and provide accurate purpose, booker name, employee ID, department, desk phone/desk number, and email details.",
    ruleFoodTitle: "5. Room Availability and Maintenance",
    ruleFoodDesc: "Rooms marked as Temporarily Disabled or under maintenance cannot be booked for the disabled date/time. Admins are responsible for setting clear maintenance reasons and reopening schedules accurately.",
    ruleFurnitureTitle: "6. User and Admin Responsibilities",
    ruleFurnitureDesc: "Users must use the room only for the booked purpose, keep the room clean, avoid damage, and contact Admin for cancellations or changes. Admins manage approvals, booking edits/deletions, room status, maintenance periods, and booking history.",
    ruleClosingTitle: "7. Departure and Room Care",
    ruleClosingDesc: "Before leaving, turn off the AC and lights where appropriate, return shared equipment to its proper place, leave the room clean, and report any room or equipment issue to Admin."
  },
  th: {
    roomOverview: "ภาพรวมห้องประชุม",
    dashboard: "แดชบอร์ดแสดงเวลา",
    adminPanel: "ระบบจัดแอดมิน",
    menu: "เมนูหลัก",
    filterRooms: "ประเภทห้อง",
    allRooms: "ห้องประชุมทั้งหมด",
    meetingRoom: "ห้องประชุม",
    receptionArea: "พื้นที่รับรอง",
    trainingRoom: "ห้องอบรม",
    liveStatus: "สถานะปัจจุบัน",
    totalRooms: "จำนวนห้องที่มี",
    availableNow: "ห้องว่างตอนนี้",
    occupiedNow: "ห้องไม่ว่างตอนนี้",
    occupied: "ห้องไม่ว่างตอนนี้",
    manageBookings: "จัดการรายการจอง และตรวจสอบสถานะความว่างของแต่ละสถานที่",
    ppl: "คน",
    scheduleToday: "ตารางงานวันนี้",
    noBookingsToday: "วันนี้ไม่มีรายการจอง",
    bookRoom: "จองห้องนี้",
    available: "ห้องว่าง",
    pending: "รออนุมัติ",
    more: "รายการ",
    availabilityLabel: "ความเคลื่อนไหวห้องว่าง",
    select: "เลือกช่วงนี้",
    free: "ว่าง",
    booked: "ถูกจองแล้ว",
    bookBtn: "จอง",
    people: "คน",
    date: "วันที่จอง",
    meetingTitle: "หัวข้อประชุม",
    organizerName: "ชื่อผู้จอง",
    employeeId: "รหัสพนักงาน",
    department: "แผนก/ฝ่ายงาน",
    selectDept: "ระบุแผนก",
    startTime: "เวลาเข้างาน",
    endTime: "เวลาออกห้อง",
    cancel: "ยกเลิก",
    save: "บันทึก",
    confirm: "ยืนยัน",
    errSelectDateTime: "กรุณาตรวจสอบวันที่ เวลาเริ่มต้น และเวลาสิ้นสุดให้ถูกต้อง",
    errSelectDept: "กรุณาระบุกลุ่มแผนกของคุณ",
    errEnterEmpId: "กรุณาระบุรหัสประจำตัวพนักงาน",
    errEndTimeAfter: "เวลาออกจากห้อง ต้องอยู่ภายหลังเวลาเริ่มต้นเสมอ",
    errOverlap: "ไม่สามารถจองได้ เนื่องจากช่วงเวลาดังกล่าวทับซ้อนกับผู้ใช้อื่น",
    scheduleDashboard: "แดชบอร์ดระบุเวลา",
    overviewAllRooms: "ข้อมูลภาพรวมและการจองใช้ของทุกห้องประชุมในระบบ",
    detailedTimelineFor: "แสดงรายละเอียดช่วงเวลาใช้งานจริงของ",
    today: "วันนี้",
    statusCards: "สถานะห้อง",
    timelineGrid: "ตารางเวลาใช้งาน",
    insightsStats: "ข้อมูลสรุปและสถิติ",
    schedulesFor: "ข้อมูลการจองในส่วนของวัน",
    pax: "คน",
    currentBooking: "กำลังประชุมขณะนี้",
    itinerary: "คิวการใช้งานวันนี้",
    freeAllDay: "ว่างตลอดทั้งวัน",
    room: "ห้อง",
    confirmedBooked: "ยืนยันจองใช้เรียบร้อย",
    pendingWaitApproval: "อยู่ระหว่างรอจัดสรร/อนุมัติ",
    hoverTip: "💡 ชี้เมาส์ที่แถบเวลาเพื่อดูรายละเอียดเรื่องประชุมและแผนกผู้จอง",
    totalBookingsHeader: "สรุปรายการจองทั้งหมด",
    todayScheduled: "รายการที่จะเกิดขึ้นวันนี้",
    busiestRoomHeader: "ห้องที่จัดประชุมบ่อยสุด",
    hoursBookedLabel: "ชั่วโมงที่มีการใช้สะสม",
    noReservations: "ยังไม่มีการประชุม",
    peakActiveTime: "ช่วงเวลาที่มีการจองสูงสะสม",
    overlappingBookings: "รายการจองที่เหลื่อมซ้อนกัน",
    noOverlappingBookings: "ไม่มีการจองซ้อนทับกัน",
    departmentMax: "แผนกที่ส่งคำจองใช้มากที่สุด",
    bookingsTotal: "รายการคำจองสะสม",
    occupancyLoadHeader: "สัดส่วนการใช้ห้องประชุม (พิจารณาจาก 10 ชม. วันทำงานปกติ)",
    occupancyLoadSub: "สัดส่วนระบุจำนวนชั่วโมงที่ใช้งานจริงเทียบกับเวลาสแตนดาร์ดออฟฟิศ (07:00 น. - 19:00 น.)",
    deptVolumeHeader: "สถิติจำนวนคำจองแบ่งตามลักษณะแผนก",
    deptVolumeSub: "แผนภูมิตัวเลขระบุเพื่อเปรียบเทียบสัดส่วนระหว่างแผนกงานต่างๆ ภายใน TOKIN",
    noDeptBookings: "วันนี้ยังไม่มีประวัติการจองจากทุกฝ่ายงาน",
    insightsFooter: "ข้อมูลวิเคราะห์เบื้องต้นนี้อ้างอิงจากฐานข้อมูลแบบลอคอล เพื่อจัดระเบียบสำนักงานให้ดียิ่งขึ้น",
    fullDailyAgenda: "เอกสารสรุปกำหนดการใช้งานโดยละเอียดวันนี้",
    noRoomsBookings: "ไม่มีกำหนดตารางการจองใช้งานสถานที่ใดเลยสำหรับวันนี้",
    bookingTitle: "ชื่อหัวข้อเรื่องประชุม",
    organizerStaff: "ผู้ติดต่อ / ฝ่าย",
    timeSlot: "ช่วงระยะเวลา",
    status: "สถานะรายการ",
    pendingApproval: "รอรับอนุมัติ",
    confirmed: "อนุมัติเรียบร้อย",
    roomInfoList: "ข้อมูลห้องและอุปกรณ์",
    bookingsFor: "กำหนดการของห้องในวันที่",
    noBookingsDate: "ยังไม่มีรายงานผู้จองสถานที่รายวัน",
    chatWelcomeMsg: "สวัสดีครับ! ผมคือผู้ช่วยอัจฉริยะ TOKIN Smart Room ยินดีให้บริการ สอบถามห้องว่าง อัตราจุคน หรือสิ่งอำนวยความสะดวกได้ตลอดเวลาครับ",
    smartAssistant: "ผู้ช่วยอัจฉริยะประดิษฐ์",
    poweredByGemini: "พัฒนาโดยขุมพลัง Gemini API",
    askForRoomPlaceholder: "พิมพ์เพื่อสอบถามเกี่ยวกับห้องประชุมทั่วไป...",
    adminPortal: "ประตูล็อคอินแอดมิน",
    adminSignInSub: "ลงชื่อผู้ใช้สิทธิ์ผู้ดูแลระบบเพื่อแก้ไขออฟฟิศ",
    languageLabel: "ภาษา",
    thaiLanguage: "ไทย",
    englishLanguage: "อังกฤษ",
    username: "ชื่อผู้ใช้งาน",
    password: "รหัสผ่านเข้าระบบ",
    currentAdmin: "ชื่อผู้ใช้งาน",
    enterUsername: "ระบุชื่ออีเมลหรือยูสเซอร์",
    enterPassword: "ระบุรหัสผ่านประกอบ",
    signIn: "เข้าสู่ระบบ",
    orContinueWith: "หรือเชื่อมต่อด้วย",
    signInWithGoogle: "เข้าสู่ระบบด้วย Google",
    googleAuthFailed: "การเข้าสู่ระบบด้วย Google ผิดพลาด",
    invalidUserPass: "รหัสผ่านไม่ถูกต้อง หรือระบุแอดมินไม่ถูกต้อง",
    welcomeBack: "ยินดีต้อนรับกลับเข้าสู่ระบบ",
    superAdmin: "ผู้ดูแลหลักระบบ (Super Admin)",
    approver: "ฝ่ายอนุมัติหลัก (Approver)",
    logout: "ออกจากระบบแอดมิน",
    bookingsTab: "รายการจองห้อง",
    roomMgmtTab: "จัดการผังห้องประชุม",
    userMgmtTab: "สิทธิ์ความปลอดภัยแอดมิน",
    emailHistoryTab: "ประวัติการส่งอีเมล",
    emailHistoryTitle: "ประวัติการส่งอีเมล",
    emailHistorySub: "บันทึกถาวรของอีเมลยืนยันการจองที่ส่งออกจากระบบ TOKIN Smart Room",
    refreshEmailHistory: "รีเฟรช",
    loadingEmailHistory: "กำลังโหลดประวัติการส่งอีเมล",
    recipientCol: "ผู้รับอีเมล",
    subjectPurposeCol: "หัวข้อ / วัตถุประสงค์",
    relatedCol: "รายการจอง / ห้องที่เกี่ยวข้อง",
    sentAtCol: "วันที่และเวลาที่ส่ง",
    sentStatusCol: "สถานะการส่ง",
    noEmailHistory: "ยังไม่มีประวัติการส่งอีเมล",
    emailStatusSuccessful: "ส่งสำเร็จ",
    emailStatusFailed: "ส่งไม่สำเร็จ",
    emailHistoryLoadFailed: "ไม่สามารถโหลดประวัติการส่งอีเมลได้",
    bookingVerificationPurpose: "อีเมลยืนยันการจอง",
    bookingLabel: "การจอง",
    roomLabel: "ห้อง",
    errorLabel: "ข้อผิดพลาด",
    noRelatedItem: "ไม่มีรายการที่เกี่ยวข้อง",
    pendingRequests: "รายการคำจองที่ค้างรอคิว",
    activeRooms: "สถานที่เปิดทำงานขณะนี้",
    upcomingToday: "รายการถัดไปของวันวันนี้",
    allBookings: "ฐานข้อมูลใบจองทั้งหมด",
    searchPlaceholder: "ป้อนชื่อผู้จอง แผนก หรือระบุคำที่เกี่ยวข้อง...",
    dateTimeCol: "วันเวลาและรอบประชุม",
    eventCol: "หัวข้อกิจกรรม",
    userCol: "เจ้าของเรื่อง",
    actionsCol: "การจัดการควบคุม",
    noBookingsTable: "รายงานไม่พบคิวบันทึกการจองปัจจุบัน",
    addRoom: "เพิ่มพื้นที่/ห้องประชุมใหม่",
    image: "ภาพห้อง",
    name: "ชื่อห้อง",
    unknownRoom: "ไม่พบชื่อห้อง",
    type: "ประเภทสถานที่",
    capacity: "ความจุพนักงาน",
    amenities: "เครื่องมืออำนวยความสะดวก",
    addAdmin: "เพิ่มทีมงานแอดมิน",
    role: "กำหนดกลุ่มแอดมิน",
    addNewRoom: "สร้างและตั้งชื่อห้องประชุมใหม่",
    editRoom: "ปรับแต่งแก้ไขรายละเอียดห้องประชุม",
    roomName: "ระบุชื่อห้อง",
    roomNamePlaceholder: "เช่น ห้องประชุม A",
    amenitiesPlaceholder: "จอทีวี, ไวท์บอร์ด, โปรเจกเตอร์, ลำโพง",
    amenitiesCommaSeparated: "สิ่งอำนวยความสะดวก (คั่นด้วยจุลภาค)",
    roomImage: "รูปถ่ายของห้องเรียน/ห้องประชุม",
    clickToUpload: "คลิกเพื่อแนบรูปไฟล์ตัวอย่าง",
    orDragDrop: "หรือลากไฟล์ภาพมาปล่อยที่นี่เลย",
    uploadRoomImageHelp: "อัปโหลดไฟล์ JPG หรือ PNG รูปนี้จะแสดงบนการ์ดห้องและหน้ารายละเอียดห้อง",
    replaceRoomImage: "เปลี่ยนรูปภาพ",
    saveRoom: "บันทึกและปรับปรุงข้อมูลห้องนี้",
    addNewAdmin: "ตั้งไอดีรายละเอียดแอดมินคนใหม่",
    createAdminUser: "ยืนยันการตั้งบัญชีนี้",
    adminPasswordRequirement: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลขอย่างน้อยอย่างละ 1 ตัว",
    employeeIdSevenDigits: "รหัสพนักงานต้องเป็นตัวเลข 7 หลัก",
    deskPhone: "เบอร์โต๊ะ/เบอร์โทรศัพท์",
    deskShort: "โต๊ะ",
    deskPhoneFourDigits: "เบอร์โต๊ะต้องเป็นตัวเลข 4 หลัก",
    usernameEmailPlaceholder: "ชื่อผู้ใช้งาน / อีเมล",
    passwordPlaceholder: "รหัสผ่าน",
    employeeIdPlaceholder: "เช่น 1234567",
    deskPhonePlaceholder: "เช่น 5678",
    onlySuperAdminsCanCreate: "เฉพาะผู้ดูแลหลักระบบเท่านั้นที่สามารถสร้างผู้ดูแลระบบคนอื่นได้",
    adminCreatedSuccess: "เพิ่มแอดมินสำเร็จ!",
    usernameExists: "ไม่สามารถใช้ยูสเซอร์ดังกล่าวได้ เนื่องจากซ้ำกับข้อมูลเก่า",
    cannotDeleteSelf: "คุณไม่สามารถลดสิทธิ์หรือลบสิทธิ์บัญชีของตนเองออกได้ขณะออนไลน์",
    actionRestricted: "ไม่สามารถดำเนินการได้",
    ok: "รับทราบ",
    deleteAdminTitle: "ยืนยันการลบแอดมิน",
    deleteButton: "ลบออก",
    confirmDeleteUser: "แน่ใจหรือไม่ว่าต้องการอนุมัติการถอดคุณสมบัติแอดมินรายนี้ออก?",
    confirmDeleteRoom: "คุณแน่ใจหรือไม่ว่าต้องการถอนและลบห้องดังกล่าว? ระบบจะรีเซ็ตรายการจับคู่การจองที่ค้างอยู่ของห้องนี้ทั้งหมดด้วย",
    confirmDeleteBooking: "คุณต้องการทำลายหรือลบประวัติคำขอจองใช้จุดนี้ใช่หรือไม่?",
    confirmRejectBooking: "ท่านต้องการเซ็นต์ปฏิเสธรายละเอียดคำขอประชุมนี้ใช่หรือไม่?",
    bookingConfirmedOk: "ระบบทำการออกเลขและยืนยันการจองตารางเวลาของคุณเรียบร้อยแล้ว!",
    roomUpdatedSuccess: "บันทึกและแก้ไขข้อมูลห้องประชุมสำเร็จ!",
    roomCreatedSuccess: "เพิ่มห้องประชุมสำเร็จ!",
    roomSaveFailed: "เกิดข้อผิดพลาดในการบันทึกห้องประชุม: {reason}",
    roomSaveFallbackReason: "ไม่มีสิทธิ์ในการบันทึกหรือขนาดไฟล์รูปภาพใหญ่เกินไป",
    noBookings: "ยังไม่มีการประชุม",
    adminModeLabel: "โหมดผู้ดูแลระบบ",
    none: "ไม่มี",
    previousDay: "วันก่อนหน้า",
    nextDay: "วันถัดไป",
    hoursShort: "ชม.",
    timesCount: "ครั้ง",
    verified: "ยืนยันแล้ว",
    waitForVerify: "Wait for Verify",
    roomInUseStatus: "Room In Use",
    usedRoomStatus: "Used",
    cancelledNoVerification: "Cancelled / No verification",
    rejected: "ปฏิเสธ",
    approve: "อนุมัติ",
    reject: "ปฏิเสธ",
    edit: "แก้ไข",
    currentUserBadge: "(คุณ)",
    allRoomsSelector: "ทุกห้องประชุม",
    selectDeptOption: "โปรดคลิกเลือกกลุ่มแผนกงานของคุณ",
    approverRoleLabel: "ฝ่ายอนุมัติ (สิทธิ์สแกนตรวจสอบความเหมาะสม)",
    superAdminRoleLabel: "ผู้ควบคุมสูงสุด (สิทธิ์กำหนด/เพิ่มถอนพนักงานแอดมิน)",
    roomStatusLabel: "สถานะความพร้อมของห้องประชุม",
    statusOpen: "เปิดทางเลือกให้จองปกติ",
    statusClosed: "ปิดใช้งานชั่วคราว",
    closureReasonLabel: "ระบุปัญหาหรือสาเหตุที่ทำการปิดห้อง",
    closureReasonPlaceholder: "ระบุความมุ่งหมาย เช่น ปรับปรุงทาสีห้องใหม่ หรือเปลี่ยนแอร์",
    closureSelectedDateLabel: "วันที่ต้องการปิดใช้งานชั่วคราว",
    selectDisableDateFirst: "เลือกวันที่ก่อน จากนั้นเลือกช่วงเวลาปิดใช้งานสำหรับวันนั้น",
    closureDateRequired: "กรุณาเลือกวันที่ต้องการปิดใช้งานชั่วคราว",
    closureTimeInvalid: "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น และอยู่ในช่วงเวลาจอง",
    closureReasonSelectPlaceholder: "-- เลือกสาเหตุการปิดห้อง --",
    customClosureReasonPlaceholder: "กรุณาระบุกิจกรรม/สาเหตุของท่าน...",
    customRenovationReason: "ปรับปรุงห้อง",
    closureDateRangeLabel: "กำหนดช่วงวันที่ต้องการปิดห้อง (เสริม)",
    closureStartDateLabel: "เริ่มปิดวันที่ (MM/DD/YYYY)",
    closureEndDateLabel: "สิ้นสุดวันที่ปิด (MM/DD/YYYY)",
    closureTimeRangeLabel: "ระบุช่วงเวลาปิดในส่วนแต่ละวัน (เสริม)",
    closureStartTimeLabel: "ตั้งแต่ชั่วโมง",
    closureEndTimeLabel: "ถึงชั่วโมง",
    closureAllDay: "ปิดทำงานสแตนดาร์ดทั้งวัน (07:00 น. - 19:00 น.)",
    roomIsClosedAlert: "จุดจองพื้นที่นี้ปิดปรับปรุงอยู่ชั่วคราวด้วยเหตุผล: ",
    roomClosedSubtitle: "(ปิดปรับปรุงอยู่ชั่วคราว)",
    roomStatusCol: "สถานะห้องประชุม",
    allDayClosedText: "ปิดปรับปรุงทั้งวัน",
    tempClosedText: "ปิดช่วง {timeRange}",
    yearlyView: "รายปี",
    monthlyView: "รายเดือน",
    weeklyView: "รายสัปดาห์",
    dailyView: "รายวัน",
    selectYear: "เลือกปี",
    selectMonth: "เลือกเดือน",
    selectWeek: "เลือกสัปดาห์",
    roomUsageHistory: "ประวัติการใช้งานห้องประชุม",
    departmentUsageRank: "สัดส่วนการจองแบ่งตามแผนกงาน",
    purpose: "หัวข้อ/วัตถุประสงค์การประชุม",
    noHistory: "ไม่พบข้อมูลประวัติการจองใช้งานในช่วงเวลาดังกล่าว",
    roomRankHeader: "อันดับห้องประชุมที่ถูกใช้งานมากที่สุด",
    termsTitle: "แนวปฏิบัติและระเบียบการใช้บริการห้องประชุม",
    acceptTerms: "ฉันยอมรับแนวปฏิบัติและเงื่อนไข",
    declineTerms: "ไม่ยอมรับเงื่อนไข",
    declineTitle: "ไม่สามารถเข้าใช้งานระบบได้",
    declineMessage: "ขออภัย คุณจำเป็นต้องกดยอมรับแนวปฏิบัติการใช้บริการห้องประชุมก่อนจึงจะสามารถเข้าใช้และทำเรื่องจองจุดใช้งานต่าง ๆ ในระบบ TOKIN Smart Room ได้",
    reviewTermsBtn: "ตรวจสอบแนวปฏิบัติอีกครั้ง",
    userGuideBtn: "คู่มือการใช้งาน",
    userGuideTitle: "คู่มือการใช้งานระบบจองห้องประชุม TOKIN Smart Room",
    close: "ปิดหน้าต่าง",
    ruleEligibleTitle: "1. ผู้มีสิทธิ์ใช้บริการ",
    ruleEligibleDesc: "พนักงาน TOKIN และบุคคลที่ได้รับอนุญาตสามารถจองห้องได้ โดยต้องใช้ชื่อผู้จอง รหัสพนักงาน แผนก เบอร์โต๊ะ และอีเมล YAGEO ของตนเองให้ถูกต้อง",
    ruleSystemOnlyTitle: "2. การจองผ่านระบบและรูปแบบวันที่",
    ruleSystemOnlyDesc: "ต้องจองผ่านระบบ TOKIN Smart Room เท่านั้น วันที่จะแสดงในรูปแบบ MM/DD/YYYY เวลาจองอยู่ในช่วง 07:00-19:00 น. และไม่สามารถจองทับรายการเดิมหรือช่วงปิดใช้งานชั่วคราวได้",
    ruleLateTitle: "3. อีเมลยืนยันและช่วงเวลา Check-in 15 นาที",
    ruleLateDesc: "หลังจอง ระบบจะส่งหรือกำหนดเวลาส่งอีเมลยืนยัน ผู้ใช้สามารถกดลิงก์เพื่อ Verify/Check-in ได้ตั้งแต่ 15 นาทีก่อนเวลาเริ่มจองถึง 15 นาทีหลังเวลาเริ่มจอง หากไม่ยืนยันภายในช่วงนี้ ระบบอาจปล่อยห้องและบันทึกเป็นยกเลิก/ไม่ยืนยัน",
    ruleCapacityTitle: "4. ความจุห้องและข้อมูลการจองที่ถูกต้อง",
    ruleCapacityDesc: "ผู้ใช้ต้องเลือกห้องให้เหมาะสมกับจำนวนผู้ใช้งานและกรอกวัตถุประสงค์ ชื่อผู้จอง รหัสพนักงาน แผนก เบอร์โต๊ะ และอีเมลให้ถูกต้อง",
    ruleFoodTitle: "5. สถานะห้องและการปิดใช้งานชั่วคราว",
    ruleFoodDesc: "ห้องที่แสดงสถานะปิดใช้งานชั่วคราวหรืออยู่ระหว่างซ่อมบำรุง จะไม่สามารถจองในวันและเวลาที่ปิดได้ ผู้ดูแลระบบต้องระบุเหตุผลและช่วงเวลาปิดใช้งานให้ชัดเจน",
    ruleFurnitureTitle: "6. ความรับผิดชอบของผู้ใช้และผู้ดูแลระบบ",
    ruleFurnitureDesc: "ผู้ใช้ต้องใช้ห้องตามวัตถุประสงค์ที่จอง ดูแลความสะอาด ไม่ทำให้อุปกรณ์เสียหาย และติดต่อ Admin หากต้องการยกเลิกหรือแก้ไขรายการจอง ส่วน Admin รับผิดชอบการอนุมัติ แก้ไข/ลบรายการจอง สถานะห้อง และประวัติการจอง",
    ruleClosingTitle: "7. การดูแลห้องก่อนออก",
    ruleClosingDesc: "ก่อนออกจากห้อง ให้ปิดแอร์และไฟตามความเหมาะสม เก็บอุปกรณ์ส่วนกลางให้เรียบร้อย รักษาความสะอาด และแจ้งผู้ดูแลระบบหากพบปัญหาเกี่ยวกับห้องหรืออุปกรณ์"
  }
} as const;

export const formatTimeValue = (hour: number, language: "th" | "en"): string => {
  if (language === "en") {
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${ampm}`;
  } else {
    return `${hour.toString().padStart(2, "0")}:00 น.`;
  }
};

export const formatTimeString = (timeStr: string, language: "th" | "en"): string => {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1] || "00";
  if (language === "en") {
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } else {
    return `${hours.toString().padStart(2, "0")}:${minutes} น.`;
  }
};

export const formatTimeRange = (
  start: Date | string,
  end: Date | string,
  language: "th" | "en"
): string => {
  const getHHMM = (d: Date | string) => {
    if (d instanceof Date) {
      const h = d.getHours().toString().padStart(2, "0");
      const m = d.getMinutes().toString().padStart(2, "0");
      return `${h}:${m}`;
    }
    return d;
  };

  const startStr = getHHMM(start);
  const endStr = getHHMM(end);

  if (language === "en") {
    const formatSingle = (hhmmStr: string) => {
      const parts = hhmmStr.split(":");
      const hours = parseInt(parts[0], 10);
      const minutes = parts[1] || "00";
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHour = hours % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };
    return `${formatSingle(startStr)} - ${formatSingle(endStr)}`;
  } else {
    return `${startStr} - ${endStr} น.`;
  }
};

export const formatDate = (date: Date, _language: "th" | "en", _options: Intl.DateTimeFormatOptions = {}): string => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

export const TRANSLATE_MAP: Record<string, string> = {
  // Amenities
  'TV Screen': 'จอทีวี',
  'Whiteboard': 'กระดานไวท์บอร์ด',
  'Conference Phone': 'โทรศัพท์ระบบความละเอียดสูง',
  'Projector': 'เครื่องโปรเจกเตอร์',
  'Coffee Table': 'โต๊ะกาแฟ',
  'Lounge Seating': 'พื้นที่นั่งเล่นพักผ่อน',
  'Private Corner': 'มุมส่วนตัว',
  'Dual Projector': 'เครื่องโปรเจกเตอร์คู่',
  'Sound System': 'ระบบเสียงสเตอริโอ',
  'Desks': 'ชุดโต๊ะนักเรียน',
  'Podium': 'แท่นบรรยาย/โพเดียม',

  // Titles
  'Weekly Sync': 'ประชุมประสานงานประจำสัปดาห์',
  'New Hire Orientation': 'ปฐมนิเทศพนักงานใหม่',

  // Departments
  'Managing Director': 'กรรมการผู้จัดการ',
  'HR': 'ทรัพยากรบุคคล',
  'SUSTAINABILITY': 'การพัฒนาที่ยั่งยืน',
  'Fin&Acc': 'บัญชีและการเงิน',
  'Planning': 'ฝ่ายวางแผน',
  'Procurement': 'จัดซื้อ',
  'Prod Eng': 'วิศวกรรมการผลิต',
  'Technology': 'เทคโนโลยี',
  'Equipment Engineering': 'วิศวกรรมเครื่องมืออุปกรณ์',
  'Facility': 'อาคารสถานที่/สาธารณูปโภค',
  'QA': 'ประกันคุณภาพ',
  'TA MFG': 'ฝ่ายผลิตหลัก',
  'SC': 'ห่วงโซ่อุปทาน',
  'IT': 'เทคโนโลยีสารสนเทศ',

  // Closure Reasons
  'Renovation': 'ปิดปรับปรุงชั่วคราว',
  'Electrical Maintenance': 'ซ่อมบำรุงระบบไฟฟ้า',
  'AC Maintenance': 'ซ่อมบำรุงเครื่องปรับอากาศ',
  'Cleaning': 'ทำความสะอาด',
  'Private Event': 'กิจกรรมพิเศษ/ประชุมส่วนตัว',
  'Equipment Repair': 'ซ่อมแซมอุปกรณ์ชำรุด',
  'System Maintenance': 'ซ่อมบำรุงระบบเครือข่ายและไอที'
};

const DEPARTMENT_CANONICAL_CODES: Record<string, string> = {
  'Managing Director': 'MD',
  HR: 'HR',
  SUSTAINABILITY: 'SUST',
  'Fin&Acc': 'FA',
  Planning: 'PLN',
  Procurement: 'PROC',
  'Prod Eng': 'PE',
  Technology: 'IT',
  'Information Technology': 'IT',
  IT: 'IT',
  'Equipment Engineering': 'EE',
  Facility: 'FAC',
  Facilities: 'FAC',
  QA: 'QA',
  'TA MFG': 'TA MFG',
  SC: 'SC'
};

const DEPARTMENT_ALIAS_CODES: Record<string, string> = {
  md: 'MD',
  fa: 'FA',
  finance: 'FA',
  accounting: 'FA',
  'fin & acc': 'FA',
  'production engineering': 'PE',
  'quality assurance': 'QA',
  manufacturing: 'TA MFG',
  'supply chain': 'SC',
  '\u0E01\u0E23\u0E23\u0E21\u0E01\u0E32\u0E23\u0E1C\u0E08\u0E14\u0E01\u0E32\u0E23': 'MD',
  '\u0E40\u0E17\u0E04\u0E42\u0E19\u0E42\u0E25\u0E22\u0E2A\u0E32\u0E23\u0E2A\u0E19\u0E40\u0E17\u0E28': 'IT'
};

export const DEPARTMENT_DISPLAY_CODES: Record<string, string> = Object.entries(DEPARTMENT_CANONICAL_CODES).reduce(
  (aliases, [department, code]) => {
    aliases[department.toLowerCase()] = code;

    const translatedDepartment = TRANSLATE_MAP[department];
    if (translatedDepartment) {
      aliases[translatedDepartment.toLowerCase()] = code;
    }

    return aliases;
  },
  { ...DEPARTMENT_ALIAS_CODES }
);

export const formatDepartment = (department?: string | null): string => {
  const cleanDepartment = (department || '').trim();
  if (!cleanDepartment) return '';
  return DEPARTMENT_DISPLAY_CODES[cleanDepartment.toLowerCase()] || cleanDepartment.toUpperCase();
};

export const getDepartmentSelectOptions = (departments: string[]) => {
  const options = new Map<string, string>();

  departments.forEach((department) => {
    const label = formatDepartment(department);
    if (!label) return;

    const currentValue = options.get(label);
    const isCodeValue = department.trim().toUpperCase() === label;
    if (!currentValue || isCodeValue) {
      options.set(label, department);
    }
  });

  return Array.from(options, ([label, value]) => ({ label, value }));
};

export const translateText = (text: string, language: 'th' | 'en'): string => {
  if (language === 'en' || !text) return text;
  return TRANSLATE_MAP[text] || TRANSLATE_MAP[text.trim()] || text;
};

export const translateAmenities = (amenities: string[] | undefined | null, language: 'th' | 'en'): string[] => {
  const arr = amenities || [];
  if (language === 'en') return arr;
  return arr.map(amenity => translateText(amenity, 'th'));
};

const getLocalDateOnlyString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getClosureWindow = (room: Room, now: Date) => {
  const startHour = room.closureStartTime !== undefined ? room.closureStartTime : BOOKING_START_HOUR;
  const endHour = room.closureEndTime !== undefined ? room.closureEndTime : BOOKING_END_HOUR;
  const hasDateBoundary = Boolean(room.closureStartDate || room.closureEndDate);
  const hasExplicitTimeBoundary = room.closureStartTime !== undefined || room.closureEndTime !== undefined;
  const isDefaultFullDayWithoutDates = !hasDateBoundary && hasExplicitTimeBoundary && startHour <= BOOKING_START_HOUR && endHour >= 24;
  const implicitSingleDay = !hasDateBoundary && hasExplicitTimeBoundary && !isDefaultFullDayWithoutDates;
  const implicitDate = implicitSingleDay ? getLocalDateOnlyString(now) : undefined;

  return {
    startDate: room.closureStartDate || implicitDate,
    endDate: room.closureEndDate || room.closureStartDate || implicitDate,
    startHour,
    endHour
  };
};

export const isRoomClosureExpired = (room: Room, now: Date = new Date()): boolean => {
  if (!room || !room.isClosed) return false;

  const { endDate, endHour } = getClosureWindow(room, now);
  if (!endDate) return false;

  const [year, month, day] = endDate.split('-').map(Number);
  if (!year || !month || !day) return false;

  const expiresAt = new Date(year, month - 1, day, 0, 0, 0, 0);
  expiresAt.setHours(endHour, 0, 0, 0);
  return now >= expiresAt;
};

export const getEffectiveRoomStatus = (room: Room, now: Date = new Date()): Room => {
  if (!isRoomClosureExpired(room, now)) return room;

  return {
    ...room,
    isClosed: false,
    closureReason: '',
    closureStartDate: '',
    closureEndDate: '',
    closureStartTime: undefined,
    closureEndTime: undefined
  };
};

export const isRoomClosedAt = (room: Room, dateStr: string, hour?: number, now: Date = new Date()): { closed: boolean; reason?: string } => {
  if (!room || !room.isClosed || isRoomClosureExpired(room, now)) return { closed: false };

  const reason = room.closureReason || 'ปรับปรุงห้อง/ปิดใช้งานชั่วคราว';
  const { startDate, endDate, startHour, endHour } = getClosureWindow(room, now);

  // 1. Check Date boundary if specified
  if (startDate) {
    if (dateStr < startDate) {
      return { closed: false };
    }
  }
  if (endDate) {
    if (dateStr > endDate) {
      return { closed: false };
    }
  }

  // 2. Check Hour boundary if specified and hour is provided
  if (hour !== undefined) {
    if (hour < startHour || hour >= endHour) {
      return { closed: false };
    }
  }

  return { closed: true, reason };
};

export const isRoomCurrentlyClosed = (room: Room, now: Date = new Date()): boolean => {
  if (!room || !room.isClosed || isRoomClosureExpired(room, now)) return false;
  const currentDateStr = getLocalDateOnlyString(now);
  const currentHour = now.getHours();
  return isRoomClosedAt(room, currentDateStr, currentHour, now).closed;
};

export const isRoomClosedAllDay = (room: Room, dateStr: string, now: Date = new Date()): { closed: boolean; reason?: string } => {
  if (!room || !room.isClosed || isRoomClosureExpired(room, now)) return { closed: false };

  const reason = room.closureReason || 'ปรับปรุงห้อง/ปิดใช้งานชั่วคราว';
  const { startDate, endDate, startHour, endHour } = getClosureWindow(room, now);

  // 1. Check Date boundary if specified
  if (startDate) {
    if (dateStr < startDate) {
      return { closed: false };
    }
  }
  if (endDate) {
    if (dateStr > endDate) {
      return { closed: false };
    }
  }

  // If there are partial closure hours, it is NOT closed "all day" unless they span the standard booking window.
  if (room.closureStartTime !== undefined || room.closureEndTime !== undefined) {
    if (startHour <= BOOKING_START_HOUR && endHour >= BOOKING_END_HOUR) {
      return { closed: true, reason };
    }

    // Otherwise it's only a partial day closure
    return { closed: false };
  }

  return { closed: true, reason };
};
