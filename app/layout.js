import './globals.css'

export const metadata = {
  title: 'PostMe - 익명 메시지',
  description: '익명으로 메시지를 주고받는 공간',
  manifest: '/manifest.json',
  themeColor: '#3B82F6',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PostMe',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="min-h-screen">
        {/* 모바일 해상도 고정 컨테이너 */}
        <div className="mobile-container max-w-[430px] mx-auto min-h-screen bg-white shadow-2xl">
          {children}
        </div>
      </body>
    </html>
  )
}
