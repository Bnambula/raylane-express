/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allows images from external URLs (e.g. your Firebase Storage or Cloudinary)
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'res.cloudinary.com',
      'images.unsplash.com',
    ],
  },
}

module.exports = nextConfig
