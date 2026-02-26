import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { login, logout } from '../../store/authSlice';
import { DemoAccountSwitcher } from './DemoAccountSwitcher';
import {
  DEMO_ACCOUNT_STORAGE_KEY,
  DEFAULT_TENANT_ACCOUNT,
  DEMO_TENANT_ACCOUNTS,
<<<<<<< feat/mobile-admin-ui
  DEMO_ADMIN_ACCOUNTS,
=======
>>>>>>> main
  DemoAccount,
} from '../../config/demoAccounts';

interface DemoAccountProviderProps {
  children: React.ReactNode;
}

export const DemoAccountProvider: React.FC<DemoAccountProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
<<<<<<< feat/mobile-admin-ui
  const isUserAdmin = useAppSelector((state) => state.auth.user?.role === 'ADMIN' || state.auth.user?.role === 'PROPERTY_MANAGER');
=======
>>>>>>> main
  const [currentAccount, setCurrentAccount] = useState<DemoAccount>(DEFAULT_TENANT_ACCOUNT);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadStoredAccount = async () => {
      try {
        const stored = await AsyncStorage.getItem(DEMO_ACCOUNT_STORAGE_KEY);
        if (stored) {
          const parsed: DemoAccount = JSON.parse(stored);
          const match = DEMO_TENANT_ACCOUNTS.find((acct) => acct.username === parsed.username);
          if (match) {
            setCurrentAccount(match);
            return;
          }
        }
      } catch (error) {
        console.warn('[DemoAccountProvider] Failed to load stored account', error);
      } finally {
        setIsReady(true);
      }
    };

    loadStoredAccount();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (auth.isAuthenticated || auth.isLoading) return;

    dispatch(
      login({
        username: currentAccount.username,
        password: currentAccount.password,
      })
    );
  }, [auth.isAuthenticated, auth.isLoading, currentAccount, dispatch, isReady]);

  const handleSwitchAccount = async (account: DemoAccount) => {
    try {
      setCurrentAccount(account);
      await AsyncStorage.setItem(DEMO_ACCOUNT_STORAGE_KEY, JSON.stringify(account));
      await dispatch(logout());
      dispatch(login({ username: account.username, password: account.password }));
    } catch (error) {
      console.error('[DemoAccountProvider] Failed to switch demo account', error);
    }
  };

  return (
    <>
      {children}
      <DemoAccountSwitcher
<<<<<<< feat/mobile-admin-ui
        accounts={accounts}
=======
        accounts={DEMO_TENANT_ACCOUNTS}
>>>>>>> main
        currentAccount={currentAccount}
        onSwitch={handleSwitchAccount}
        isSwitching={auth.isLoading}
      />
    </>
  );
};
