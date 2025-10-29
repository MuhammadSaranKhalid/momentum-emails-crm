'use client';

import React, { useState } from 'react';
import { Input } from './input';
import { Badge } from './badge';
import { X } from 'lucide-react';

interface TagsInputProps {
  value?: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export function TagsInput({ value = [], onChange, placeholder }: TagsInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && emailRegex.test(newTag) && !value.includes(newTag)) {
        onChange([...value, newTag]);
        setInputValue('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  return (
    <div>
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Add emails...'}
      />
            <div className="flex flex-wrap gap-2 mt-2">
        {value.map(tag => (
          <Badge key={tag} variant="secondary">
            {tag}
            <button
              type="button"
              className="ml-2 rounded-full outline-none hover:bg-destructive/50"
              onClick={() => removeTag(tag)}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
