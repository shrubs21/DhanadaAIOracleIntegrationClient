'use client'

import { motion } from 'framer-motion'

export default function Features() {
  const items = [
    {
      title: "Connect Oracle Instances",
      desc: "Save instance URL and credentials securely and call REST APIs via MCP."
    },
    {
      title: "GPT-style Chat",
      desc: "Ask questions in natural language and get summarized, actionable answers."
    },
    {
      title: "Automate & Trigger",
      desc: "Generate email alerts, reports, or REST calls based on AI analysis."
    },
    {
      title: "Secure by Design",
      desc: "Credentials stay on backend; prompts are sanitized and validated."
    }
  ]

  return (
    <section className="mb-16 px-4 bg-white">
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-6xl mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.12
            }
          }
        }}
      >
        {items.map((it, i) => (
          <motion.div
            key={i}
            variants={{
              hidden: {
                opacity: 0,
                y: 40,
                scale: 0.96
              },
              visible: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1] // iOS-style easing
                }
              }
            }}
            className="
              group
              relative
              p-8
              rounded-2xl
              cursor-pointer
              transition-all
              duration-300
              hover:scale-[1.02]
              overflow-hidden
              backdrop-blur-xl
            "
            style={{
              background: 'rgba(243, 244, 246, 0.7)', // iOS frosted base
              border: '1px solid rgba(255, 255, 255, 0.9)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)'
            }}
          >
            {/* iOS edge highlight */}
            <div className="absolute inset-0 rounded-2xl ring-1 ring-white/70 pointer-events-none" />

            {/* Soft glass shine */}
            <div
              className="absolute -top-1/2 left-0 w-full h-full opacity-40 pointer-events-none"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.6), transparent)'
              }}
            />

            {/* Blue hover overlay */}
            <div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background:
                  'linear-gradient(135deg, rgba(3, 4, 94, 0.08), rgba(3, 4, 94, 0.04))'
              }}
            />

            {/* Top glow */}
            <div
              className="absolute -top-px left-0 right-0 h-12 rounded-t-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-300"
              style={{
                background:
                  'linear-gradient(180deg, rgba(3, 4, 94, 0.25) 0%, transparent 100%)',
                filter: 'blur(10px)'
              }}
            />

            {/* Content */}
            <div className="relative z-10">
              <h3 className="text-xl font-semibold mb-3 text-[#0B132B] group-hover:text-[#03045E] transition-colors duration-300">
                {it.title}
              </h3>
              <p className="text-[#475569] leading-relaxed">
                {it.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
