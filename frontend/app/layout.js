import './globals.css'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export const metadata = {
  title: 'AI Oracle Assistant',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased text-white">
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  )
}
