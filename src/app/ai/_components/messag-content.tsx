import React from "react";

interface MessageContentProps {
  content: string;
}

const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
  return (
    <div className="prose prose-sm max-w-none text-gray-800 dark:text-gray-100 dark:prose-invert">
      {content.split("\n\n").map((paragraph, idx) => {
        if (paragraph.startsWith("Key Features")) {
          return (
            <h3
              key={idx}
              className="font-semibold mt-4 text-gray-800 dark:text-gray-100 text-base"
            >
              {paragraph}
            </h3>
          );
        } else if (/^\d+\./.test(paragraph)) {
          // For numbered points
          const match = paragraph.match(/^(\d+)\.\s+(.*?):\s+(.*)/);
          if (match) {
            return (
              <div key={idx} className="mt-4">
                <p className="text-gray-800 dark:text-gray-100">
                  <strong className="font-semibold">
                    {match[1]}. {match[2]}:
                  </strong>{" "}
                  {match[3]}
                </p>
              </div>
            );
          }
        } else if (paragraph.includes("•")) {
          // For bullet points
          return (
            <ul
              key={idx}
              className="list-disc pl-6 mt-2 text-gray-800 dark:text-gray-100"
            >
              {paragraph
                .split("•")
                .filter(Boolean)
                .map((item, i) => (
                  <li key={i} className="mb-1">
                    {item.trim()}
                  </li>
                ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="mt-2 text-gray-800 dark:text-gray-100">
            {paragraph}
          </p>
        );
      })}
    </div>
  );
};

export default MessageContent;
