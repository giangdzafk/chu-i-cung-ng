import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hệ Sinh Thái Nông Sản',
  description: 'Minh bạch hành trình từ trang trại đến bàn ăn',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        {/* Nơi chứa nội dung của các trang con (login, admin, farmer...) */}
        {children}
      </body>
    </html>
  );
}