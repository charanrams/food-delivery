import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import type { AuthResponseDto } from '@a3/contracts';
import { Button } from '@/components/ui';
import { useAuth } from '@/auth/AuthContext';
import { api, ApiError } from '@/lib/api';
import { AuthShell, Field, OtpField, PASSWORD_RULE, PasswordField, ResendButton, validEmail, validPhone } from './AuthShell';

type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm' | 'phone' | 'otp' | 'form', string>>;
const message = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
const digits = (v: string) => v.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');

/**
 * W11 · Create account (same workflow as the mobile app): name, email, password and a mobile
 * number verified by OTP (dummy in dev). Opened from login pre-filled with the email/number
 * that wasn't registered. Always creates a customer account.
 */
export function RegisterPage() {
  const { acceptSession } = useAuth();
  const navigate = useNavigate();
  const state = useLocation().state as { from?: string; email?: string; phone?: string } | null;
  const [form, setForm] = useState({ name: '', email: state?.email ?? '', password: '', confirm: '', phone: state?.phone ?? '' });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [devCode, setDevCode] = useState<string>();
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined, form: undefined }));
  };

  const validate = (): Errors => {
    const next: Errors = {};
    if (form.name.trim().length < 2) next.name = 'Enter your full name.';
    if (!validEmail(form.email)) next.email = 'Enter a valid email address.';
    if (form.password.length < 8) next.password = PASSWORD_RULE;
    if (form.confirm !== form.password) next.confirm = 'Passwords don’t match.';
    if (!validPhone(form.phone)) next.phone = 'Enter a valid 10-digit mobile number.';
    return next;
  };

  const sendOtp = async () => {
    const r = await api.post<{ devCode?: string }>('/auth/phone/otp', { phone: digits(form.phone) });
    setDevCode(r.devCode);
    setOtpSent(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next = validate();
    if (otpSent && otp.length !== 6) next.otp = 'Enter the 6-digit OTP sent to your number.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      if (!otpSent) {
        await sendOtp();
      } else {
        const res = await api.post<AuthResponseDto>('/auth/signup', {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: digits(form.phone),
          password: form.password,
          otp,
        });
        acceptSession(res);
        navigate(state?.from ?? '/', { replace: true });
      }
    } catch (err) {
      setErrors({ form: message(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Order in a few taps and track every delivery."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={state} className="font-semibold text-primary-strong">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field id="name" label="Full name" autoComplete="name" autoFocus value={form.name} onChange={set('name')} error={errors.name} />
        <Field id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <PasswordField id="password" label="Password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} hint={PASSWORD_RULE} />
        <PasswordField id="confirm" label="Confirm password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <Field
          id="phone"
          label="Mobile number"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          readOnly={otpSent}
          value={form.phone}
          onChange={(e) => set('phone')({ target: { value: e.target.value.replace(/\D/g, '').slice(0, 10) } })}
          error={errors.phone}
          hint={otpSent ? undefined : 'We’ll send an OTP to verify it.'}
          aside={
            otpSent ? (
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                }}
                className="text-[13px] font-medium text-primary-strong"
              >
                Change
              </button>
            ) : undefined
          }
        />
        {otpSent && (
          <>
            <OtpField value={otp} onChange={(v) => { setOtp(v); setErrors((x) => ({ ...x, otp: undefined })); }} error={errors.otp} />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-muted">{devCode ? `Test mode: use OTP ${devCode}` : `Sent to +91 ${digits(form.phone)}`}</span>
              <ResendButton onResend={() => sendOtp().catch((e: unknown) => setErrors({ form: message(e) }))} />
            </div>
          </>
        )}
        {errors.form && (
          <p role="alert" className="text-[13px] text-danger">
            {errors.form}
          </p>
        )}
        <Button type="submit" loading={busy}>
          {otpSent ? 'Create account' : 'Send OTP'}
        </Button>
      </form>
    </AuthShell>
  );
}
