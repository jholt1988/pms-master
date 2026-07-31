import React from 'react';
import styles from './Card.module.css';

export const Card: React.FC<{children?: React.ReactNode}> = ({children}) => {
  return <div className={styles.card}>{children}</div>;
};
