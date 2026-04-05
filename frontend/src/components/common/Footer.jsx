// frontend/src/components/common/Footer.jsx
/**
 * Footer - Footer component with links and social media
 * Features:
 * - Multiple footer sections with useful links
 * - Social media links
 * - Contact information
 * - Copyright notice
 * - Mobile responsive
 */

import { Mail, Phone, MapPin, Github, Gitlab, Twitter } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Tricolor bar top */}
      <div className="h-1 flex">
        <div className="flex-1 bg-orange-500"></div>
        <div className="flex-1 bg-white"></div>
        <div className="flex-1 bg-green-600"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* About Section */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">YojanaMitra</h3>
            <p className="text-sm text-gray-400 mb-4">
              Making government schemes accessible to every Indian citizen.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-blue-400 transition-colors">
                <Github size={20} />
              </a>
              <a href="#" className="hover:text-blue-400 transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="hover:text-blue-400 transition-colors">
                <Gitlab size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/dashboard" className="hover:text-white transition-colors">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="/schemes" className="hover:text-white transition-colors">
                  Find Schemes
                </a>
              </li>
              <li>
                <a href="/profile" className="hover:text-white transition-colors">
                  My Profile
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  About Us
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail size={16} className="flex-shrink-0" />
                <a href="mailto:support@yojanamitra.in" className="hover:text-white transition-colors">
                  support@yojanamitra.in
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} className="flex-shrink-0" />
                <span>+91 1800 XXX XXXX</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={16} className="flex-shrink-0 mt-1" />
                <span>
                  New Delhi, India
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 pt-8">
          {/* Info Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-3 bg-gray-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-400">1000+</p>
              <p className="text-xs text-gray-400">Schemes Available</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-400">500K+</p>
              <p className="text-xs text-gray-400">Users Registered</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-400">₹100Cr</p>
              <p className="text-xs text-gray-400">Benefits Accessed</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-yellow-400">7</p>
              <p className="text-xs text-gray-400">Languages</p>
            </div>
          </div>

          {/* Copyright */}
          <div className="flex flex-col md:flex-row items-center justify-between text-sm text-gray-400">
            <p>
              © {currentYear} YojanaMitra. All rights reserved. | Made with ❤️ in India
            </p>
            <p>
              Government schemes made accessible by{' '}
              <span className="text-white font-semibold">YojanaMitra</span>
            </p>
          </div>

          {/* Disclaimer */}
          <div className="mt-6 p-3 bg-gray-800 rounded-lg text-xs text-gray-400">
            <p>
              <strong>Disclaimer:</strong> YojanaMitra is an independent platform. We are not affiliated with or endorsed by the Government of India. 
              Always verify details on official government portals.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
