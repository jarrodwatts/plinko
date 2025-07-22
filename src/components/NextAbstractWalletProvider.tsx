"use client";

import { chain } from "@/config/chain";
import { queryClient } from "@/config/query-client";
import { AbstractWalletProvider } from "@abstract-foundation/agw-react";

export default function AbstractWalletWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AbstractWalletProvider chain={chain} queryClient={queryClient}>
      {children}
    </AbstractWalletProvider>
  );
}
