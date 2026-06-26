import React, { useState } from 'react';
import { TRANSLATIONS } from '../translations';
import { X, Layout, CalendarRange, BookOpen, Clock, Users, ArrowRight, CheckCircle, ShieldAlert, Monitor, Ban } from 'lucide-react';
import { Room } from '../types';

interface UserGuideModalProps {
  language: 'th' | 'en';
  rooms: Room[];
  onClose: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  language,
  rooms,
  onClose
}) => {
  const t = TRANSLATIONS[language];
  const [activeTab, setActiveTab] = useState<'overview' | 'booking' | 'rules'>('overview');

  const tabs = [
    { id: 'overview', label: language === 'th' ? 'ภาพรวมและตารางเวลา' : 'Overview & Timeline', icon: Layout },
    { id: 'booking', label: language === 'th' ? 'ขั้นตอนการจองห้อง' : 'How to Book', icon: CalendarRange },
    { id: 'rules', label: language === 'th' ? 'กฎระเบียบการใช้งาน' : 'Room Rules', icon: BookOpen },
  ] as const;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[80vh] animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-150 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <BookOpen className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-slate-850 text-base sm:text-lg">{t.userGuideTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100/60 border-b border-slate-150 flex overflow-x-auto scrollbar-none flex-shrink-0 px-2">
          <div className="flex space-x-1.5 py-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center space-x-2 transition-all flex-shrink-0 ${activeTab === tab.id
                      ? 'bg-white text-brand-600 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-850 hover:bg-white/40'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="p-6 overflow-y-auto flex-grow text-slate-800 scrollbar-thin text-sm leading-relaxed">

          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex items-start space-x-3">
                <Layout className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-brand-900 text-xs uppercase tracking-wider">
                    {language === 'th' ? 'หน้าแดชบอร์ด' : 'SMART DASHBOARD SUMMARY'}
                  </h4>
                  <p className="text-xs text-brand-700 font-medium mt-1">
                    {language === 'th'
                      ? 'ระบบจองห้อง TOKIN Smart Room แสดงสถานะห้องและรายการใช้งานจริง เพื่อความสะดวกและเรียลไทม์ที่สุด'
                      : 'TOKIN Smart Room shows real-time room occupancies and reservation matrices to simplify workspace coordination.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                    {language === 'th' ? 'สถานะป้ายห้องสีเขียว (AVAILABLE NOW)' : 'Green Tag: AVAILABLE NOW'}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1.5 font-medium">
                    {language === 'th'
                      ? 'ห้องว่าง ณ ขณะเวลาปัจจุบัน คุณสามารถสแกนเวลาและดำเนินการขอเปิดใช้งานหรือจองใช้งานได้ทันที'
                      : 'The room is currently empty. You can select the available hours and submit a request immediately.'}
                  </p>
                </div>

                <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center">
                    <span className="w-2 h-2 rounded-full bg-rose-500 mr-2"></span>
                    {language === 'th' ? 'สถานะป้ายห้องสีแดง (OCCUPIED NOW)' : 'Red Tag: OCCUPIED NOW'}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1.5 font-medium">
                    {language === 'th'
                      ? 'ห้องมีผู้ใช้จองอยู่ ณ ปัจจุบัน ไม่สามารถคลิกใช้ได้ แต่จะแสดงตารางกำหนดการถัดไปของวันให้อัตโนมัติ'
                      : 'The room is booked right now. You can check its upcoming agenda directly on the card.'}
                  </p>
                </div>
              </div>

              <div className="border border-slate-150 rounded-xl p-4 space-y-2.5">
                <h4 className="font-bold text-slate-900 text-xs">{language === 'th' ? 'การดูปฏิทินตารางเวลา (Timeline Grid)' : 'How to Read the Timeline Grid'}</h4>
                <p className="text-xs text-slate-600 font-medium">
                  {language === 'th'
                    ? 'เมื่อคลิกเลือกห้องประชุม คุณจะเข้าสู่ปฏิทินแสดงรอบเวลารายชั่วโมง (07:00 - 19:00 น.) ของวันนั้น:'
                    : 'Clicking any room opens its daily time-slice calendar grid (from 7:00 AM to 7:00 PM):'}
                </p>
                <ul className="text-xs text-slate-600 font-medium list-disc pl-5 space-y-1">
                  <li>{language === 'th' ? 'ช่องสีเขียว: เป็นเวลาว่างที่สามารถเปิดขอใช้งานได้' : 'Green slot: Free slot available for booking.'}</li>
                  <li>{language === 'th' ? 'ช่องสีแดง/ชมพู: ได้รับอนุมัติการจองแล้ว และแสดงชื่อหัวข้อการจอง' : 'Red/Pink slot: Confirmed booking. Hover to see the title.'}</li>
                  <li>{language === 'th' ? 'ช่องสีส้ม: คิวค้างรอแอดมินหรือฝ่ายอนุมัติตรวจความเหมาะสม' : 'Orange slot: Pending approval request.'}</li>
                  <li>{language === 'th' ? 'ช่องสีเทา: ชั่วโมงที่ล่วงเวลาจองไปแล้วในวันนั้น' : 'Gray slot: Past hours that have already expired.'}</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'booking' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">{language === 'th' ? 'แนวทางขั้นตอนการส่งคำจองห้องประชุม' : 'Step-by-step Room Booking Guide'}</h3>

              <div className="space-y-3">
                <div className="flex space-x-3.5 items-start">
                  <div className="bg-brand-100 text-brand-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 mt-0.5">1</div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{language === 'th' ? 'เลือกห้องที่ต้องการและช่วงเวลา' : 'Step 1: Select Room and Hours'}</h4>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      {language === 'th'
                        ? 'เข้าเมนูตารางเวลา คลิกช่องชั่วโมงที่ว่างในฝั่งซ้ายของห้องที่เลือก (สามารถเลือกหลายรอบเวลาต่อเนื่องกันได้) เวลาที่เลือกจะเปลี่ยนเป็นแถบสีแดงเข้ม (Selected)'
                        : 'Navigate to the timeline grid. Click the empty hour slots in the left-hand column (you can select multiple consecutive hours). Selected slots highlight in solid brand color.'}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3.5 items-start">
                  <div className="bg-brand-100 text-brand-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 mt-0.5">2</div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{language === 'th' ? 'กดปุ่มเพื่อดำเนินการจอง' : 'Step 2: Proceed to Book'}</h4>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      {language === 'th'
                        ? 'ที่การ์ดสรุปห้องด้านขวา แถบช่วงเวลาจะคำนวณสรุปเวลาจองให้โดยอัตโนมัติ ให้ทำการกดปุ่มสีส้ม "ดำเนินการจองห้อง" (Proceed to Book)'
                        : 'On the right-hand card, the chosen times aggregate automatically. Review the range, then click the orange "Proceed to Book" button.'}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3.5 items-start">
                  <div className="bg-brand-100 text-brand-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 mt-0.5">3</div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{language === 'th' ? 'ระบุข้อมูลรายละเอียดการจอง' : 'Step 3: Fill Booking Form Details'}</h4>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      {language === 'th'
                        ? 'กรอกข้อมูลให้ครบถ้วนในกล่องป๊อปอัพ: หัวข้อเรื่องประชุม, ชื่อผู้ติดต่อจอง, รหัสพนักงาน, เลือกแผนกงานสังเคราะห์ (Department) และหมายเลขโต๊ะ (ถ้ามี)'
                        : 'Provide valid info in the booking modal form: Meeting Title, Organizer name, Employee ID, Department, and desk number if applicable.'}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3.5 items-start">
                  <div className="bg-brand-100 text-brand-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 mt-0.5">4</div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{language === 'th' ? 'ยืนยันและติดตามการอนุมัติ' : 'Step 4: Confirm & Await Approval'}</h4>
                    <p className="text-xs text-slate-600 mt-0.5 font-semibold">
                      {language === 'th'
                        ? 'กดปุ่มยืนยัน! หากห้องประชุมดังกล่าวไม่ได้ระบุเป็นจองอัตโนมัติ คำขอจองจะแสดงสถานะเป็น "รออนุมัติ" (Pending) โดยคุณสามารถมาติดต่อรับกุญแจและเช็คการอนุมัติจากฝ่ายแอดมินก่อนเข้าใช้งาน 15 นาที'
                        : 'Click Confirm. If the room is not set to auto-confirm, the request displays as Pending. Pick up the room keys and obtain approval from the admin counter 15 minutes before the start time.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">{language === 'th' ? 'ระเบียบและข้อตกลงในการใช้บริการสถานที่' : 'Official Workspace Rules & Service Guidelines'}</h3>

              <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                {/* Rule list subset */}
                <div className="flex space-x-2.5 items-start">
                  <CheckCircle className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-700 font-medium">
                    {language === 'th'
                      ? 'จองใช้งานห้องผ่านตัวหน้าเว็บระบบจองนี้เท่านั้นเพื่อป้องกันความซ้ำซ้อนตารางคิว'
                      : 'Book rooms exclusively using the digital booking portal to prevent double-bookings.'}
                  </p>
                </div>

                <div className="flex space-x-2.5 items-start border-t border-slate-200/50 pt-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-700 font-semibold">
                    {language === 'th'
                      ? 'หากไม่เข้าแสดงตนรับกุญแจห้องภายใน 15 นาทีตามรอบเวลาจอง ระบบจะรีเซ็ตสิทธิ์และปล่อยห้องเป็นว่างตามชั่วโมงที่จองทันทีโดยอัตโนมัติ'
                      : 'Reservations are subject to automatic release and cancellation if keys/room are not claimed within 15 minutes of the start time.'}
                  </p>
                </div>

                <div className="flex space-x-2.5 items-start border-t border-slate-200/50 pt-2.5">
                  <Ban className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-700 font-semibold">
                    {language === 'th'
                      ? 'ห้ามพกพาอาหาร ขนม หรือของว่างเข้าห้องสมุด/ห้องประชุมเด็ดขาด อนุญาตเฉพาะเครื่องดื่มที่บรรจุขวด/แก้วปิดฝาแน่นหนาเท่านั้น'
                      : 'Strictly no food or snacks inside the rooms. Only drinks in closed/capped containers are allowed.'}
                  </p>
                </div>

                <div className="flex space-x-2.5 items-start border-t border-slate-200/50 pt-2.5">
                  <CheckCircle className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-700 font-semibold">
                    {language === 'th'
                      ? 'เมื่อใช้เสร็จแล้วต้องตรวจสอบ: ปิดแอร์ ปิดไฟ ถอดปลั๊กอุปกรณ์พ่วงทั้งหมด ล็อคห้อง และดำเนินการคืนกุญแจที่ Information ทันที'
                      : 'Always run the post-use safety checklist: turn off AC/lights, unplug adapters, lock doors, and return keys to Information.'}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
          >
            {t.close}
          </button>
        </div>

      </div>
    </div>
  );
};

