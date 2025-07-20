"use client";

import { useAccount } from "wagmi";

export default function Home() {
  const { address } = useAccount();

  return (
    <div>
      <h1>Hello World</h1>
    </div>
  );
}
