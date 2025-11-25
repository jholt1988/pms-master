/**
 * Leasing Landing Page
 * Public-facing page for prospective tenants to interact with AI Leasing Agent
 * No authentication required - accessible to anyone
 */

import React, { useState } from 'react';
import { Home, MessageSquare, Calendar, FileText, Star, MapPin, Phone, Mail } from 'lucide-react';
import { LeasingAgentBot } from '../components/LeasingAgentBot';

export const LeasingLandingPage: React.FC = () => {
  const [showBot, setShowBot] = useState(false);

  const features = [
    {
      icon: MessageSquare,
      title: '24/7 AI Assistant',
      description: 'Get instant answers to your questions anytime, anywhere',
    },
    {
      icon: Home,
      title: 'Smart Property Matching',
      description: 'Find the perfect home based on your preferences and budget',
    },
    {
      icon: Calendar,
      title: 'Easy Tour Scheduling',
      description: 'Book property tours at your convenience',
    },
    {
      icon: FileText,
      title: 'Quick Application',
      description: 'Apply online with our streamlined process',
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      rating: 5,
      comment: 'The AI leasing agent made finding my apartment so easy! Got answers instantly and scheduled a tour the same day.',
      image: 'https://via.placeholder.com/50',
    },
    {
      name: 'Mike Chen',
      rating: 5,
      comment: 'Best rental experience ever. The chatbot helped me through every step of the application process.',
      image: 'https://via.placeholder.com/50',
    },
    {
      name: 'Emily Rodriguez',
      rating: 5,
      comment: 'Found my dream apartment in under a week! The AI agent knew exactly what I was looking for.',
      image: 'https://via.placeholder.com/50',
    },
  ];

  const properties = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400',
      title: 'Modern Downtown Studio',
      bedrooms: 0,
      bathrooms: 1,
      rent: 1200,
      location: 'Downtown District',
      available: true,
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400',
      title: 'Spacious 2BR with Balcony',
      bedrooms: 2,
      bathrooms: 2,
      rent: 1800,
      location: 'Riverside Area',
      available: true,
    },
    {
      id: 3,
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400',
      title: 'Luxury 3BR Penthouse',
      bedrooms: 3,
      bathrooms: 2.5,
      rent: 2800,
      location: 'Uptown Heights',
      available: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header/Navigation */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Home className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Property Management Suite</h1>
            </div>
            <div className="flex items-center gap-4">
              <a href="tel:555-0123" className="flex items-center gap-2 text-gray-600 hover:text-blue-600">
                <Phone className="w-4 h-4" />
                <span>(555) 123-4567</span>
              </a>
              <button
                onClick={() => setShowBot(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Chat with AI Agent
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-linear-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-5xl font-bold mb-6">Find Your Perfect Home with AI</h2>
            <p className="text-xl text-blue-100 mb-8">
              Our intelligent leasing agent is available 24/7 to help you discover, tour, and apply for your dream apartment.
            </p>
            <button
              onClick={() => setShowBot(true)}
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors inline-flex items-center gap-2 shadow-lg"
            >
              <MessageSquare className="w-6 h-6" />
              Start Chatting Now
            </button>
            <p className="text-blue-200 mt-4 text-sm">No signup required • Instant responses</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
                  <feature.icon className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-semibold mb-2">{feature.title}</h4>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">Featured Properties</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {properties.map((property) => (
              <div key={property.id} className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                <div className="relative h-48">
                  <img
                    src={property.image}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                  {property.available && (
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      Available Now
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h4 className="text-xl font-bold mb-2">{property.title}</h4>
                  <div className="flex items-center gap-2 text-gray-600 mb-4">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{property.location}</span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-gray-600">
                      {property.bedrooms} bed • {property.bathrooms} bath
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      ${property.rent}/mo
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBot(true)}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    Ask About This Property
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <button
              onClick={() => setShowBot(true)}
              className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-2"
            >
              View All Properties
              <span>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">What Our Residents Say</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-lg shadow-md">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.comment}"</p>
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">Verified Resident</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-linear-to-r from-blue-600 to-blue-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Find Your New Home?</h3>
          <p className="text-xl text-blue-100 mb-8">
            Chat with our AI leasing agent and discover the perfect property for you!
          </p>
          <button
            onClick={() => setShowBot(true)}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors inline-flex items-center gap-2 shadow-lg"
          >
            <MessageSquare className="w-6 h-6" />
            Start Your Search
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Home className="w-6 h-6 text-blue-400" />
                <span className="font-bold text-white">Property Management</span>
              </div>
              <p className="text-sm">
                Making your home search easy with AI-powered assistance.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>(555) 123-4567</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>leasing@example.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>123 Main St, City, State</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => setShowBot(true)} className="hover:text-white">About Us</button></li>
                <li><button onClick={() => setShowBot(true)} className="hover:text-white">Properties</button></li>
                <li><button onClick={() => setShowBot(true)} className="hover:text-white">Amenities</button></li>
                <li><button onClick={() => setShowBot(true)} className="hover:text-white">Contact</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => setShowBot(true)} className="hover:text-white">FAQ</button></li>
                <li><button onClick={() => setShowBot(true)} className="hover:text-white">Application Process</button></li>
                <li><button onClick={() => setShowBot(true)} className="hover:text-white">Pet Policy</button></li>
                <li><button onClick={() => setShowBot(true)} className="hover:text-white">Resident Portal</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2025 Property Management Suite. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Leasing Agent Bot */}
      {showBot && (
        <LeasingAgentBot
          initialOpen={true}
          position="bottom-right"
        />
      )}

      {/* Floating Action Button (when bot is closed) */}
      {!showBot && (
        <button
          onClick={() => setShowBot(true)}
          className="fixed bottom-6 right-6 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-full p-4 shadow-2xl hover:shadow-blue-500/50 hover:scale-110 transition-all duration-300 group z-50"
          aria-label="Open Leasing Agent"
        >
          <div className="relative">
            <MessageSquare className="w-6 h-6" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          </div>
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            💬 Need help? Chat with our AI Agent!
          </div>
        </button>
      )}
    </div>
  );
};

export default LeasingLandingPage;
