import { Html, Head, Main, NextScript } from 'next/document'
import Script from 'next/script'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="description" content="Real-time chatting webapp" />
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content="#f3f4f6" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body>
        <Main />
        <NextScript />
        <Script
          id="force-light-mode"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Force light mode immediately and continuously
              (function() {
                function forceLightMode() {
                  document.documentElement.classList.remove('dark');
                  localStorage.setItem('darkMode', 'false');
                }

                // Force immediately
                forceLightMode();

                // Force on DOM ready
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', forceLightMode);
                }

                // Force periodically to override any system changes
                setInterval(forceLightMode, 1000);
              })();
            `,
          }}
        />
      </body>
    </Html>
  )
}
