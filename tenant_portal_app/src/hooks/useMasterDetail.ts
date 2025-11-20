import { useState, useCallback } from 'react';

export interface MasterDetailState<T> {
  selectedItem: T | null;
  showDetail: boolean;
}

export const useMasterDetail = <T>() => {
  const [state, setState] = useState<MasterDetailState<T>>({
    selectedItem: null,
    showDetail: false,
  });

  const selectItem = useCallback((item: T) => {
    setState({
      selectedItem: item,
      showDetail: true,
    });
  }, []);

  const clearSelection = useCallback(() => {
    setState({
      selectedItem: null,
      showDetail: false,
    });
  }, []);

  return {
    ...state,
    selectItem,
    clearSelection,
  };
};
