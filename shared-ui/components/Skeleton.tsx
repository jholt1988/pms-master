import React from 'react';
import styles from './Skeleton.module.css';

export const Skeleton: React.FC<{width?: string; height?: string}> = ({width='100%', height='1rem'}) => {
  return <div className={styles.skeleton} style={{width, height}} />;
};
