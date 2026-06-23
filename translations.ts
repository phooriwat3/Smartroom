import { Room } from './types';
import { BOOKING_START_HOUR, BOOKING_END_HOUR } from './constants';

export const TRANSLATIONS = {
  en: {
    roomOverview: "Room Overview",
    dashboard: "Dashboard",
    adminPanel: "Admin Panel",
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
    confirm: "Confirm",
    errSelectDateTime: "Please select date, start time, and end time.",
    errSelectDept: "Please select a department.",
    errEnterEmpId: "Please enter Employee ID.",
    errEndTimeAfter: "End time must be after start time.",
    errOverlap: "This time slot overlaps with an existing booking.",
    scheduleDashboard: "Schedule Dashboard",
    overviewAllRooms: "Overview and schedules for all rooms.",
    detailedTimelineFor: "Detailed timeline for",
    today: "Today",
    statusCards: "Status Cards",
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
    chatWelcomeMsg: "Hello! I am your YAGEO SmartRoom Assistant. Ask me about room availability or recommendations.",
    smartAssistant: "Smart Assistant",
    poweredByGemini: "Powered by Gemini",
    askForRoomPlaceholder: "Ask for a room...",
    adminPortal: "Admin Portal",
    adminSignInSub: "Sign in to manage the office.",
    username: "Username",
    password: "Password",
    enterUsername: "Enter username",
    enterPassword: "Enter password",
    signIn: "Sign In",
    invalidUserPass: "Invalid username or password",
    welcomeBack: "Welcome back",
    superAdmin: "Super Admin",
    approver: "Approver",
    logout: "Logout",
    bookingsTab: "Bookings",
    roomMgmtTab: "Room Management",
    userMgmtTab: "Admin Management",
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
    type: "Type",
    capacity: "Capacity",
    amenities: "Amenities",
    addAdmin: "Add Admin",
    role: "Role",
    addNewRoom: "Add New Room",
    editRoom: "Edit Room",
    roomName: "Room Name",
    amenitiesPlaceholder: "TV, Whiteboard, Projector",
    amenitiesCommaSeparated: "Amenities (comma separated)",
    roomImage: "Room Image",
    clickToUpload: "Click to upload",
    orDragDrop: "or drag and drop",
    saveRoom: "Save Room",
    addNewAdmin: "Add New Admin",
    createAdminUser: "Create User",
    usernameExists: "Username already exists",
    cannotDeleteSelf: "You cannot delete yourself.",
    confirmDeleteUser: "Are you sure you want to delete this admin user?",
    confirmDeleteRoom: "Are you sure you want to delete this room? This will also remove associated bookings.",
    confirmDeleteBooking: "Are you sure you want to delete this booking?",
    confirmRejectBooking: "Are you sure you want to reject this booking?",
    bookingConfirmedOk: "Booking confirmed successfully!",
    allRoomsSelector: "All Rooms",
    selectDeptOption: "Select Dept",
    approverRoleLabel: "Approver (Can only Approve/Reject)",
    superAdminRoleLabel: "Super Admin (Full Access)",
    roomStatusLabel: "Room Availability Status",
    statusOpen: "Open / Available",
    statusClosed: "Temporarily Disabled",
    closureReasonLabel: "Closure / Renovation Reason",
    closureReasonPlaceholder: "State reason, e.g., Room renovation or maintenance",
    closureDateRangeLabel: "Closure Date Range (Optional)",
    closureStartDateLabel: "Start Date (DD/MM/YYYY)",
    closureEndDateLabel: "End Date (DD/MM/YYYY)",
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
    userGuideTitle: "YAGEO SmartRoom User Guide & Manual",
    close: "Close",
    ruleEligibleTitle: "1. Eligible Users",
    ruleEligibleDesc: "All YAGEO employees and authorized office personnel are eligible to use the room booking service.",
    ruleSystemOnlyTitle: "2. Official Booking Only",
    ruleSystemOnlyDesc: "Room reservations must be done exclusively via the official SmartRoom digital booking platform.",
    ruleLateTitle: "3. 15-Minute Cancellation Policy",
    ruleLateDesc: "If the keys/room are not picked up within 15 minutes of the scheduled start time, the booking system will automatically cancel the reservation for all consecutive hours.",
    ruleCapacityTitle: "4. Capacity Limit Enforcement",
    ruleCapacityDesc: "Reservations must specify the exact number of attendees, keeping within the designated capacity of each room.",
    ruleFoodTitle: "5. Food & Drink Policy",
    ruleFoodDesc: "Strictly no food, snacks, or outside eats inside the rooms. Only drinks in sealed containers with lids are allowed.",
    ruleFurnitureTitle: "6. Care & Responsibility",
    ruleFurnitureDesc: "Do not move or rearrange any furniture. Users are fully liable and responsible for any damaged equipment or property.",
    ruleClosingTitle: "7. Departure Checklist",
    ruleClosingDesc: "Before leaving: turn off the AC, turn off all lights, unplug electrical sockets and the TV power cord. Lock the room and return all keys/equipment to the Information Counter."
  },
  th: {
    roomOverview: "ภาพรวมห้องประชุม",
    dashboard: "แดชบอร์ดแสดงเวลา",
    adminPanel: "ระบบจัดการ (แอดมิน)",
    menu: "แผนผังเมนูหลัก",
    filterRooms: "กรองประเภทห้อง",
    allRooms: "ห้องประชุมทั้งหมด",
    meetingRoom: "ห้องประชุม (Meeting)",
    receptionArea: "พื้นที่รับรอง (Reception)",
    trainingRoom: "ห้องอบรม (Training)",
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
    statusCards: "สถานะการ์ดข้อมูลแยกห้อง",
    timelineGrid: "ตารางเวลาใช้งาน",
    insightsStats: "ข้อมูลสรุปเชิงลึกและสถิติ",
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
    deptVolumeSub: "แผนภูมิตัวเลขระบุเพื่อเปรียบเทียบสัดส่วนระหว่างแผนกงานต่างๆ ภายใน YAGEO",
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
    chatWelcomeMsg: "สวัสดีครับ! ผมคือผู้ช่วยอัจฉริยะ YAGEO SmartRoom ยินดีให้บริการ สอบถามห้องว่าง อัตราจุคน หรือสิ่งอำนวยความสะดวกได้ตลอดเวลาครับ",
    smartAssistant: "ผู้ช่วยอัจฉริยะประดิษฐ์",
    poweredByGemini: "พัฒนาโดยขุมพลัง Gemini API",
    askForRoomPlaceholder: "พิมพ์เพื่อสอบถามเกี่ยวกับห้องประชุมทั่วไป...",
    adminPortal: "ประตูล็อคอินแอดมิน",
    adminSignInSub: "ลงชื่อผู้ใช้สิทธิ์ผู้ดูแลระบบเพื่อแก้ไขออฟฟิศ",
    username: "ชื่อผู้ใช้งาน",
    password: "รหัสผ่านเข้าระบบ",
    enterUsername: "ระบุชื่ออีเมลหรือยูสเซอร์",
    enterPassword: "ระบุรหัสผ่านประกอบ",
    signIn: "เข้าสู่ระบบ",
    invalidUserPass: "รหัสผ่านไม่ถูกต้อง หรือระบุแอดมินไม่ถูกต้อง",
    welcomeBack: "ยินดีต้อนรับกลับเข้าสู่ระบบ",
    superAdmin: "ผู้ดูแลหลักระบบ (Super Admin)",
    approver: "ฝ่ายอนุมัติหลัก (Approver)",
    logout: "ออกจากระบบแอดมิน",
    bookingsTab: "รายการจองห้อง",
    roomMgmtTab: "จัดการผังห้องประชุม",
    userMgmtTab: "สิทธิ์ความปลอดภัยแอดมิน",
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
    type: "ประเภทสถานที่",
    capacity: "ความจุพนักงาน",
    amenities: "เครื่องมืออำนวยความสะดวก",
    addAdmin: "เพิ่มทีมงานแอดมิน",
    role: "กำหนดกลุ่มแอดมิน",
    addNewRoom: "สร้างและตั้งชื่อห้องประชุมใหม่",
    editRoom: "ปรับแต่งแก้ไขรายละเอียดห้องประชุม",
    roomName: "ระบุชื่อห้อง",
    amenitiesPlaceholder: "จอทีวี, ไวท์บอร์ด, โปรเจกเตอร์, ลำโพง",
    amenitiesCommaSeparated: "สิ่งอำนวยความสะดวก (คั่นด้วยจุลภาค)",
    roomImage: "รูปถ่ายของห้องเรียน/ห้องประชุม",
    clickToUpload: "คลิกเพื่อแนบรูปไฟล์ตัวอย่าง",
    orDragDrop: "หรือลากไฟล์ภาพมาปล่อยที่นี่เลย",
    saveRoom: "บันทึกและปรับปรุงข้อมูลห้องนี้",
    addNewAdmin: "ตั้งไอดีรายละเอียดแอดมินคนใหม่",
    createAdminUser: "ยืนยันการตั้งบัญชีนี้",
    usernameExists: "ไม่สามารถใช้ยูสเซอร์ดังกล่าวได้ เนื่องจากซ้ำกับข้อมูลเก่า",
    cannotDeleteSelf: "คุณไม่สามารถลดสิทธิ์หรือลบสิทธิ์บัญชีของตนเองออกได้ขณะออนไลน์",
    confirmDeleteUser: "แน่ใจหรือไม่ว่าต้องการอนุมัติการถอดคุณสมบัติแอดมินรายนี้ออก?",
    confirmDeleteRoom: "คุณแน่ใจหรือไม่ว่าต้องการถอนและลบห้องดังกล่าว? ระบบจะรีเซ็ตรายการจับคู่การจองที่ค้างอยู่ของห้องนี้ทั้งหมดด้วย",
    confirmDeleteBooking: "คุณต้องการทำลายหรือลบประวัติคำขอจองใช้จุดนี้ใช่หรือไม่?",
    confirmRejectBooking: "ท่านต้องการเซ็นต์ปฏิเสธรายละเอียดคำขอประชุมนี้ใช่หรือไม่?",
    bookingConfirmedOk: "ระบบทำการออกเลขและยืนยันการจองตารางเวลาของคุณเรียบร้อยแล้ว!",
    allRoomsSelector: "ทุกห้องประชุม",
    selectDeptOption: "โปรดคลิกเลือกกลุ่มแผนกงานของคุณ",
    approverRoleLabel: "ฝ่ายอนุมัติ (สิทธิ์สแกนตรวจสอบความเหมาะสม)",
    superAdminRoleLabel: "ผู้ควบคุมสูงสุด (สิทธิ์กำหนด/เพิ่มถอนพนักงานแอดมิน)",
    roomStatusLabel: "สถานะความพร้อมของห้องประชุม",
    statusOpen: "เปิดทางเลือกให้จองปกติ",
    statusClosed: "ปิดใช้งานชั่วคราว",
    closureReasonLabel: "ระบุปัญหาหรือสาเหตุที่ทำการปิดห้อง",
    closureReasonPlaceholder: "ระบุความมุ่งหมาย เช่น ปรับปรุงทาสีห้องใหม่ หรือเปลี่ยนแอร์",
    closureDateRangeLabel: "กำหนดช่วงวันที่ต้องการปิดห้อง (เสริม)",
    closureStartDateLabel: "เริ่มปิดวันที่ (DD/MM/YYYY)",
    closureEndDateLabel: "สิ้นสุดวันที่ปิด (DD/MM/YYYY)",
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
    declineMessage: "ขออภัย คุณจำเป็นต้องกดยอมรับแนวปฏิบัติการใช้บริการห้องประชุมก่อนจึงจะสามารถเข้าใช้และทำเรื่องจองจุดใช้งานต่าง ๆ ในระบบ YAGEO SmartRoom ได้",
    reviewTermsBtn: "ตรวจสอบแนวปฏิบัติอีกครั้ง",
    userGuideBtn: "คู่มือการใช้งานระบบ",
    userGuideTitle: "คู่มือการใช้งานระบบจองห้องประชุม YAGEO SmartRoom",
    close: "ปิดหน้าต่าง",
    ruleEligibleTitle: "1. ผู้มีสิทธิ์ใช้บริการ",
    ruleEligibleDesc: "พนักงานของ YAGEO ทุกคน และบุคคลที่ได้รับอนุญาตอย่างเป็นทางการจากฝ่ายบริหาร/HR เท่านั้น",
    ruleSystemOnlyTitle: "2. การจองผ่านระบบอย่างเป็นทางการ",
    ruleSystemOnlyDesc: "ผู้ใช้ต้องทำการจองและลงทะเบียนช่วงเวลาใช้บริการผ่านทางระบบ SmartRoom ค้นคว้านี้เท่านั้น",
    ruleLateTitle: "3. กฎการยกเลิกภายใน 15 นาที",
    ruleLateDesc: "หากไม่มาติดต่อรับกุญแจห้องภายในเวลา 15 นาทีตามเวลาเริ่มการจอง ระบบจะยกเลิกการจองดังกล่าวตามจำนวนชั่วโมงจองของรอบนั้นโดยอัตโนมัติทันที",
    ruleCapacityTitle: "4. การระบุจำนวนผู้เข้าใช้งาน",
    ruleCapacityDesc: "ผู้จองต้องระบุจำนวนผู้ร่วมเข้าใช้จริง โดยต้องไม่เกินความจุสูงสุดที่กำหนดไว้ในแต่ละห้อง",
    ruleFoodTitle: "5. นโยบายอาหารและเครื่องดื่ม",
    ruleFoodDesc: "ห้ามนำอาหาร ขนม ขบเคี้ยวเข้ามาในพื้นที่เด็ดขาด อนุญาตเฉพาะเครื่องดื่มที่บรรจุในภาชนะที่มีฝาปิดมิดชิดเท่านั้น",
    ruleFurnitureTitle: "6. การดูแลรักษาความเสียหาย",
    ruleFurnitureDesc: "ห้ามทำการเคลื่อนย้ายหรือดัดแปลงเฟอร์นิเจอร์ เครื่องใช้ และผู้ใช้ต้องรับผิดชอบค่าเสียหายทั้งหมดหากพบสิ่งของชำรุดเสียหาย",
    ruleClosingTitle: "7. การตรวจสอบก่อนออกจากห้อง",
    ruleClosingDesc: "ปิดเครื่องปรับอากาศ ปิดไฟ ถอดปลั๊กไฟและสายโทรทัศน์ (TV) ล็อคห้อง และดำเนินการส่งคืนกุญแจพร้อมอุปกรณ์ต่าง ๆ ณ เคาน์เตอร์ Information หลังเสร็จสิ้นการใช้งาน"
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

export const formatDate = (date: Date, language: "th" | "en", options: Intl.DateTimeFormatOptions = {}): string => {
  const locale = language === "th" ? "th-TH" : "en-US";
  return date.toLocaleDateString(locale, {
    weekday: options.weekday || "long",
    year: options.year || "numeric",
    month: options.month || "long",
    day: options.day || "numeric",
  });
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
