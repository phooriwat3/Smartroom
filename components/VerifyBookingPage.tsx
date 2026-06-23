import React, { useEffect, useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { functions } from '../firebase';

interface VerifyBookingPageProps {
  language: 'th' | 'en';
}

type VerificationState =
  | { status: 'loading' }
  | { status: 'success'; title?: string; alreadyVerified?: boolean }
  | { status: 'error'; message: string };

const VerifyBookingPage: React.FC<VerifyBookingPageProps> = ({ language }) => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const bookingId = params.get('bookingId') || '';
  const token = params.get('token') || '';
  const [state, setState] = useState<VerificationState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!bookingId || !token) {
        setState({
          status: 'error',
          message: language === 'th'
            ? 'ลิงก์ยืนยันไม่สมบูรณ์'
            : 'The verification link is missing required data.',
        });
        return;
      }

      try {
        const verifyToken = httpsCallable(functions, 'verifyBookingToken');
        const response = await verifyToken({ bookingId, token });
        if (cancelled) return;

        const data = response.data as { title?: string; alreadyVerified?: boolean };
        setState({
          status: 'success',
          title: data.title,
          alreadyVerified: data.alreadyVerified,
        });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setState({
          status: 'error',
          message: language === 'th'
            ? 'ไม่สามารถยืนยันการจองได้ กรุณาตรวจสอบลิงก์หรือขออีเมลใหม่'
            : message || 'Booking verification failed. Check the link or request a new email.',
        });
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [bookingId, language, token]);

  const goHome = () => {
    window.history.replaceState({}, '', '/');
    window.location.assign('/');
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {state.status === 'loading' && (
          <div className="flex flex-col items-center text-center">
            <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              {language === 'th' ? 'กำลังยืนยันการจอง' : 'Verifying booking'}
            </h1>
          </div>
        )}

        {state.status === 'success' && (
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              {state.alreadyVerified
                ? (language === 'th' ? 'ยืนยันการจองนี้แล้ว' : 'You already verified this booking')
                : (language === 'th' ? 'ยืนยันการจองสำเร็จ' : 'Booking verified')}
            </h1>
            {state.title && (
              <p className="mt-2 text-sm font-semibold text-slate-600">{state.title}</p>
            )}
            <p className="mt-3 text-sm text-slate-500">
              {language === 'th'
                ? 'ระบบได้บันทึกเวลาเข้าใช้งานห้องเรียบร้อยแล้ว'
                : 'The room check-in time has been recorded.'}
            </p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="h-12 w-12 text-rose-500" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              {language === 'th' ? 'ยืนยันไม่สำเร็จ' : 'Verification failed'}
            </h1>
            <p className="mt-3 text-sm text-slate-500">{state.message}</p>
          </div>
        )}

        <button
          type="button"
          onClick={goHome}
          className="mt-6 w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
        >
          {language === 'th' ? 'กลับหน้าแรก' : 'Back to SmartRoom'}
        </button>
      </section>
    </main>
  );
};

export default VerifyBookingPage;
