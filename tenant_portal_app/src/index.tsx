import React from 'react';
import {createRoot}  from 'react-dom/client';
import './index.css';
import App from './App';

import { AuthProvider } from './AuthContext';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App className={"app"} />
    </AuthProvider>
  </React.StrictMode>
);


// If you want to start measuring performance in your app, pass a function
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
