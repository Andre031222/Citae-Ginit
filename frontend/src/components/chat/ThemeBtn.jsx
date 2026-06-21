import React from 'react';
import { Sun, Moon } from '../Icons';

const ThemeBtn = ({ theme, onToggle }) => (
  <button className="theme-toggle" onClick={onToggle} aria-label="Cambiar tema"
    title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}>
    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
  </button>
);

export default ThemeBtn;
