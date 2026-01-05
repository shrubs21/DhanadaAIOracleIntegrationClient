import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata = {
  title: 'AI Oracle Assistant',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#0B132B',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              border: '1px solid #E5E7EB',
            },
            success: {
              iconTheme: {
                primary: '#03045E',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
            loading: {
              iconTheme: {
                primary: '#03045E',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
