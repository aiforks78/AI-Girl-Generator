"use client";

import React from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

interface Character {
  id: string;
  name: string;
  image_count?: number;
}

interface CharacterFilterProps {
  characters: Character[];
  value: string | null; // null = All Characters
  onChange: (characterId: string | null) => void;
  className?: string;
}

export default function CharacterFilter({ characters, value, onChange, className = '' }: CharacterFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const selectedCharacter = characters.find(c => c.id === value);
  const displayText = selectedCharacter
    ? `${selectedCharacter.name} (${selectedCharacter.image_count || 0} images)`
    : 'All Characters';

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm hover:bg-white/10 transition-colors flex items-center justify-between"
      >
        <span>Filter: {displayText}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1f2e] border border-white/10 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
            <button
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors ${
                value === null ? 'bg-purple-600/20 text-purple-300' : 'text-white/80'
              }`}
            >
              All Characters
            </button>
            {characters.map(character => (
              <button
                key={character.id}
                onClick={() => {
                  onChange(character.id);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors ${
                  value === character.id ? 'bg-purple-600/20 text-purple-300' : 'text-white/80'
                }`}
              >
                {character.name} {character.image_count ? `(${character.image_count} images)` : ''}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
