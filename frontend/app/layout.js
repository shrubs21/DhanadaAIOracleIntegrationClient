import './globals.css'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export const metadata = {
  title: 'AI Oracle Assistant',
  description: 'Interact with Oracle instances through an AI-powered interface',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-white text-gray-900">
        
        {/* Navbar */}
        <Navbar />

        {/* Page Content */}
        <main className="flex-1 pt-24">
          {children}
        </main>

        {/* Footer */}
        <Footer />
        
      </body>
    </html>
  )
}
