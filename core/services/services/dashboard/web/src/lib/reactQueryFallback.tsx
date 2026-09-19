import React from 'react';

export class QueryClient {
  options: any;
  constructor(options: any = {}) {
    this.options = options;
  }
  getQueryData() { return undefined; }
  setQueryData() {}
  invalidateQueries() {}
  clear() {}
}

export const QueryClientProvider: React.FC<{ client?: any; children: React.ReactNode }> = ({ children }) => {
  return React.createElement(React.Fragment, null, children);
};

export function useQuery() {
  return { data: undefined, isLoading: false, isError: false, error: null, refetch: () => {} };
}

export function useMutation() {
  return { mutate: () => {}, mutateAsync: async () => {}, isLoading: false, isError: false, error: null };
}

export function useQueryClient() {
  return new QueryClient();
}

export default {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
};
