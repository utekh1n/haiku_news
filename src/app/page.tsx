'use client'; // Mark as a Client Component

import { useState, useEffect, useRef } from 'react';
import HaikuCard from '@/components/HaikuCard';
import { Haiku, TranslationCache } from '@/types/haiku';

const MAX_HAIKUS_DISPLAYED = 16;

export default function Home() {
  // State for haikus and translations
  const [haikus, setHaikus] = useState<Haiku[]>([]);
  const [translations, setTranslations] = useState<TranslationCache>({});
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  
  // Language toggle state (default: English)
  const [language, setLanguage] = useState<'en' | 'ru'>('en');
  
  // Status states
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Scroll direction for header/footer visibility on mobile
  const [showMobileElements, setShowMobileElements] = useState<boolean>(true);
  const lastScrollYRef = useRef<number>(0);

  // Toggle language between English and Russian
  const toggleLanguage = async () => {
    const newLanguage = language === 'en' ? 'ru' : 'en';
    setLanguage(newLanguage);
    
    // If switching to Russian, ensure we have translations
    if (newLanguage === 'ru') {
      await translateHaikus();
    }
  };
  
  // Fetch all available translations for current haikus
  const fetchTranslations = async () => {
    if (haikus.length === 0) return {};
    
    try {
      // Create a comma-separated list of haiku texts
      const haikuTexts = haikus.map(h => encodeURIComponent(h.text)).join(',');
      
      const response = await fetch(`/api/translations?texts=${haikuTexts}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.translations || {};
      }
    } catch (error) {
      console.error('Error fetching translations:', error);
    }
    
    return {};
  };
  
  // Translate all haikus that don't already have translations
  const translateHaikus = async () => {
    if (haikus.length === 0) return;
    
    setIsTranslating(true);
    
    // First, try to fetch any available cached translations
    const cachedTranslations = await fetchTranslations();
    const newTranslations = { ...translations };
    let hasNewTranslations = false;
    
    // Add cached translations to our state
    for (const haiku of haikus) {
      if (cachedTranslations[haiku.text]) {
        newTranslations[haiku.id] = cachedTranslations[haiku.text];
        hasNewTranslations = true;
      }
    }
    
    // Update with any cached translations we found
    if (hasNewTranslations) {
      setTranslations(newTranslations);
    }
    
    // Process each haiku sequentially to translate any remaining untranslated haikus
    for (const haiku of haikus) {
      // Skip if we already have a translation
      if (newTranslations[haiku.id]) continue;
      
      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: haiku.text }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.translation) {
            newTranslations[haiku.id] = data.translation;
            hasNewTranslations = true;
            // Update translations incrementally so user sees them appear
            setTranslations({...newTranslations});
          }
        } else {
          console.error('Translation API error:', await response.text());
        }
      } catch (error) {
        console.error('Error calling translation API:', error);
      }
    }
    
    setIsTranslating(false);
  };

  useEffect(() => {
    console.log('Setting up EventSource...');
    const eventSource = new EventSource('/api/haikus');

    eventSource.onopen = () => {
      console.log('SSE connection opened');
      setError(null); // Clear any previous error
      setIsChecking(false); // Initial state
    };

    // Handler for initial batch of haikus
    eventSource.addEventListener('initial', (event: MessageEvent) => {
      console.log('Received initial haikus');
      const initialHaikus = JSON.parse(event.data);
      // Ensure we only take the latest MAX_HAIKUS_DISPLAYED
      setHaikus(initialHaikus.slice(0, MAX_HAIKUS_DISPLAYED));
      
      // If we're in Russian mode, fetch translations for initial haikus
      if (language === 'ru') {
        translateHaikus();
      }
    });

    // Handler for newly generated haikus
    eventSource.addEventListener('update', (event: MessageEvent) => {
      console.log('Received haiku update');
      const newHaikus = JSON.parse(event.data);
      setHaikus(prevHaikus => {
        // Combine new haikus with previous ones, avoiding duplicates
        const updatedHaikus = [...newHaikus, ...prevHaikus];
        const uniqueHaikus = Array.from(new Map(updatedHaikus.map(h => [h.id, h])).values());
        // Ensure sorted by timestamp again and limit count
        return uniqueHaikus
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_HAIKUS_DISPLAYED);
      });
      
      // If we're in Russian mode, translate new haikus
      if (language === 'ru') {
        translateHaikus();
      }
    });

    // Handler for status updates (checking for new items)
    eventSource.addEventListener('status', (event: MessageEvent) => {
        const status = JSON.parse(event.data);
        setIsChecking(status.checking);
        console.log(`Checking status: ${status.checking}`);
    });
    
    // Handler for errors from the server
    eventSource.addEventListener('error', (event) => {
        console.error('SSE Error Event:', event); // Log the raw event for debugging
        let errorMessage = 'An unknown error occurred with the live update connection.';

        // Check if it's a MessageEvent with potentially parseable data
        if (event instanceof MessageEvent && event.data) { 
            try {
                // Attempt to parse the data as JSON
                const errorData = JSON.parse(event.data);
                // Use the message from the parsed data if available
                errorMessage = errorData.message || 'Received an error from the server without a specific message.';
            } catch (e) {
                // If parsing fails, use the raw data as the message (or a generic error)
                errorMessage = `Received unparsable error data from server: ${event.data}`;
                console.error('Failed to parse SSE error data:', e);
            }
        } else if (eventSource.readyState === EventSource.CLOSED) {
            errorMessage = 'Connection closed unexpectedly.';
        } else if (eventSource.readyState === EventSource.CONNECTING) {
            errorMessage = 'Connection lost. Attempting to reconnect...';
        }

        setError(errorMessage);
        setIsChecking(false);
    });

    // Cleanup function to close the connection when the component unmounts
    return () => {
      console.log('Closing EventSource');
      eventSource.close();
    };
  }, [language, translateHaikus]); // Added language and translateHaikus to dependencies

  // Handle scroll direction detection for mobile header/footer
  useEffect(() => {
    // const scrollableElement = scrollableContainerRef.current; // No longer need ref for this
    // Only run this on client-side 
    if (typeof window === 'undefined') return; // Reverted check
    
    // Avoid running on non-mobile devices
    const isMobile = window.innerWidth < 768; // md breakpoint in Tailwind
    if (!isMobile) return;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY; // Use window.scrollY again
      
      // Determine scroll direction, with a threshold to avoid flickering
      if (Math.abs(currentScrollY - lastScrollYRef.current) > 10) {
        setShowMobileElements(currentScrollY < lastScrollYRef.current || currentScrollY <= 0);
        lastScrollYRef.current = currentScrollY;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true }); // Attach to window
    
    return () => {
      window.removeEventListener('scroll', handleScroll); // Remove from window
    };
  }, []); // Still run only once on mount

  return (
    <main className="min-h-screen p-3 md:p-6 lg:p-8 relative flex flex-col bg-[#FF4081]">
      {/* Loading/Checking Indicator */} 
      {isChecking && (
        <div className="fixed top-1 right-1 bg-yellow-300 text-black text-xs font-medium px-2 py-0.5 rounded animate-pulse z-50">
           Checking for updates...
        </div>
      )}
      
      {/* Translating Indicator */}
      {isTranslating && (
        <div className="fixed top-6 right-1 bg-blue-400 text-white text-xs font-medium px-2 py-0.5 rounded animate-pulse z-50">
           Translating...
        </div>
      )}
      
      {/* Error Display */}
      {error && (
         <div className="fixed bottom-1 right-1 bg-red-600 text-white text-xs px-2 py-0.5 rounded shadow-lg z-50">
            Error: {error}
         </div>
      )}

      {/* Header with responsive layout - not sticky */}
      <header className={`mb-12 md:mb-16 transition-transform duration-300 md:transform-none ${!showMobileElements ? '-translate-y-full' : 'translate-y-0'}`}>
        {/* Desktop layout (remains grid) */}
        <div className="hidden md:grid grid-cols-[auto_1fr] gap-x-4 items-center">
          {/* Left Column - Title and Language Button */}
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#FFFF00] mb-1">Haiku news</h1>
            
            {/* Language Toggle Button */}
            <button 
              onClick={toggleLanguage}
              disabled={isTranslating}
              className={`px-2 py-0.5 rounded transition-colors text-xs ${
                isTranslating 
                  ? 'bg-gray-500 cursor-not-allowed' 
                  : 'bg-white/20 hover:bg-white/30'
              }`}
              title={isTranslating ? "Translation in progress..." : "Switch language"}
            >
              <span className={language === 'en' ? 'font-bold text-[#FFFF00]' : 'text-white/70'}>ENG</span>
              <span className="mx-1 text-[#FFFF00]">/</span>
              <span className={language === 'ru' ? 'font-bold text-[#FFFF00]' : 'text-white/70'}>RUS</span>
            </button>
          </div>

          {/* Right Column - Description Text */}
          <div className="text-yellow-300 text-sm md:text-base lg:text-lg text-right"> 
            {language === 'en' ? (
              <>
                If you&apos;re tired and want a distraction,<br />
                but don&apos;t feel like scrolling through social media, this news aggregator is for you.<br />
                You can view the original article if you tap the block with Haiku.
              </>
            ) : (
              <>
                Если вы устали и вам отвлечься,<br />
                но вы не хотите скролить социальные сети этот агренгатор новостей для вас.<br />
                Чтобы прочитать статью - нажмите на блок с хайку.
              </>
            )}
          </div>
        </div>
        
        {/* Mobile layout (stacked arrangement) */}
        <div className="flex flex-col md:hidden">
          {/* Title */}
          <h1 className="text-4xl font-bold text-[#FFFF00] mb-3">Haiku news</h1>
          
          {/* Description Text */}
          <div className="text-yellow-300 text-sm mb-3"> 
            {language === 'en' ? (
              <>
                If you&apos;re tired and want a distraction,<br />
                but don&apos;t feel like scrolling through social media, this news aggregator is for you.<br />
                You can view the original article if you tap the block with Haiku.
              </>
            ) : (
              <>
                Если вы устали и вам отвлечься,<br />
                но вы не хотите скролить социальные сети этот агренгатор новостей для вас.<br />
                Чтобы прочитать статью - нажмите на блок с хайку.
              </>
            )}
          </div>
          
          {/* Language Toggle Button */}
          <button 
            onClick={toggleLanguage}
            disabled={isTranslating}
            className={`self-start px-2 py-0.5 rounded transition-colors mb-3 text-xs ${
              isTranslating 
                ? 'bg-gray-500 cursor-not-allowed' 
                : 'bg-white/20 hover:bg-white/30'
            }`}
            title={isTranslating ? "Translation in progress..." : "Switch language"}
          >
            <span className={language === 'en' ? 'font-bold text-[#FFFF00]' : 'text-white/70'}>ENG</span>
            <span className="mx-1 text-[#FFFF00]">/</span>
            <span className={language === 'ru' ? 'font-bold text-[#FFFF00]' : 'text-white/70'}>RUS</span>
          </button>
        </div>
      </header>

      {/* Grid for Haiku Cards */}
      <div 
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-6 px-2" // Reverted gap, removed max-w and mx-auto
      >
        {haikus.length > 0 ? (
          haikus.map((haiku) => (
            <HaikuCard 
              key={haiku.id} 
              haiku={haiku} 
              language={language}
              translatedText={translations[haiku.id]}
            />
          ))
        ) : (
          // Show placeholders or a loading state until initial data arrives
          Array.from({ length: MAX_HAIKUS_DISPLAYED }).map((_, i) => (
             <div key={`skel-${i}`} className="bg-gray-200 rounded-[24px] p-4 shadow-md animate-pulse h-[160px]"></div> // Skeleton loader matching card height and radius
          ))
        )}
      </div>

      {/* Footer - not sticky */}
      <footer className={`text-center mt-auto py-3 transition-transform duration-300 md:transform-none ${!showMobileElements ? 'translate-y-full' : 'translate-y-0'}`}>
        <p className="text-sm text-[#FFFF00]">by Basilio Utekhin</p>
        <p className="text-xs text-[#FFFF00]">2025</p>
      </footer>
    </main>
  );
}
