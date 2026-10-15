import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { AuthShell, Field, OtpField, PASSWORD_RULE, PasswordField, ResendButton, validEmail } from './AuthShell';

const message = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');

/** Forgot password — email a 6-digit code, then set a new password. Works for every role. */
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState((useLocation().state as { email?: string } | null)?.email ?? '');
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'email' | 'otp' | 'password' | 'confirm', string>>>({});
  const [busy, setBusy] = useState(false);

  const sendCode = () => api.post('/auth/password/forgot', { email: email.trim() });

  const submitEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!validEmail(email)) return setErrors({ email: 'Enter the email on your account.' });
    setErrors({});
    setBusy(true);
    try {
      await sendCode();
      setStep('reset');
    } catch (err) {
      setErrors({ email: message(err) });
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (otp.length !== 6) next.otp = 'Enter the 6-digit code from the email.';
    if (password.length < 8) next.password = PASSWORD_RULE;
    else if (confirm !== password) next.confirm = 'Passwords don’t match.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await api.post('/auth/password/reset', { email: email.trim(), otp, password });
      navigate('/login', { replace: true, state: { notice: 'Password updated. Log in with your new password.' } });
    } catch (err) {
      setErrors({ otp: message(err) });
    } finally {
      setBusy(false);
    }
  };

  const back = (
    <Link to="/login" className="font-semibold text-primary-strong">
      Back to log in
    </Link>
  );

  if (step === 'reset') {
    return (
      <AuthShell
        title="Set a new password"
        subtitle={
          <>
            If <strong className="text-ink">{email.trim()}</strong> has an account, we’ve sent it a 6-digit code.
          </>
        }
        footer={back}
      >
        <form onSubmit={submitReset} noValidate className="flex flex-col gap-4">
          <OtpField value={otp} onChange={setOtp} error={errors.otp} />
          <PasswordField id="new-password" label="New password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} hint={PASSWORD_RULE} />
          <PasswordField id="confirm-password" label="Confirm new password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
          <Button type="submit" loading={busy}>
            Update password
          </Button>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => { setStep('email'); setOtp(''); setErrors({}); }} className="min-h-11 text-sm font-medium text-muted hover:text-ink">
              Use a different email
            </button>
            <ResendButton
              onResend={async () => {
                try {
                  await sendCode();
                } catch (err) {
                  setErrors({ otp: message(err) });
                  throw err;
                }
              }}
            />
          </div>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot password?" subtitle="Enter the email on your account and we’ll send you a code to reset it." footer={back}>
      <form onSubmit={submitEmail} noValidate className="flex flex-col gap-4">
        <Field id="email" label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <Button type="submit" loading={busy}>
          Send code
        </Button>
      </form>
    </AuthShell>
  );
}
