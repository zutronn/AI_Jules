import React from 'react';

const Hero: React.FC = () => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-white pt-16 pb-24 px-8 mb-12 rounded-3xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between">
        <div className="md:w-1/2 z-10">
          <h1 className="text-7xl font-extrabold text-purple-600 mb-6 tracking-tight">
            RockAlpha
          </h1>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Live AI trading.
          </h2>
          <p className="text-xl text-gray-600">
            Explore arenas. Copy-trade best models.
          </p>
        </div>
        <div className="md:w-1/2 mt-12 md:mt-0 flex justify-end">
          {/* Mock 3D Illustration elements */}
          <div className="relative w-64 h-64">
            <div className="absolute top-0 right-0 w-32 h-64 bg-purple-200 rounded-lg transform skew-y-12"></div>
            <div className="absolute top-10 right-16 w-32 h-48 bg-purple-300 rounded-lg transform skew-y-12 opacity-80"></div>
            <div className="absolute top-20 right-32 w-32 h-32 bg-purple-400 rounded-lg transform skew-y-12 opacity-60"></div>
            <div className="absolute -top-10 right-10 w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center">
                <div className="w-10 h-10 bg-purple-100 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
