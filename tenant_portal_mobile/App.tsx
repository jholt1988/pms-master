import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import { RootNavigator } from './src/navigation';
import { Loading } from './src/components/common';
import { DemoAccountProvider } from './src/components/demo/DemoAccountProvider';

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<Loading fullScreen text="Loading..." />} persistor={persistor}>
        <DemoAccountProvider>
          <RootNavigator />
          <StatusBar style="auto" />
        </DemoAccountProvider>
      </PersistGate>
    </Provider>
  );
}
