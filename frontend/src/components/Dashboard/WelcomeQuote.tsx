import { useState, useEffect } from 'react'

const MOTIVATIONAL_QUOTES = [
  "The best way to predict the future is to create it.",
  "Dream big. Start small. Act now.",
  "Believe you can and you're halfway there.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "The only limit to our realization of tomorrow will be our doubts of today.",
  "Don't watch the clock; do what it does. Keep going.",
  "The future belongs to those who believe in the beauty of their dreams.",
  "It always seems impossible until it's done.",
  "Start where you are. Use what you have. Do what you can.",
  "The secret of getting ahead is getting started.",
  "Your time is limited, don't waste it living someone else's life.",
  "Everything you've ever wanted is on the other side of fear.",
  "Opportunities don't happen. You create them.",
  "Don't let yesterday take up too much of today.",
  "You are never too old to set another goal or to dream a new dream."
]

export default function WelcomeQuote() {
  const [quote, setQuote] = useState('')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Select a random quote on mount
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)
    setQuote(MOTIVATIONAL_QUOTES[randomIndex])
    
    // Fade in animation
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  return (
    <div 
      className={`transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <p 
        className="text-2xl md:text-3xl lg:text-4xl text-center text-primary-light/90 italic font-light leading-relaxed tracking-wide"
        style={{ 
          fontFamily: "'Dancing Script', 'Georgia', cursive",
          textShadow: '0 0 30px rgba(217, 119, 6, 0.15)'
        }}
      >
        &ldquo;{quote}&rdquo;
      </p>
    </div>
  )
}
