import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config';
import { logger } from './logger';

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Emails "sent" while NODE_ENV=test — tests read OTPs and passwords from here. */
export const testOutbox: Mail[] = [];

// Inline (CID) logo so it renders in Gmail/Outlook without "load remote images".
const LOGO_PATH = resolve(process.cwd(), 'assets/logo.png');
const LOGO_CID = 'a3-logo';

let transport: Transporter | undefined;
const transporter = () =>
  (transport ??= nodemailer.createTransport({
    host: config().SMTP_HOST,
    port: config().SMTP_PORT,
    secure: config().SMTP_PORT === 465,
    auth: { user: config().SMTP_USER, pass: config().SMTP_PASS },
  }));

export async function sendMail(mail: Mail): Promise<void> {
  if (config().NODE_ENV === 'test') {
    testOutbox.push(mail);
    return;
  }
  if (!config().SMTP_USER) {
    // No SMTP configured in development: print the mail so the flow is still usable.
    logger.warn(`SMTP not configured — email not sent:\n${mail.text}`);
    return;
  }
  await transporter().sendMail({
    from: config().MAIL_FROM ?? `A3 Kitchen <${config().SMTP_USER}>`,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    attachments: existsSync(LOGO_PATH) ? [{ filename: 'a3-kitchen.png', path: LOGO_PATH, cid: LOGO_CID }] : [],
  });
  logger.info('email sent'); // never log the subject — it can contain a one-time code
}

// ---------- Templates ----------
// Table layout + inline styles: the only thing every mail client renders reliably.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const C = { orange: '#F58220', button: '#B4530A', ink: '#1F1A17', muted: '#6B625C', soft: '#FFF4EA', line: '#EFE6DE', page: '#FBF7F3' };

function layout(opts: { preheader: string; heading: string; body: string }): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:${C.page};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${C.line};border-radius:16px;">
    <tr><td align="center" style="padding:32px 32px 8px;">
      <img src="cid:${LOGO_CID}" width="72" height="72" alt="A3 Kitchen" style="display:block;border:0;border-radius:36px;">
      <p style="margin:12px 0 0;font:600 15px/1.4 Georgia,'Times New Roman',serif;color:${C.ink};">A3 Kitchen</p>
    </td></tr>
    <tr><td style="padding:16px 32px 32px;font:15px/1.6 Arial,Helvetica,sans-serif;color:${C.ink};">
      <h1 style="margin:0 0 16px;font:600 24px/1.3 Georgia,'Times New Roman',serif;color:${C.ink};">${esc(opts.heading)}</h1>
      ${opts.body}
    </td></tr>
  </table>
  <p style="max-width:560px;margin:16px auto 0;font:12px/1.5 Arial,Helvetica,sans-serif;color:${C.muted};text-align:center;">
    A3 Kitchen · Freshly Prepared. Delivered with Care.<br>You received this email because of activity on your A3 Kitchen account.
  </p>
</td></tr>
</table>
</body></html>`;
}

const p = (html: string) => `<p style="margin:0 0 16px;">${html}</p>`;
const muted = (html: string) => `<p style="margin:16px 0 0;font-size:13px;color:${C.muted};">${html}</p>`;
const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;"><tr><td style="border-radius:10px;background:${C.button};">
    <a href="${esc(href)}" style="display:inline-block;padding:13px 28px;font:600 15px Arial,Helvetica,sans-serif;color:#ffffff;text-decoration:none;">${esc(label)}</a>
  </td></tr></table>`;

export function otpEmail(opts: { name?: string; code: string; purpose: 'REGISTER' | 'RESET_PASSWORD' | 'LOGIN'; minutes: number }): Omit<Mail, 'to'> {
  const register = opts.purpose === 'REGISTER';
  const login = opts.purpose === 'LOGIN';
  const heading = register ? 'Verify your email' : login ? 'Your login code' : 'Reset your password';
  const intro = register
    ? 'Use this code to finish creating your A3 Kitchen account.'
    : login
      ? 'Use this code to log in to A3 Kitchen.'
      : 'Use this code to set a new password for your A3 Kitchen account.';
  const greet = opts.name ? `Hi ${esc(opts.name)},` : 'Hi,';
  const body =
    p(greet) +
    p(intro) +
    `<div style="margin:8px 0 16px;padding:20px;background:${C.soft};border-radius:12px;text-align:center;">
       <span style="font:700 34px/1 'Courier New',Courier,monospace;letter-spacing:10px;color:${C.ink};">${esc(opts.code)}</span>
     </div>` +
    p(`The code expires in <strong>${opts.minutes} minutes</strong>. Never share it — A3 Kitchen staff will never ask for it.`) +
    muted(
      register
        ? 'Didn’t try to sign up? You can ignore this email.'
        : login
          ? 'Didn’t try to log in? Ignore this email — nobody can sign in without this code.'
          : 'Didn’t ask to reset your password? Ignore this email — your password stays the same.',
    );
  return {
    subject: register
      ? `${opts.code} is your A3 Kitchen verification code`
      : login
        ? `${opts.code} is your A3 Kitchen login code`
        : `${opts.code} is your A3 Kitchen password reset code`,
    html: layout({ preheader: `Your code is ${opts.code}. It expires in ${opts.minutes} minutes.`, heading, body }),
    text: `${greet}\n\n${intro}\n\nCode: ${opts.code}\n\nIt expires in ${opts.minutes} minutes. Never share it.`,
  };
}

export function partnerCredentialsEmail(opts: { name: string; email: string; phone: string; password: string; loginUrl: string; isReset?: boolean }): Omit<Mail, 'to'> {
  const heading = opts.isReset ? 'Your new login details' : 'Welcome to the A3 Kitchen delivery team';
  const intro = opts.isReset
    ? 'The kitchen has reset your password. Use the details below to log in.'
    : 'The kitchen has created your delivery partner account. Use the details below to log in and start taking deliveries.';
  const row = (label: string, value: string, mono = false) =>
    `<tr><td style="padding:10px 16px;font-size:13px;color:${C.muted};width:110px;">${label}</td>
     <td style="padding:10px 16px;font-size:15px;font-weight:600;${mono ? "font-family:'Courier New',Courier,monospace;letter-spacing:1px;" : ''}">${esc(value)}</td></tr>`;
  const body =
    p(`Hi ${esc(opts.name)},`) +
    p(intro) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.soft};border-radius:12px;">
       ${row('Email', opts.email)}${row('Mobile', opts.phone)}${row('Password', opts.password, true)}
     </table>` +
    button(opts.loginUrl, 'Log in to A3 Kitchen') +
    p('For your security, change this password after your first login (Forgot password on the login screen sends you a code).') +
    muted('Questions? Reply to this email or call the kitchen.');
  return {
    subject: opts.isReset ? 'Your A3 Kitchen password was reset' : 'Your A3 Kitchen delivery partner account',
    html: layout({ preheader: 'Your login details for A3 Kitchen deliveries.', heading, body }),
    text: `Hi ${opts.name},\n\n${intro}\n\nEmail: ${opts.email}\nMobile: ${opts.phone}\nPassword: ${opts.password}\n\nLog in: ${opts.loginUrl}`,
  };
}
