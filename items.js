// Preset wishlist items. Edit freely: add/remove categories or items.
// Each item needs a unique `id` (letters, numbers, dashes).
// `styles`: up to 5 quick suggestions shown as chips (people can also type their own).
// `size`: which shared size this item uses: "shoe", "top", "bottom", or leave it out.
window.WISHLIST_CATEGORIES = [
  {
    id: "clothes",
    name: "Clothes & Shoes",
    items: [
      { id: "shirt", name: "T-shirt / Polo", size: "top", styles: ["Plain tee", "Graphic tee", "Polo shirt", "Oversized", "Long sleeve"] },
      { id: "hoodie", name: "Hoodie or jacket", size: "top", styles: ["Pullover hoodie", "Zip-up hoodie", "Denim jacket", "Bomber jacket", "Windbreaker"] },
      { id: "pants", name: "Pants / Shorts", size: "bottom", styles: ["Baggy pants", "Skinny jeans", "Cargo pants", "Joggers", "Denim shorts"] },
      { id: "dress", name: "Dress / Skirt", size: "top", styles: ["Casual dress", "Party dress", "Maxi dress", "Mini skirt", "Pleated skirt"] },
      { id: "sneakers", name: "Sneakers", size: "shoe", styles: ["Running", "Basketball", "Casual", "Skate", "High-top"] },
      { id: "slippers", name: "Slippers / Sandals", size: "shoe", styles: ["Flip-flops", "Slides", "Sandals", "House slippers", "Clogs"] },
      { id: "pajamas", name: "Pajamas / Loungewear", size: "top", styles: ["Pajama set", "Sleep shorts", "Robe", "Onesie", "Lounge pants"] },
      { id: "socks", name: "Socks & undies", size: "bottom", styles: ["Ankle socks", "Crew socks", "Boxers", "Briefs", "Undershirts"] },
    ],
  },
  {
    id: "accessories",
    name: "Bags & Accessories",
    items: [
      { id: "bag", name: "Bag / Backpack", styles: ["Backpack", "Tote bag", "Sling bag", "Shoulder bag", "School bag"] },
      { id: "wallet", name: "Wallet", styles: ["Bifold", "Long wallet", "Card holder", "Coin purse", "Zip wallet"] },
      { id: "watch", name: "Watch", styles: ["Digital", "Analog", "Sports watch", "Leather strap", "Metal strap"] },
      { id: "jewelry", name: "Jewelry", styles: ["Necklace", "Bracelet", "Earrings", "Ring", "Anklet"] },
      { id: "cap", name: "Cap / Hat", styles: ["Baseball cap", "Bucket hat", "Beanie", "Trucker cap", "Sun hat"] },
      { id: "sunglasses", name: "Sunglasses", styles: ["Aviator", "Round", "Square", "Cat-eye", "Sporty"] },
      { id: "tumbler", name: "Tumbler / Water bottle", styles: ["Insulated bottle", "Tumbler with straw", "Kids bottle", "Thermos", "Shaker bottle"] },
    ],
  },
  {
    id: "tech",
    name: "Gadgets & Tech",
    items: [
      { id: "earbuds", name: "Earbuds / Headphones", styles: ["Wireless earbuds", "Over-ear", "On-ear", "Gaming headset", "Noise-cancelling"] },
      { id: "powerbank", name: "Power bank", styles: ["10,000 mAh", "20,000 mAh", "Fast charging", "Magnetic", "Mini"] },
      { id: "phone-case", name: "Phone case", styles: ["Clear", "Silicone", "Rugged", "Cute / cartoon", "Wallet case"] },
      { id: "smartwatch", name: "Smartwatch", styles: ["Apple Watch", "Galaxy Watch", "Fitness band", "Kids smartwatch", "Huawei / Xiaomi"] },
      { id: "speaker", name: "Bluetooth speaker", styles: ["Portable", "Waterproof", "Party speaker", "Mini", "Smart speaker"] },
      { id: "keyboard-mouse", name: "Keyboard / Mouse", styles: ["Mechanical keyboard", "Wireless mouse", "Gaming mouse", "Keyboard + mouse set", "Mouse pad"] },
      { id: "game", name: "Video game / Console", styles: ["Nintendo Switch", "PlayStation", "Xbox", "PC / Steam", "Game credits"] },
    ],
  },
  {
    id: "beauty",
    name: "Beauty & Self-care",
    items: [
      { id: "perfume", name: "Perfume / Cologne", styles: ["Sweet", "Fresh", "Floral", "Woody", "Body mist"] },
      { id: "skincare", name: "Skincare set", styles: ["Moisturizer", "Sunscreen", "Face wash", "Serum", "Lip care"] },
      { id: "makeup", name: "Makeup", styles: ["Lip tint", "Foundation", "Eyeshadow palette", "Mascara", "Blush"] },
      { id: "haircare", name: "Hair care / Styling tools", styles: ["Hair dryer", "Straightener", "Curler", "Shampoo set", "Hair clips"] },
      { id: "bath", name: "Bath & body set", styles: ["Body wash", "Lotion", "Bath bombs", "Body scrub", "Gift set"] },
    ],
  },
  {
    id: "home",
    name: "Home & Kitchen",
    items: [
      { id: "bedding", name: "Bedsheets / Pillows", styles: ["Bedsheet set", "Pillow", "Body pillow", "Comforter", "Pillowcases"] },
      { id: "blanket", name: "Blanket / Throw", styles: ["Fleece", "Knitted", "Weighted", "Hooded blanket", "Throw"] },
      { id: "mug", name: "Mug / Coffee stuff", styles: ["Mug", "French press", "Coffee beans", "Travel mug", "Matcha set"] },
      { id: "cookware", name: "Cookware / Kitchen tools", styles: ["Air fryer", "Non-stick pan", "Knife set", "Baking set", "Rice cooker"] },
      { id: "plant", name: "Plant", styles: ["Succulent", "Snake plant", "Flowering plant", "Herb kit", "Fake plant"] },
      { id: "decor", name: "Room decor", styles: ["LED lights", "Posters", "Photo frames", "Rug", "Desk lamp"] },
      { id: "candle", name: "Scented candle", styles: ["Vanilla", "Lavender", "Coffee", "Christmas scent", "Unscented"] },
    ],
  },
  {
    id: "hobbies",
    name: "Books & Hobbies",
    items: [
      { id: "book", name: "Book", styles: ["Fiction", "Comics / manga", "Self-help", "Kids book", "Coloring book"] },
      { id: "journal", name: "Journal / Planner", styles: ["Planner", "Notebook", "Sketchbook", "Diary with lock", "Sticker set"] },
      { id: "art", name: "Art supplies", styles: ["Colored pencils", "Markers", "Paint set", "Crayons", "Clay"] },
      { id: "boardgame", name: "Board game / Puzzle", styles: ["Card game", "Jigsaw puzzle", "Strategy game", "Party game", "Classic games"] },
      { id: "sports", name: "Sports / Fitness gear", styles: ["Basketball", "Badminton set", "Yoga mat", "Dumbbells", "Bike"] },
      { id: "lego", name: "LEGO / Collectibles", styles: ["LEGO set", "Figurines", "Plushie", "Trading cards", "Blind box"] },
    ],
  },
  {
    id: "food",
    name: "Food & Treats",
    items: [
      { id: "chocolates", name: "Chocolates / Sweets", styles: ["Milk chocolate", "Dark chocolate", "Gummies", "Cookies", "Imported sweets"] },
      { id: "snacks", name: "Snack basket", styles: ["Chips", "Local delicacies", "Imported snacks", "Healthy snacks", "Mixed basket"] },
      { id: "coffee", name: "Coffee / Tea", styles: ["Ground coffee", "Coffee beans", "3-in-1", "Milk tea", "Tea set"] },
      { id: "baked", name: "Baked goodies", styles: ["Cookies", "Brownies", "Cake", "Ensaymada", "Bread"] },
    ],
  },
  {
    id: "experiences",
    name: "Experiences & Cash",
    items: [
      { id: "cash", name: "Cash / Ampao", styles: ["Ampao", "GCash", "Bank transfer", "Savings", "Crisp new bills"] },
      { id: "gift-card", name: "Gift card / GC", styles: ["Shopee / Lazada", "SM Gift Pass", "Grab / Foodpanda", "Starbucks", "Steam / Google Play"] },
      { id: "dinner", name: "Dinner treat", styles: ["Samgyup", "Buffet", "Fast food", "Café", "Fine dining"] },
      { id: "movie", name: "Movie / Concert tickets", styles: ["Cinema", "Concert", "Theme park", "Museum", "Sports game"] },
      { id: "staycation", name: "Staycation / Trip", styles: ["Hotel", "Beach", "Resort", "Out of town", "Abroad"] },
      { id: "spa", name: "Spa / Massage", styles: ["Massage", "Facial", "Mani-pedi", "Haircut", "Spa day"] },
      { id: "subscription", name: "Subscription (Spotify, Netflix…)", styles: ["Spotify", "Netflix", "YouTube Premium", "Disney+", "Game Pass"] },
    ],
  },
];
