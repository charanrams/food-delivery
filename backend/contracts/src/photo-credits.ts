// Freely licensed dish photos from Wikimedia Commons, imported into Cloudinary by
// `npm run photos -w backend`. Attribution is required — the website lists these at /credits.
export interface PhotoSource {
  key: string; // product or category slug, or "hero"
  source: string;
  page: string;
  license: string;
  author: string;
}

const W = 'https://upload.wikimedia.org/wikipedia/commons';

export const PHOTO_SOURCES: PhotoSource[] = [
  // Sign-in + home banner photo (served from frontend/public/images/hero-biryani.jpg and the app's assets).
  { key: 'hero-biryani', source: `${W}/5/56/%E0%A6%AE%E0%A6%BE%E0%A6%9F%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B0%E0%A6%BF%E0%A6%AF%E0%A6%BC%E0%A6%BE%E0%A6%A8%E0%A6%BF.jpg`, page: 'https://commons.wikimedia.org/wiki/File:%E0%A6%AE%E0%A6%BE%E0%A6%9F%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B0%E0%A6%BF%E0%A6%AF%E0%A6%BC%E0%A6%BE%E0%A6%A8%E0%A6%BF.jpg', license: 'CC BY-SA 4.0', author: 'Munni Akter Mim' },
  { key: 'hero', source: `${W}/9/98/South_Indian_Thali_Cropped.jpg`, page: 'https://commons.wikimedia.org/wiki/File:South_Indian_Thali_Cropped.jpg', license: 'CC BY 2.0', author: 'Wikimedia Commons contributor' },
  { key: 'chicken-dum-biryani', source: `${W}/b/b1/Biryani_in_Hyderabad.jpg`, page: 'https://commons.wikimedia.org/wiki/File:Biryani_in_Hyderabad.jpg', license: 'CC BY 4.0', author: 'Medhi jyoti' },
  { key: 'paneer-tikka-biryani', source: `${W}/8/84/Dum_veg_biryani_by_fatima.jpg`, page: 'https://commons.wikimedia.org/wiki/File:Dum_veg_biryani_by_fatima.jpg', license: 'CC BY-SA 4.0', author: 'Wikimedia Commons contributor' },
  { key: 'paneer-butter-masala', source: `${W}/b/be/Rotti_and_Paneer_Butter_Masala_2.jpg`, page: 'https://commons.wikimedia.org/wiki/File:Rotti_and_Paneer_Butter_Masala_2.jpg', license: 'CC BY-SA 4.0', author: 'Ganesh Mohan T' },
  { key: 'gongura-mutton-curry', source: `${W}/f/fe/Odia_Mutton_Curry_%28Mansha_Tarkari%29.jpg`, page: 'https://commons.wikimedia.org/wiki/File:Odia_Mutton_Curry_(Mansha_Tarkari).jpg', license: 'CC BY-SA 4.0', author: 'Satwik Cuttack' },
  { key: 'palak-paneer', source: `${W}/b/b7/Palakpaneer_Rayagada_Odisha_0009.jpg`, page: 'https://commons.wikimedia.org/wiki/File:Palakpaneer_Rayagada_Odisha_0009.jpg', license: 'CC BY-SA 4.0', author: 'Lopanayak' },
  { key: 'andhra-veg-meals', source: `${W}/3/3e/Vegetarian_Andhra_Meal.jpg`, page: 'https://commons.wikimedia.org/wiki/File:Vegetarian_Andhra_Meal.jpg', license: 'CC BY 2.0', author: 'PriyaBooks' },
  { key: 'ghee-masala-dosa', source: `${W}/4/43/Masala_dosa_01.jpg`, page: 'https://commons.wikimedia.org/wiki/File:Masala_dosa_01.jpg', license: 'CC BY-SA 4.0', author: 'Marajozkee' },
  { key: 'butter-naan', source: `${W}/8/86/ButterNaan.JPG`, page: 'https://commons.wikimedia.org/wiki/File:ButterNaan.JPG', license: 'CC BY-SA 4.0', author: 'Wikimedia Commons contributor' },
  { key: 'gulab-jamun', source: `${W}/5/58/Two_Gulab_Jamun_in_a_plate_01.jpg`, page: 'https://commons.wikimedia.org/wiki/File:Two_Gulab_Jamun_in_a_plate_01.jpg', license: 'CC BY-SA 4.0', author: 'Suyash.dwivedi' },
];

/** Category tiles reuse a representative dish photo. */
export const CATEGORY_PHOTO: Record<string, string> = {
  'biryani-rice': 'chicken-dum-biryani',
  curries: 'paneer-butter-masala',
  'meals-thalis': 'andhra-veg-meals',
  tiffins: 'ghee-masala-dosa',
  breads: 'butter-naan',
  desserts: 'gulab-jamun',
};
