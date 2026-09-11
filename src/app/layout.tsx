import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"BidDesk · Tender workspace",description:"Discover real Indian procurement notices and prepare your bids in one workspace."};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>;}
