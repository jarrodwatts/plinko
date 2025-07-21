import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { useMutation } from "@tanstack/react-query";

/**
 * Wraps the `useLoginWithAbstract` hook to provide mutation state management
 * with `@tanstack/react-query`. This handles error states for the login process.
 * The loading state is handled by `wagmi`'s `useAccount` hook.
 */
export const useAbstractLogin = () => {
  const { login: originalLogin } = useLoginWithAbstract();

  const {
    mutate: login,
    isError,
    error,
  } = useMutation<void, Error, void>({
    mutationFn: () => {
      // The original login function can throw, for example if the user
      // rejects the connection or if popups are blocked.
      originalLogin();
      // Since originalLogin is synchronous and doesn't return a promise,
      // we don't await it. The useMutation hook will handle any synchronous errors.
      return Promise.resolve();
    },
  });

  return {
    login,
    isError,
    error,
  };
};