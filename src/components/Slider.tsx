import React, { useState, useEffect } from 'react';
import { useSliderStore } from '../store';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SliderProps {
  id: string; // The ID of the slider group
}

export function Slider({ id }: SliderProps) {
  const { sliders } = useSliderStore();
  const sliderGroup = sliders.find(s => s.id === id);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  if (!sliderGroup) return null;

  const activeSlides = sliderGroup.slides.filter(s => s.isActive);

  if (activeSlides.length === 0) return null;

  useEffect(() => {
    if (!sliderGroup.autoSlide || activeSlides.length <= 1) return;

    const intervalId = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % activeSlides.length);
    }, sliderGroup.interval * 1000);

    return () => clearInterval(intervalId);
  }, [sliderGroup.autoSlide, sliderGroup.interval, activeSlides.length]);

  // Ensure index is valid when switching active slides
  const validIndex = currentSlideIndex >= activeSlides.length ? 0 : currentSlideIndex;
  const currentSlide = activeSlides[validIndex];

  const nextSlide = () => setCurrentSlideIndex(prev => (prev + 1) % activeSlides.length);
  const prevSlide = () => setCurrentSlideIndex(prev => (prev - 1 + activeSlides.length) % activeSlides.length);

  return (
    <section className="relative bg-slate-100 dark:bg-slate-900 overflow-hidden min-h-[70vh] lg:min-h-[85vh] flex items-center group w-full">
      <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-transparent dark:from-slate-900/95 dark:via-slate-900/70 dark:to-transparent z-10 pointer-events-none"></div>
      
      <AnimatePresence mode="wait">
        <motion.img 
          key={currentSlide.id}
          src={currentSlide.image} 
          alt={currentSlide.title} 
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          referrerPolicy="no-referrer"
        />
      </AnimatePresence>

      <div className="relative z-20 px-4 sm:px-6 lg:px-8 py-24 pt-32 w-full max-w-7xl mx-auto flex flex-col justify-center h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight max-w-4xl leading-[1.1]">
              {currentSlide.title}
            </h1>
            <p className="mt-6 text-xl text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed font-medium line-clamp-3">
              {currentSlide.subtitle}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              {currentSlide.link && (
                <Link to={currentSlide.link} className="rotating-border-effect btn-rotating-border transition-all shadow-lg shadow-yellow-500/30 active:scale-95 group/btn inline-flex">
                  <div className="btn-rotating-border-inner px-8 py-4 bg-yellow-500 hover:bg-yellow-400 focus:bg-yellow-400 text-slate-900 font-black text-lg gap-3 transition-colors">
                    <PlayCircle className="w-6 h-6" />
                    {currentSlide.buttonText || 'Watch Now'}
                  </div>
                </Link>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {activeSlides.length > 1 && (
        <>
          <button 
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-white/50 dark:bg-black/30 text-slate-900 dark:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-yellow-500 dark:hover:bg-yellow-500 hover:text-slate-900 dark:hover:text-slate-900"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-white/50 dark:bg-black/30 text-slate-900 dark:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-yellow-500 dark:hover:bg-yellow-500 hover:text-slate-900 dark:hover:text-slate-900"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
            {activeSlides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => setCurrentSlideIndex(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${index === validIndex ? 'bg-yellow-500 w-8' : 'bg-slate-400/50 hover:bg-slate-400 dark:bg-white/50 dark:hover:bg-white'}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
