const normalizeDepartment = (department?: string) => department?.trim().toLowerCase() || '';

export const isItBookingDepartment = (department?: string) => normalizeDepartment(department) === 'it';

export const getBookingDepartmentClass = (department?: string) =>
  isItBookingDepartment(department) ? 'booking-it-neon' : '';
