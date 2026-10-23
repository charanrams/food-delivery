import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import type { AuthResponseDto } from '@a3/contracts';
import { Button } from '@/components/ui';
import { HOME_FOR_ROLE, useAuth } from '@/auth/AuthContext';
import { api, ApiError } from '@/lib/api';
import { AuthShell, Field, OtpField, PasswordField, ResendButton, validEmail, validPhone } from './AuthShell';

type Step = 'identifier' | 'password' | 'otp';
const digits = (v: string) => v.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');

/**
 * W10 · Login — one field (same workflow as the mobile app, modelled on driveflow):
 *   email + registered → password · phone + registered → OTP (dummy in dev) ·
 *   not registered → /register pre-filled. The server's role decides where you land.
 */
export function LoginPage() {
  const { login, acceptSession } = useAuth();
  const navigate = useNavigate();
  const state = useLocation().state as { from?: string; notice?: string } | null;
  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [devCode, setDevCode] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const id = identifier.trim();
  const isEmail = id.includes('@');
  const phone = digits(id);

  const run = async (action: () => Promise<void>) => {
    setError(undefined);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const land = (role: keyof typeof HOME_FOR_ROLE) => {
    // Customers return to where they were; staff always go to their own area.
    const from = state?.from;
    navigate(role === 'CUSTOMER' && from && !from.startsWith('/admin') && !from.startsWith('/delivery') ? from : HOME_FOR_ROLE[role], { replace: true });
  };

  const sendOtp = async () => {
    const r = await api.post<{ devCode?: string }>('/auth/phone/otp', { phone });
    setDevCode(r.devCode);
    if (r.devCode) setOtp(r.devCode); // no SMS yet: the server hands the code back, fill it in
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (step === 'identifier') {
      if (isEmail ? !validEmail(id) : !validPhone(phone)) return setError('Enter a valid email or 10-digit mobile number.');
      return run(async () => {
        const r = await api.post<{ kind: 'email' | 'phone'; exists: boolean }>('/auth/check', { identifier: isEmail ? id : phone });
        if (!r.exists) {
          navigate('/register', { replace: true, state: { ...state, email: isEmail ? id : undefined, phone: isEmail ? undefined : phone } });
          return;
        }
        if (r.kind === 'email') {
          setPassword('');
          setStep('password');
        } else {
          setOtp('');
          await sendOtp();
          setStep('otp');
        }
      });
    }
    if (step === 'password') {
      if (!password) return setError('Enter your password.');
      return run(async () => land((await login(id, password)).role));
    }
    if (otp.length !== 6) return setError('Enter the 6-digit OTP.');
    return run(async () => land(acceptSession(await api.post<AuthResponseDto>('/auth/phone/verify', { phone, otp })).role));
  };

  const back = () => {
    setStep('identifier');
    setError(undefined);
  };

  const [title, subtitle] =
    step === 'identifier'
      ? ['Log in or sign up', 'Enter your email or mobile number to continue.']
      : step === 'password'
        ? ['Enter your password', `Logging in as ${id}`]
        : ['Verify your number', `Enter the 6-digit OTP sent to +91 ${phone}.`];

  return (
    <AuthShell title={title} subtitle={subtitle}>
      {state?.notice && (
        <p role="status" className="rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
          {state.notice}
        </p>
      )}
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {step === 'identifier' && (
          <Field
            id="identifier"
            label="Email or mobile number"
            autoComplete="username"
            inputMode="email"
            autoFocus
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setError(undefined);
            }}
          />
        )}
        {step === 'password' && (
          <PasswordField
            id="password"
            label="Password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aside={
              <Link to="/forgot-password" state={{ email: id }} className="text-[13px] font-medium text-primary-strong">
                Forgot password?
              </Link>
            }
          />
        )}
        {step === 'otp' && (
          <>
            <OtpField value={otp} onChange={setOtp} />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-muted">{devCode ? `Your code is ${devCode} (filled in for you)` : `Sent to +91 ${phone}`}</span>
              <ResendButton onResend={() => sendOtp().catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Couldn’t resend.'))} />
            </div>
          </>
        )}
        {error && (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        )}
        <Button type="submit" loading={busy}>
          {step === 'identifier' ? 'Continue' : step === 'password' ? 'Log in' : 'Verify & log in'}
        </Button>
        {step !== 'identifier' && (
          <button type="button" onClick={back} className="min-h-11 text-sm font-semibold text-primary-strong">
            {step === 'otp' ? 'Change number' : 'Use a different account'}
          </button>
        )}
      </form>
    </AuthShell>
  );
}
