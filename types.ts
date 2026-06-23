export enum RoomType {
  MEETING = 'Meeting Room',
  RECEPTION = 'Reception Area',
  TRAINING = 'Training Room'
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  NO_SHOW = 'NO_SHOW'
}

export type AdminRole = 'SUPER_ADMIN' | 'APPROVER';

export interface AdminUser {
  id: string;
  username: string;
  password: string;
  role: AdminRole;
  name?: string;
  employeeId?: string;
  department?: string;
  phone?: string;
}

export interface RoomMaintenanceRecord {
  id: string;
  roomId: string;
  roomName: string;
  reason: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startTime: number; // hour (e.g. 7 - 23)
  endTime: number;   // hour (e.g. 8 - 19)
  createdAt?: any;
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  capacity: number;
  amenities: string[];
  imageUrl: string;
  isClosed?: boolean;
  closureReason?: string;
  closureStartDate?: string; // YYYY-MM-DD
  closureEndDate?: string;   // YYYY-MM-DD
  closureStartTime?: number; // hour (e.g. 7 - 23)
  closureEndTime?: number;   // hour (e.g. 8 - 19)
  maintenanceHistory?: RoomMaintenanceRecord[];
}

export interface Booking {
  id: string;
  roomId: string;
  title: string;
  organizer: string;
  department: string;
  employeeId: string;
  email?: string;
  startTime: Date; // JavaScript Date object
  endTime: Date;   // JavaScript Date object
  status: BookingStatus;
  deskNumber?: string;
  createdAt?: any;
  actualStartTime?: Date;
  actualEndTime?: Date;
  noShowMarkedAt?: any;
  verifiedAt?: any;
  verificationEmailStatus?: 'queued' | 'sent' | 'failed';
  verificationEmailFailedAt?: any;
  verifyUrl?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}
