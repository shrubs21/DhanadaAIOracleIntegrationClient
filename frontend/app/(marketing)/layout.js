import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

export default function MarketingLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="pt-24">{children}</main>
      <Footer />
    </>
  )
}
