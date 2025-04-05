'use client';

import React from 'react';
import { Haiku } from '@/types/haiku';

type HaikuCardProps = {
  haiku: Haiku;
  language: 'en' | 'ru';
  translatedText?: string | null; // Optional translated haiku text
};

const HaikuCard: React.FC<HaikuCardProps> = ({ haiku, language, translatedText }) => {
  // Use translated text if available and language is Russian, otherwise use original
  const displayText = language === 'ru' && translatedText ? translatedText : haiku.text;
  
  // Normalize haiku text formatting - ensure consistent spacing
  const normalizeHaikuText = (text: string): string[] => {
    // First split by newlines
    const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');
    
    // Ensure we have exactly 4 lines (pad with empty lines if needed)
    while (lines.length < 4) {
      lines.push('');
    }
    
    return lines.slice(0, 4); // Limit to 4 lines
  };
  
  const haikuLines = normalizeHaikuText(displayText);
  
  // Format date for display (HH:MM | DD.MM.YY)
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    
    return `${hours}.${minutes} | ${day}.${month}.${year}`;
  };

  return (
    <a 
      href={haiku.link} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="block"
      title={`Read full article: ${haiku.originalTitle}`}
    >
      <div className="bg-white rounded-[24px] p-4 shadow-md flex flex-col relative">
        {/* Yellow circle for article link - Mobile Only */}
        <div 
          className="absolute top-2 right-2 bg-[#FFFF00] text-black rounded-full w-12 h-12 flex flex-col items-center justify-center font-bold md:hidden p-1 leading-none"
          title={language === 'en' ? 'Read original article' : 'Прочитать статью'} // Tooltip for full text
        >
          {(language === 'en' ? 'Read original article' : 'Прочитать статью')
            .split(' ')
            .map((word, index) => (
              <span key={index} className="block text-[7px]">
                {word}
              </span>
            ))}
        </div>
        
        <div className="text-lg md:text-xl leading-tight flex-grow flex flex-col justify-center">
          {haikuLines.map((line, index) => (
            <div key={index} className="mb-0.5">{line || '\u00A0'}</div>
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-4 md:mt-auto flex justify-between">
          <span>{formatDate(haiku.timestamp)}</span>
          <span>{haiku.source}</span>
        </div>
      </div>
    </a>
  );
};

export default HaikuCard; 