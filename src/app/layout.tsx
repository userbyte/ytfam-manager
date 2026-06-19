import Header from "./components/Header";
import Footer from "./components/Footer";
import { Metadata, Viewport } from "next";
import { Roboto, Source_Code_Pro } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "react-toastify";

const font_Roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  fallback: ["Courier New", "Courier", "monospace"],
  display: "swap",
});

const font_SourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  variable: "--font-source-code-pro",
  fallback: ["Courier New", "Courier", "monospace"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ytmgr.userbyte.xyz"),
  title: "ytfam-manager",
  description: "manage your youtube premium family",
  keywords: [],
  manifest: "/pwa/manifest.json",
  icons: {
    icon: "/img/png/logo.png",
    shortcut: "/img/png/logo.png",
    apple: "/img/png/logo_nomask.png",
    other: {
      rel: "apple-touch-icon-precomposed",
      url: "/img/png/logo_nomask.png",
    },
  },
  openGraph: {
    siteName: "ytfam-manager",
    images: "/img/png/logo.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#000000",
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${font_Roboto.variable} ${font_SourceCodePro.variable}`}
    >
      <body>
        <Header />
        {children}
        <ToastContainer position="bottom-center" theme="dark" />
        <Footer />
      </body>
    </html>
  );
}
