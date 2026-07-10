import { formatDepartment } from './translations';

type DepartmentBookingStyle = {
  itemClass: string;
  badgeClass: string;
  dotClass: string;
};

type DepartmentBookingStyleContext = 'timeline' | 'default';

type DepartmentBookingStyleOptions = {
  context?: DepartmentBookingStyleContext;
};

const DEFAULT_STYLE: DepartmentBookingStyle = {
  itemClass: '!bg-orange-100 !border-orange-300 !text-orange-950',
  badgeClass: '!bg-orange-100 !border-orange-300 !text-orange-800',
  dotClass: 'bg-orange-500',
};

const DEPARTMENT_STYLES: Record<string, DepartmentBookingStyle> = {
  managing_director: { itemClass: '!bg-amber-50 !border-amber-300 !text-amber-950', badgeClass: '!bg-amber-100 !border-amber-300 !text-amber-900', dotClass: 'bg-amber-500' },
  hr: { itemClass: '!bg-rose-50 !border-rose-300 !text-rose-950', badgeClass: '!bg-rose-100 !border-rose-300 !text-rose-800', dotClass: 'bg-rose-500' },
  sustainability: { itemClass: '!bg-emerald-50 !border-emerald-300 !text-emerald-950', badgeClass: '!bg-emerald-100 !border-emerald-300 !text-emerald-800', dotClass: 'bg-emerald-500' },
  fin_acc: { itemClass: '!bg-cyan-50 !border-cyan-300 !text-cyan-950', badgeClass: '!bg-cyan-100 !border-cyan-300 !text-cyan-800', dotClass: 'bg-cyan-500' },
  planning: { itemClass: '!bg-blue-50 !border-blue-300 !text-blue-950', badgeClass: '!bg-blue-100 !border-blue-300 !text-blue-800', dotClass: 'bg-blue-500' },
  procurement: { itemClass: '!bg-violet-50 !border-violet-300 !text-violet-950', badgeClass: '!bg-violet-100 !border-violet-300 !text-violet-800', dotClass: 'bg-violet-500' },
  prod_eng: { itemClass: '!bg-orange-50 !border-orange-300 !text-orange-950', badgeClass: '!bg-orange-100 !border-orange-300 !text-orange-800', dotClass: 'bg-orange-500' },
  technology: { itemClass: '!bg-indigo-50 !border-indigo-300 !text-indigo-950', badgeClass: '!bg-indigo-100 !border-indigo-300 !text-indigo-800', dotClass: 'bg-indigo-500' },
  equipment_engineering: { itemClass: '!bg-teal-50 !border-teal-300 !text-teal-950', badgeClass: '!bg-teal-100 !border-teal-300 !text-teal-800', dotClass: 'bg-teal-500' },
  facility: { itemClass: '!bg-slate-50 !border-slate-300 !text-slate-900', badgeClass: '!bg-slate-100 !border-slate-300 !text-slate-700', dotClass: 'bg-slate-500' },
  qa: { itemClass: '!bg-purple-50 !border-purple-300 !text-purple-950', badgeClass: '!bg-purple-100 !border-purple-300 !text-purple-800', dotClass: 'bg-purple-500' },
  ta_mfg: { itemClass: '!bg-lime-50 !border-lime-300 !text-lime-950', badgeClass: '!bg-lime-100 !border-lime-300 !text-lime-800', dotClass: 'bg-lime-500' },
  sc: { itemClass: '!bg-green-50 !border-green-300 !text-green-950', badgeClass: '!bg-green-100 !border-green-300 !text-green-800', dotClass: 'bg-green-500' },
  it: { itemClass: 'booking-it-neon', badgeClass: 'booking-it-neon !border-cyan-300 !text-sky-950', dotClass: 'bg-cyan-500' },
};

const RAW_DEPARTMENT_ALIASES: Record<string, string> = {
  'managing director': 'managing_director', md: 'managing_director',
  hr: 'hr', sustainability: 'sustainability', sust: 'sustainability',
  'fin&acc': 'fin_acc', 'fin & acc': 'fin_acc', fa: 'fin_acc', finance: 'fin_acc', accounting: 'fin_acc',
  planning: 'planning', pln: 'planning', procurement: 'procurement', proc: 'procurement',
  'prod eng': 'prod_eng', 'production engineering': 'prod_eng', pe: 'prod_eng',
  technology: 'technology',
  'equipment engineering': 'equipment_engineering', ee: 'equipment_engineering',
  facility: 'facility', facilities: 'facility', fac: 'facility',
  qa: 'qa', 'quality assurance': 'qa',
  'ta mfg': 'ta_mfg', manufacturing: 'ta_mfg',
  sc: 'sc', 'supply chain': 'sc',
  it: 'it', 'information technology': 'it',
};

const normalizeDepartmentText = (department?: string | null) => (
  (department || '').trim().toLowerCase().replace(/\s+/g, ' ')
);

export const getDepartmentBookingStyleKey = (department?: string | null) => {
  const rawDepartment = normalizeDepartmentText(department);
  if (!rawDepartment) return '';
  const rawMatch = RAW_DEPARTMENT_ALIASES[rawDepartment];
  if (rawMatch) return rawMatch;
  const formattedDepartment = normalizeDepartmentText(formatDepartment(department));
  return RAW_DEPARTMENT_ALIASES[formattedDepartment] || '';
};

export const isItBookingDepartment = (department?: string | null) => getDepartmentBookingStyleKey(department) === 'it';
export const getDepartmentBookingStyle = (
  department?: string | null,
  options: DepartmentBookingStyleOptions = {}
): DepartmentBookingStyle => {
  const styleKey = getDepartmentBookingStyleKey(department);
  if (styleKey === 'it') return DEPARTMENT_STYLES.it;
  return DEFAULT_STYLE;
};
export const getBookingDepartmentClass = (department?: string | null, options?: DepartmentBookingStyleOptions) => getDepartmentBookingStyle(department, options).itemClass;
export const getBookingDepartmentBadgeClass = (department?: string | null, options?: DepartmentBookingStyleOptions) => getDepartmentBookingStyle(department, options).badgeClass;
export const getBookingDepartmentDotClass = (department?: string | null, options?: DepartmentBookingStyleOptions) => getDepartmentBookingStyle(department, options).dotClass;
export const shouldUseDepartmentBookingStyle = (state?: string) => (
  state !== 'pending' && state !== 'noCheckIn' && state !== 'rejected'
);

export const getBookingDepartmentClassForState = (state: string | undefined, department?: string | null, options?: DepartmentBookingStyleOptions) => (
  shouldUseDepartmentBookingStyle(state) ? getBookingDepartmentClass(department, options) : ''
);

export const getBookingDepartmentBadgeClassForState = (state: string | undefined, department?: string | null, options?: DepartmentBookingStyleOptions) => (
  shouldUseDepartmentBookingStyle(state) ? getBookingDepartmentBadgeClass(department, options) : ''
);
