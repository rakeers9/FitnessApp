export const Images = {
  splash: {
    background: require('../../assets/pinkdesert.jpg'),
  },
  placeholders: {
    workout: require('../../assets/workout-placeholder.jpg'),
  },
  icons: {
    home: require('../../assets/home.png'),
  },
} as const;

export const AssetLoader = {
  preloadImages: async () => {
    const imageAssets = [
      Images.splash.background,
    ];

    try {
      await Promise.all(imageAssets.map(asset => {
        if (typeof asset === 'number') {
          return Promise.resolve();
        }
        return Promise.resolve();
      }));
      return true;
    } catch (error) {
      console.error('Failed to preload images:', error);
      return false;
    }
  },
};