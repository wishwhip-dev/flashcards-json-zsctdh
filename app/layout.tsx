import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Flashcards — spaced repetition",
  description:
    "A flashcard deck in your browser: add cards by hand or load them from a JSON file, review with Again / Good / Easy scheduling, and watch what comes due.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
