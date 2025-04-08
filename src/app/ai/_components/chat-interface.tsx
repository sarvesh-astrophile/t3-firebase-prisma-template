import React, { useState, useRef, type KeyboardEvent } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Check,
  ChevronDown,
  Paperclip,
  History,
  Play,
  Search,
  Send,
  ChartNoAxesColumnIncreasing,
} from "lucide-react";
import MessageContent from "./messag-content";
import { v4 as uuidv4 } from "uuid";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  showDots?: boolean;
}

const finalAssistantMessageContent = `OpenAI o1 is a new AI model introduced by OpenAI, designed to enhance reasoning capabilities, particularly for complex tasks. Here are the key features and details about this model:

Key Features

1. Advanced Reasoning: OpenAI o1 is specifically tailored for complex multi-step reasoning tasks. It generates longer "chains of thought" before arriving at a final answer, which improves its performance in areas like science and mathematics. This approach allows the model to spend more computational resources on thinking, leading to more accurate outputs compared to previous models that relied primarily on scaling up size and data.

2. Model Variants: The o1 model comes in different versions, including:

• o1-Preview: Optimized for handling intricate tasks with advanced accuracy.
• o1-Mini: A faster variant that is designed for quicker reasoning tasks.`;

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = () => {
    const currentInput = inputValue.trim();
    if (!currentInput) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: currentInput,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    setTimeout(() => {
      const deepSearchMessage: Message = {
        id: uuidv4(),
        role: "system",
        content: "deep-search",
        showDots: true,
      };
      setMessages((prev) => [...prev, deepSearchMessage]);
    }, 0);

    setTimeout(() => {
      const overviewMessage: Message = {
        id: uuidv4(),
        role: "assistant",
        content: "Overview of OpenAI o1",
        showDots: true,
      };
      setMessages((prev) => [...prev, overviewMessage]);
    }, 1500);

    setTimeout(() => {
      const finalMessage: Message = {
        id: uuidv4(),
        role: "assistant",
        content: finalAssistantMessageContent,
      };
      setMessages((prev) => [...prev, finalMessage]);
    }, 3000);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`flex h-screen bg-background text-foreground mx-auto`}>
      <div
        className={`flex-1 ${
          messages.length === 0
            ? "flex items-center justify-center"
            : "flex flex-col h-full relative mx-auto"
        }`}
      >
        {messages.length > 0 && (
          <div className="absolute inset-x-0 top-0 bottom-[140px] overflow-y-auto py-6 px-4 sm:px-6 md:px-8 dark:scrollbar-track-gray-800 dark:scrollbar-thumb-gray-600 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
            <div className="pb-4">
              {messages.map((message) => (
                <div key={message.id} className="mb-6 max-w-3xl mx-auto">
                  {message.role === "user" && (
                    <div className="flex items-start gap-3 mb-8">
                      <Avatar className="h-8 w-8 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-gray-800 dark:text-gray-200 text-base">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  )}

                  {message.role === "system" &&
                    message.content !== "deep-search" &&
                    message.showDots && (
                      <div className="flex items-center gap-2 mb-4 max-w-[32rem]">
                        <div className="w-6 h-6 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
                        </div>
                        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full pl-2 pr-3 py-1.5 text-sm">
                          <Search className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                          <span className="text-gray-800 dark:text-gray-200">
                            {message.content}
                          </span>
                          <span className="ml-auto text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Check className="h-4 w-4" /> 8 results
                          </span>
                          <ChevronDown className="h-4 w-4 ml-2 text-gray-500 dark:text-gray-400" />
                        </div>
                      </div>
                    )}

                  {message.role === "assistant" && message.showDots && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
                      </div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">
                        {message.content}
                      </h3>
                    </div>
                  )}

                  {message.role === "assistant" && !message.showDots && (
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8 mt-1 bg-gray-100 dark:bg-gray-800">
                        <AvatarFallback className="text-sm text-gray-500 dark:text-gray-400">
                          AI
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <MessageContent content={message.content} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className={`${
            messages.length > 0
              ? "absolute bottom-0 left-0 right-0 mx-auto"
              : ""
          } bg-transparent p-4 sm:p-6 md:p-8 w-full ${
            messages.length === 0 ? "max-w-3xl" : "max-w-3xl"
          }`}
        >
          <Card className="rounded-2xl overflow-hidden border border-gray-300 dark:border-gray-700 shadow-sm py-0 w-full bg-card">
            <CardContent className="p-0">
              <div className="p-3">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question..."
                  className="border-0 shadow-none focus-visible:ring-0 text-base px-0 bg-transparent placeholder:text-muted-foreground"
                />
              </div>
            </CardContent>
            <CardFooter className="py-2 px-3 flex justify-end items-center">
              <div className="flex items-center gap-1">
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full h-8 w-8 p-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <History className="size-5" />
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-64 p-4 bg-popover text-popover-foreground">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm mb-2">
                        Chat History
                      </h4>
                      <button
                        className="block w-full text-left text-sm hover:bg-accent rounded p-1"
                        onClick={() => console.log("Load chat: Chat about o1")}
                      >
                        Chat about o1
                      </button>
                      <button
                        className="block w-full text-left text-sm hover:bg-accent rounded p-1"
                        onClick={() =>
                          console.log("Load chat: Planning session")
                        }
                      >
                        Planning session
                      </button>
                      <button
                        className="block w-full text-left text-sm hover:bg-accent rounded p-1"
                        onClick={() => console.log("Load chat: API discussion")}
                      >
                        API discussion
                      </button>
                    </div>
                  </HoverCardContent>
                </HoverCard>
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleSendMessage}
                  className="rounded-full h-8 w-8 p-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
