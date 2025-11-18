import type { Metadata } from "next";
import { Lora, Cinzel, MedievalSharp, Uncial_Antiqua } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const lora = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lora",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cinzel",
});

const medievalSharp = MedievalSharp({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  variable: "--font-medieval-sharp",
});

const uncialAntiqua = Uncial_Antiqua({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  variable: "--font-uncial-antiqua",
});

export const metadata: Metadata = {
  title: "The Academy of Heroes",
  description: "An online educational game by Classcraft",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(
      "h-full",
      lora.variable,
      cinzel.variable,
      medievalSharp.variable,
      uncialAntiqua.variable
    )}>
      <body className="antialiased h-full bg-background font-body">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
