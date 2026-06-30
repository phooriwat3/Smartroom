import { formatDepartment } from './translations';

export const isItBookingDepartment = (department?: string) => formatDepartment(department) === 'IT';

export const getBookingDepartmentClass = (department?: string) =>
  isItBookingDepartment(department) ? 'booking-it-neon' : '';
