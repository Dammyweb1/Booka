'use client'

import { useEffect, useState } from 'react'

export function TypewriterHeading() {
  const words = ['focus.', 'growth.', 'your craft.']
  const [wordIndex, setWordIndex] = useState(0)
  const [currentText, setCurrentText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fullWord = words[wordIndex]
    const typingSpeed = isDeleting ? 65 : 120

    const timer = setTimeout(() => {
      if (!isDeleting) {
        // Typing forward
        const nextText = fullWord.substring(0, currentText.length + 1)
        setCurrentText(nextText)

        // Once full word is typed, pause before backspacing
        if (nextText === fullWord) {
          setTimeout(() => setIsDeleting(true), 1800)
        }
      } else {
        // Deleting backward
        const prevText = fullWord.substring(0, currentText.length - 1)
        setCurrentText(prevText)

        // Once empty, move to next word infinitely
        if (prevText === '') {
          setIsDeleting(false)
          setWordIndex((prev) => (prev + 1) % words.length)
        }
      }
    }, typingSpeed)

    return () => clearTimeout(timer)
  }, [currentText, isDeleting, wordIndex])

  return (
    <h1 className="max-w-[650px] text-[clamp(3.5rem,7vw,6.4rem)] font-medium leading-[.9] tracking-[-.075em]">
      Make time for{' '}
      <em className="font-serif not-italic text-[#d46b4f]">
        {currentText}
        <span className="inline-block w-[3px] h-[0.8em] ml-1 bg-[#d46b4f] animate-pulse align-middle" />
      </em>
    </h1>
  )
}
