import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/auth/AuthContext';
import { CartProvider } from '@/features/cart/CartContext';
import { routes } from '@/app/router';

/** Fake API: answers /auth/check from a tiny "database", and the dummy phone OTP. */
function fakeServer(registered: Record<string, boolean>) {
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const json = (data: unknown) => new Response(JSON.stringify({ success: true, data }), { status: 200 });
    if (url.endsWith('/auth/check')) {
      const id: string = body.identifier;
      return json({ kind: id.includes('@') ? 'email' : 'phone', exists: !!registered[id] });
    }
    if (url.endsWith('/auth/phone/otp')) return json({ sent: true, isNewUser: false, devCode: '123456' });
    return json([]);
  });
}

function renderLogin() {
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider initialUser={null}>
        <CartProvider>
          <RouterProvider router={router} />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
  return router;
}

const continueWith = async (value: string) => {
  fireEvent.change(await screen.findByLabelText('Email or mobile number'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
};

afterEach(() => vi.unstubAllGlobals());

describe('one-field login (web)', () => {
  it('registered email → password step', async () => {
    fakeServer({ 'customer@a3kitchen.in': true });
    renderLogin();
    await continueWith('customer@a3kitchen.in');
    expect(await screen.findByRole('heading', { name: 'Enter your password' })).toBeInTheDocument();
  });

  it('registered phone → OTP step with the test-mode hint', async () => {
    fakeServer({ '9000000003': true });
    renderLogin();
    await continueWith('9000000003');
    expect(await screen.findByRole('heading', { name: 'Verify your number' })).toBeInTheDocument();
    expect(screen.getByText('Test mode: use OTP 123456')).toBeInTheDocument();
  });

  it('unregistered number → register, pre-filled', async () => {
    fakeServer({});
    const router = renderLogin();
    await continueWith('9876543210');
    expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/register');
    expect(screen.getByLabelText('Mobile number')).toHaveValue('9876543210');
  });

  it('unregistered email → register, pre-filled', async () => {
    fakeServer({});
    renderLogin();
    await continueWith('new@example.com');
    expect(await screen.findByLabelText('Email')).toHaveValue('new@example.com');
  });
});
