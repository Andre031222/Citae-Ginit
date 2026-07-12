import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon } from '../Icons';

const ThemeBtn = ({ theme, onToggle }) => {
  const { t } = useTranslation();
  return (
    <button className="theme-toggle" onClick={onToggle} aria-label={t('chatview.theme.toggle')}
      title={theme === 'dark' ? t('chatview.theme.toLight') : t('chatview.theme.toDark')}>
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
};

export default ThemeBtn;
