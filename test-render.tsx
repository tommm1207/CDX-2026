import React from 'react';
import { renderToString } from 'react-dom/server';

// STUB Vite ENV
global.import = { meta: { env: { VITE_SUPABASE_URL: 'http://test', VITE_SUPABASE_ANON_KEY: 'test' } } };

// Use dynamic import so global is set before supabase loads
import('./src/components/finance/Costs').then(({ Costs }) => {
  const mockUser = {
    id: '123',
    code: 'CDX-123',
    full_name: 'Test',
    role: 'Develop',
    email: 'test@test.com'
  };

  try {
    const html = renderToString(<Costs user={mockUser} onBack={() => {}} addToast={() => {}} initialAction={undefined} />);
    console.log("RENDER SUCCESS. Length:", html.length);
  } catch (e) {
    console.error("RENDER CRASHED:", e);
  }
});
