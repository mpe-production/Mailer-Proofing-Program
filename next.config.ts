/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tells Next.js to not bundle binary engines like Sharp & PDFKit
  serverExternalPackages: ['sharp', 'pdfkit'],
};

export default nextConfig;