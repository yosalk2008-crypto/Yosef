import { Courier_Prime, Special_Elite } from "next/font/google";

/** Typewriter faces for the expedition atlas (Fernweh). */
export const courier = Courier_Prime({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-fw-mono", display: "swap" });
export const elite = Special_Elite({ subsets: ["latin"], weight: "400", variable: "--font-fw-type", display: "swap" });
export const fwFonts = `${courier.variable} ${elite.variable}`;
