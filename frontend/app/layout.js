import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata = {
  title: 'AI Oracle Assistant',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-gray-900">
        {children}
        
        {/* ✅ Toast Notifications Provider */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#363636',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(0, 0, 0, 0.05)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
              style: {
                background: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
              style: {
                background: '#fff',
              },
            },
            loading: {
              iconTheme: {
                primary: '#a855f7',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  )
}