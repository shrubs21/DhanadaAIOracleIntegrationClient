import Hero from '../components/Hero'
import Features from '../components/Features'
import UseCases from '../components/UseCases'


export default function Page() {
  return (
    <main className="w-full">
      <Hero />
      <section className="max-w-6xl mx-auto px-6">
        <Features />
        <UseCases />
      </section>
    </main>
  )
}
