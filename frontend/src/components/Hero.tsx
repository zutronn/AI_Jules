import React from 'react';

const Hero: React.FC = () => {
  return (
    <div className="relative overflow-hidden bg-white pt-20 pb-32 mb-12 border-b border-gray-50">
      <div className="max-w-7xl mx-auto text-center">
        <h1 className="text-8xl font-black text-orange-600 mb-6 tracking-tighter">
          Lawliet Studios
        </h1>
        <div className="flex flex-col items-center space-y-2">
            <h2 className="text-3xl font-black text-gray-900">
                Live AI trading.
            </h2>
            <p className="text-xl text-gray-400 font-bold">
                Explore arenas. Copy-trade best models.
            </p>
        </div>
      </div>

      {/* Decorative dots/circles matching target aesthetic */}
      <div className="absolute top-20 left-20 w-4 h-4 bg-orange-100 rounded-full"></div>
      <div className="absolute bottom-20 right-40 w-6 h-6 bg-orange-50 rounded-full"></div>
      <div className="absolute top-40 right-20 w-8 h-8 border border-orange-100 rounded-full"></div>
    </div>
  );
};

export default Hero;
