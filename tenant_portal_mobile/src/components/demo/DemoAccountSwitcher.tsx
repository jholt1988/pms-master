import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { DemoAccount } from '../../config/demoAccounts';

interface DemoAccountSwitcherProps {
  accounts: DemoAccount[];
  currentAccount: DemoAccount;
  onSwitch: (account: DemoAccount) => void;
  isSwitching?: boolean;
}

export const DemoAccountSwitcher: React.FC<DemoAccountSwitcherProps> = ({
  accounts,
  currentAccount,
  onSwitch,
  isSwitching = false,
}) => {
  const [isModalVisible, setModalVisible] = useState(false);

  const handleSelect = (account: DemoAccount) => {
    setModalVisible(false);
    if (account.username !== currentAccount.username) {
      onSwitch(account);
    }
  };

  return (
    <>
      <View pointerEvents="box-none" style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
          <Text style={styles.fabLabel}>{isSwitching ? '...' : 'Demo'}</Text>
        </TouchableOpacity>
      </View>

      <Modal transparent visible={isModalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Switch demo account</Text>
            <FlatList
              data={accounts}
              keyExtractor={(item) => item.username}
              renderItem={({ item }) => {
                const isActive = item.username === currentAccount.username;
                return (
                  <TouchableOpacity
                    style={[styles.accountButton, isActive && styles.accountButtonActive]}
                    onPress={() => handleSelect(item)}
                    disabled={isActive || isSwitching}
                  >
                    <Text style={[styles.accountLabel, isActive && styles.accountLabelActive]}>{item.label}</Text>
                    {isActive ? (
                      <Text style={styles.activeBadge}>Active</Text>
                    ) : (
                      <Text style={styles.switchHint}>Tap to switch</Text>
                    )}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeLabel}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    right: 20,
    zIndex: 999,
  },
  fab: {
    backgroundColor: '#f97316',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  fabLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    color: '#0f172a',
  },
  accountButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
  },
  accountButtonActive: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  accountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  accountLabelActive: {
    color: '#15803d',
  },
  activeBadge: {
    marginTop: 4,
    fontSize: 12,
    color: '#15803d',
  },
  switchHint: {
    marginTop: 4,
    fontSize: 12,
    color: '#475569',
  },
  separator: {
    height: 10,
  },
  closeButton: {
    marginTop: 16,
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  closeLabel: {
    color: '#475569',
    fontWeight: '600',
  },
});
