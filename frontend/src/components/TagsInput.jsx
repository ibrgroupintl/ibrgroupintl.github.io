import { useState } from 'react';

export default function TagsInput({ value = [], onChange }) {
  const [inputValue, setInputValue] = useState('');

  function addTag(tag) {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
  }

  function removeTag(tag) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length) {
      removeTag(value[value.length - 1]);
    }
  }

  return (
    <div className="tags-input-wrapper" onClick={() => document.getElementById('tag-input').focus()}>
      {value.map((tag) => (
        <span key={tag} className="tag-pill">
          {tag}
          <button className="tag-remove" onClick={() => removeTag(tag)} type="button">✕</button>
        </span>
      ))}
      <input
        id="tag-input"
        className="tags-input-field"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => inputValue && addTag(inputValue)}
        placeholder={value.length === 0 ? 'Type a tag and press Enter' : ''}
      />
    </div>
  );
}
