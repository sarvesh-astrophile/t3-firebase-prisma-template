import React, {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
  type MutableRefObject,
} from "react";
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
import MessageContent from "./message-content";
import { v4 as uuidv4 } from "uuid";
import { api } from "@/trpc/react";
import type { LoadingBarRef } from "react-top-loading-bar";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  loadingBarRef: MutableRefObject<LoadingBarRef | null>;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ loadingBarRef }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const currentAssistantMessageId = useRef<string | null>(null);

  api.ai.generateStream.useSubscription(
    {
      prompt: currentPrompt,
    },
    {
      enabled:
        isGenerating &&
        currentPrompt !== "" &&
        currentAssistantMessageId.current !== null,
      onStarted: () => {
        console.log("Subscription started for prompt:", currentPrompt);
        loadingBarRef.current?.continuousStart();
      },
      onData: (chunk) => {
        if (currentAssistantMessageId.current) {
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === currentAssistantMessageId.current
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        }
      },
      onError: (err) => {
        console.error("Subscription error:", err);
        setIsGenerating(false);
        setCurrentPrompt("");
        loadingBarRef.current?.complete();
        toast.error(`Error generating response: ${err.message}`);
        if (currentAssistantMessageId.current) {
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== currentAssistantMessageId.current)
          );
          currentAssistantMessageId.current = null;
        }
      },
      onComplete: () => {
        console.log("Subscription complete");
        setIsGenerating(false);
        setCurrentPrompt("");
        loadingBarRef.current?.complete();
        currentAssistantMessageId.current = null;
      },
    }
  );

  const handleSendMessage = () => {
    const promptToSend = inputValue.trim();
    if (!promptToSend || isGenerating) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: promptToSend,
    };

    const assistantMessageId = uuidv4();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    currentAssistantMessageId.current = assistantMessageId;
    setInputValue("");
    setCurrentPrompt(promptToSend);
    setIsGenerating(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

                  {message.role === "assistant" && (
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8 mt-1 bg-gray-100 dark:bg-gray-800">
                        <AvatarFallback className="text-sm text-gray-500 dark:text-gray-400">
                          AI
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        {message.content === "" &&
                        isGenerating &&
                        message.id === currentAssistantMessageId.current ? (
                          <div className="pt-2">
                            <span className="animate-pulse text-muted-foreground">
                              ...
                            </span>
                          </div>
                        ) : (
                          <MessageContent content={message.content} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
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
                  placeholder={
                    isGenerating ? "Generating..." : "Ask a question..."
                  }
                  className="border-0 shadow-none focus-visible:ring-0 text-base px-0 bg-transparent placeholder:text-muted-foreground"
                  disabled={isGenerating}
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
                      disabled={isGenerating}
                    >
                      <History className="size-5" />
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-64 p-4 bg-popover text-popover-foreground">
                    <p className="text-sm text-muted-foreground">
                      History feature not implemented.
                    </p>
                  </HoverCardContent>
                </HoverCard>
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleSendMessage}
                  className="rounded-full h-8 w-8 p-0"
                  disabled={!inputValue || isGenerating}
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
