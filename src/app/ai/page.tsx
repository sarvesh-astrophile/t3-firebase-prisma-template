"use client";
import ChatInterface from "./_components/chat-interface";
import LoadingBar from "react-top-loading-bar";
import type { LoadingBarRef } from "react-top-loading-bar";
import { useRef } from "react";

export default function ChatPage() {
  const loadingBarRef = useRef<LoadingBarRef>(null);

  return (
    <>
      <LoadingBar color="#2563eb" height={3} ref={loadingBarRef} />
      <ChatInterface loadingBarRef={loadingBarRef} />
    </>
  );
}
