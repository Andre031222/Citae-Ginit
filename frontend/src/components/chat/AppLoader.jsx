import React from 'react';
import { Loader } from '../Icons';
import citoLogo from '../../assets/citae-logo-v2.png';

const AppLoader = ({ theme }) => (
  <div style={{
    height: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: theme === 'dark' ? '#000' : '#fff',
    gap: '1rem',
  }}>
    <img src={citoLogo} alt="Citae" style={{ height: 56, opacity: 0.85 }} />
    <Loader size={24} className="spinning" style={{ color: 'var(--accent)' }} />
  </div>
);

export default AppLoader;
