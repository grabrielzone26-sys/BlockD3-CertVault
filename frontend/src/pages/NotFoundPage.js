import React from 'react';
import { Link } from 'react-router-dom';
import securityImage from '../assets/images/bitcoin-digital-currency-circuit-board.jpg';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen app-shell flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div
          className="tech-hero rounded-2xl overflow-hidden shadow-xl h-48 bg-cover bg-center mb-8"
          style={{ backgroundImage: `url(${securityImage})` }}
        >
          <div className="bg-slate-950/70 h-full flex flex-col items-center justify-center px-4 text-center">
            <span className="status-chip">Signal lost</span>
            <h1 className="text-white text-4xl font-bold">BlockD3 CertVault</h1>
          </div>
        </div>

        <div className="tech-card py-8 px-4 sm:rounded-2xl sm:px-10">
          <div className="text-center">
            <h1 className="text-9xl font-bold text-primary-600">404</h1>
            <h2 className="mt-4 text-3xl font-medium text-gray-900">Page Not Found</h2>
            <p className="mt-2 text-sm text-gray-600">
              The page you're looking for doesn't exist or has been moved.
            </p>
            <div className="mt-6">
              <Link
                to="/"
                className="btn-primary"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
