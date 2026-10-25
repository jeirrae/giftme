// Preset wishlist items. Edit freely: add/remove categories or items.
// Each item needs a unique `id` (letters, numbers, dashes).
// `styles`: up to 5 quick suggestions shown as chips (people can also type their own).
// `size`: which shared size this item uses: "shoe", "top", "bottom", or leave it out.
// `budget`: which price ranges to offer: "small", "mid" or "big" (set per category,
// and an item can override it).
window.WISHLIST_CATEGORIES = [
  {
    id: "clothes",
    budget: "mid",
    name: "Clothes & Shoes",
    items: [
      { id: "shirt", name: "T-shirt / Polo", size: "top", styles: ["Plain tee", "Graphic tee", "Polo shirt", "Oversized", "Long sleeve"] },
      { id: "hoodie", name: "Hoodie or jacket", size: "top", styles: ["Pullover hoodie", "Zip-up hoodie", "Denim jacket", "Bomber jacket", "Windbreaker"] },
      { id: "pants", name: "Pants / Shorts", size: "bottom", styles: ["Baggy pants", "Skinny jeans", "Cargo pants", "Joggers", "Denim shorts"] },
      { id: "dress", name: "Dress / Skirt", size: "top", styles: ["Casual dress", "Party dress", "Maxi dress", "Mini skirt", "Pleated skirt"] },
      { id: "sneakers", name: "Sneakers", size: "shoe", styles: ["Running", "Basketball", "Casual", "Skate", "High-top"] },
      { id: "slippers", name: "Slippers / Sandals", size: "shoe", styles: ["Flip-flops", "Slides", "Sandals", "House slippers", "Clogs"] },
      { id: "pajamas", budget: "mid", name: "Pajamas / Loungewear", size: "top", styles: ["Pajama set", "Sleep shorts", "Robe", "Onesie", "Lounge pants"] },
      { id: "socks", budget: "small", name: "Socks & undies", size: "bottom", styles: ["Ankle socks", "Crew socks", "Boxers", "Briefs", "Undershirts"] },
    ],
  },
  {
    id: "accessories",
    budget: "mid",
    name: "Bags & Accessories",
    items: [
      { id: "bag", name: "Bag / Backpack", styles: ["Backpack", "Tote bag", "Sling bag", "Shoulder bag", "School bag"] },
      { id: "wallet", budget: "mid", name: "Wallet", styles: ["Bifold", "Long wallet", "Card holder", "Coin purse", "Zip wallet"] },
      { id: "watch", name: "Watch", styles: ["Digital", "Analog", "Sports watch", "Leather strap", "Metal strap"] },
      { id: "jewelry", name: "Jewelry", styles: ["Necklace", "Bracelet", "Earrings", "Ring", "Anklet"] },
      { id: "cap", budget: "small", name: "Cap / Hat", styles: ["Baseball cap", "Bucket hat", "Beanie", "Trucker cap", "Sun hat"] },
      { id: "sunglasses", budget: "mid", name: "Sunglasses", styles: ["Aviator", "Round", "Square", "Cat-eye", "Sporty"] },
      { id: "tumbler", budget: "small", name: "Tumbler / Water bottle", styles: ["Insulated bottle", "Tumbler with straw", "Kids bottle", "Thermos", "Shaker bottle"] },
    ],
  },
  {
    id: "tech",
    budget: "mid",
    name: "Gadgets & Tech",
    items: [
      { id: "earbuds", name: "Earbuds / Headphones", styles: ["Wireless earbuds", "Over-ear", "On-ear", "Gaming headset", "Noise-cancelling"] },
      { id: "powerbank", name: "Power bank", styles: ["10,000 mAh", "20,000 mAh", "Fast charging", "Magnetic", "Mini"] },
      { id: "phone-case", budget: "small", name: "Phone case", styles: ["Clear", "Silicone", "Rugged", "Cute / cartoon", "Wallet case"] },
      { id: "smartwatch", budget: "big", name: "Smartwatch", styles: ["Apple Watch", "Galaxy Watch", "Fitness band", "Kids smartwatch", "Huawei / Xiaomi"] },
      { id: "speaker", budget: "mid", name: "Bluetooth speaker", styles: ["Portable", "Waterproof", "Party speaker", "Mini", "Smart speaker"] },
      { id: "keyboard-mouse", name: "Keyboard / Mouse", styles: ["Mechanical keyboard", "Wireless mouse", "Gaming mouse", "Keyboard + mouse set", "Mouse pad"] },
      { id: "game", budget: "big", name: "Video game / Console", styles: ["Nintendo Switch", "PlayStation", "Xbox", "PC / Steam", "Game credits"] },
    ],
  },
  {
    id: "beauty",
    budget: "mid",
    name: "Beauty & Self-care",
    items: [
      { id: "perfume", name: "Perfume / Cologne", styles: ["Sweet", "Fresh", "Floral", "Woody", "Body mist"] },
      { id: "skincare", budget: "mid", name: "Skincare set", styles: ["Moisturizer", "Sunscreen", "Face wash", "Serum", "Lip care"] },
      { id: "makeup", name: "Makeup", styles: ["Lip tint", "Foundation", "Eyeshadow palette", "Mascara", "Blush"] },
      { id: "haircare", name: "Hair care / Styling tools", styles: ["Hair dryer", "Straightener", "Curler", "Shampoo set", "Hair clips"] },
      { id: "bath", budget: "small", name: "Bath & body set", styles: ["Body wash", "Lotion", "Bath bombs", "Body scrub", "Gift set"] },
    ],
  },
  {
    id: "home",
    budget: "small",
    name: "Home & Kitchen",
    items: [
      { id: "bedding", budget: "mid", name: "Bedsheets / Pillows", styles: ["Bedsheet set", "Pillow", "Body pillow", "Comforter", "Pillowcases"] },
      { id: "blanket", budget: "mid", name: "Blanket / Throw", styles: ["Fleece", "Knitted", "Weighted", "Hooded blanket", "Throw"] },
      { id: "mug", name: "Mug / Coffee stuff", styles: ["Mug", "French press", "Coffee beans", "Travel mug", "Matcha set"] },
      { id: "cookware", budget: "mid", name: "Cookware / Kitchen tools", styles: ["Air fryer", "Non-stick pan", "Knife set", "Baking set", "Rice cooker"] },
      { id: "plant", name: "Plant", styles: ["Succulent", "Snake plant", "Flowering plant", "Herb kit", "Fake plant"] },
      { id: "decor", name: "Room decor", styles: ["LED lights", "Posters", "Photo frames", "Rug", "Desk lamp"] },
      { id: "candle", name: "Scented candle", styles: ["Vanilla", "Lavender", "Coffee", "Christmas scent", "Unscented"] },
    ],
  },
  {
    id: "hobbies",
    budget: "small",
    name: "Books & Hobbies",
    items: [
      { id: "book", name: "Book", styles: ["Fiction", "Comics / manga", "Self-help", "Kids book", "Coloring book"] },
      { id: "journal", name: "Journal / Planner", styles: ["Planner", "Notebook", "Sketchbook", "Diary with lock", "Sticker set"] },
      { id: "art", name: "Art supplies", styles: ["Colored pencils", "Markers", "Paint set", "Crayons", "Clay"] },
      { id: "boardgame", name: "Board game / Puzzle", styles: ["Card game", "Jigsaw puzzle", "Strategy game", "Party game", "Classic games"] },
      { id: "sports", budget: "mid", name: "Sports / Fitness gear", styles: ["Basketball", "Badminton set", "Yoga mat", "Dumbbells", "Bike"] },
      { id: "lego", budget: "mid", name: "LEGO / Collectibles", styles: ["LEGO set", "Figurines", "Plushie", "Trading cards", "Blind box"] },
    ],
  },
  {
    id: "food",
    budget: "small",
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
    budget: "mid",
    name: "Experiences & Cash",
    items: [
      { id: "cash", budget: "mid", name: "Cash / Ampao", styles: ["Ampao", "GCash", "Bank transfer", "Savings", "Crisp new bills"] },
      { id: "gift-card", budget: "mid", name: "Gift card / GC", styles: ["Shopee / Lazada", "SM Gift Pass", "Grab / Foodpanda", "Starbucks", "Steam / Google Play"] },
      { id: "dinner", name: "Dinner treat", styles: ["Samgyup", "Buffet", "Fast food", "Café", "Fine dining"] },
      { id: "movie", name: "Movie / Concert tickets", styles: ["Cinema", "Concert", "Theme park", "Museum", "Sports game"] },
      { id: "staycation", budget: "big", name: "Staycation / Trip", styles: ["Hotel", "Beach", "Resort", "Out of town", "Abroad"] },
      { id: "spa", budget: "mid", name: "Spa / Massage", styles: ["Massage", "Facial", "Mani-pedi", "Haircut", "Spa day"] },
      { id: "subscription", budget: "small", name: "Subscription (Spotify, Netflix…)", styles: ["Spotify", "Netflix", "YouTube Premium", "Disney+", "Game Pass"] },
    ],
  },
];
