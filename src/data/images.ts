// Central registry of bundled food photography.
// Metro requires static require() calls, so every asset is listed explicitly.

export const foodImages = {
  'chicken-tikka': require('../../assets/images/food/chicken-tikka.jpg'),
  'paneer-tikka': require('../../assets/images/food/paneer-tikka.jpg'),
  'tandoori-wings': require('../../assets/images/food/tandoori-wings.jpg'),
  samosa: require('../../assets/images/food/samosa.jpg'),
  'butter-chicken': require('../../assets/images/food/butter-chicken.jpg'),
  'dal-makhani': require('../../assets/images/food/dal-makhani.jpg'),
  'palak-paneer': require('../../assets/images/food/palak-paneer.jpg'),
  'masala-dosa': require('../../assets/images/food/masala-dosa.jpg'),
  'butter-naan': require('../../assets/images/food/butter-naan.jpg'),
  'garlic-naan': require('../../assets/images/food/garlic-naan.jpg'),
  'tandoori-roti': require('../../assets/images/food/tandoori-roti.jpg'),
  'chicken-biryani': require('../../assets/images/food/chicken-biryani.jpg'),
  'jeera-rice': require('../../assets/images/food/jeera-rice.jpg'),
  'gulab-jamun': require('../../assets/images/food/gulab-jamun.jpg'),
  rasmalai: require('../../assets/images/food/rasmalai.jpg'),
  'filter-coffee': require('../../assets/images/food/filter-coffee.jpg'),
  'masala-chai': require('../../assets/images/food/masala-chai.jpg'),
  'sweet-lassi': require('../../assets/images/food/sweet-lassi.jpg'),
} as const;

export const heroRestaurantImage = require('../../assets/images/food/hero-restaurant.jpg');
