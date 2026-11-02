// Comprehensive Philippine Regions, Provinces, and Cities/Municipalities Directory
// Covers Luzon (NCR, CAR, Regions I, II, III, IV-A, IV-B, V),
// Visayas (Regions VI, VII, VIII), and Mindanao (Regions IX, X, XI, XII, XIII, BARMM)

export const PH_DIRECTORY = [
  {
    regionId: 'ncr',
    regionCode: 'NCR',
    regionName: 'Metro Manila (NCR)',
    islandGroup: 'Metro Manila (NCR)',
    defaultTransit: '1 - 2 Days',
    defaultFee: 60,
    provinces: [
      {
        name: 'Metro Manila',
        cities: [
          'Manila City',
          'Quezon City',
          'Makati City',
          'Taguig City',
          'Pasig City',
          'Mandaluyong City',
          'Pasay City',
          'Parañaque City',
          'Las Piñas City',
          'Muntinlupa City',
          'Marikina City',
          'Valenzuela City',
          'Caloocan City',
          'Malabon City',
          'Navotas City',
          'San Juan City',
          'Pateros',
        ],
      },
    ],
  },
  {
    regionId: 'car',
    regionCode: 'CAR',
    regionName: 'Cordillera Administrative Region (CAR)',
    islandGroup: 'Luzon (North & South)',
    defaultTransit: '3 - 5 Days',
    defaultFee: 85,
    provinces: [
      {
        name: 'Benguet',
        cities: ['Baguio City', 'La Trinidad', 'Itogon', 'Tuba', 'Tublay', 'Atok', 'Buguias', 'Mankayan'],
      },
      {
        name: 'Abra',
        cities: ['Bangued', 'Bucay', 'Dolores', 'La Paz', 'Pidigan', 'Tayum'],
      },
      {
        name: 'Apayao',
        cities: ['Kabugao', 'Luna', 'Conner', 'Flora', 'Pudtol', 'Santa Marcela'],
      },
      {
        name: 'Ifugao',
        cities: ['Lagawe', 'Banaue', 'Kiangan', 'Alfonso Lista', 'Lamut', 'Hungduan'],
      },
      {
        name: 'Kalinga',
        cities: ['Tabuk City', 'Tinglayan', 'Lubuagan', 'Pinukpuk', 'Rizal', 'Balbalan'],
      },
      {
        name: 'Mountain Province',
        cities: ['Bontoc', 'Sagada', 'Bauko', 'Besao', 'Sabangan', 'Tadian'],
      },
    ],
  },
  {
    regionId: 'region1',
    regionCode: 'Region I',
    regionName: 'Ilocos Region (Region I)',
    islandGroup: 'Luzon (North & South)',
    defaultTransit: '2 - 4 Days',
    defaultFee: 85,
    provinces: [
      {
        name: 'Ilocos Norte',
        cities: ['Laoag City', 'Batac City', 'Pagudpud', 'Paoay', 'San Nicolas', 'Bacarra', 'Dingras', 'Burgos'],
      },
      {
        name: 'Ilocos Sur',
        cities: ['Vigan City', 'Candon City', 'Bantay', 'Narvacan', 'Santa Maria', 'Sinait', 'Cabugao', 'Tagudin'],
      },
      {
        name: 'La Union',
        cities: ['San Fernando City', 'San Juan', 'Bauang', 'Agoo', 'Bacnotan', 'Naguilian', 'Rosario', 'Aringay'],
      },
      {
        name: 'Pangasinan',
        cities: [
          'Dagupan City',
          'Urdaneta City',
          'Alaminos City',
          'San Carlos City',
          'Lingayen',
          'Calasiao',
          'Binmaley',
          'Bolinao',
          'Mangaldan',
          'Rosales',
          'Tayug',
        ],
      },
    ],
  },
  {
    regionId: 'region2',
    regionCode: 'Region II',
    regionName: 'Cagayan Valley (Region II)',
    islandGroup: 'Luzon (North & South)',
    defaultTransit: '3 - 5 Days',
    defaultFee: 85,
    provinces: [
      {
        name: 'Cagayan',
        cities: ['Tuguegarao City', 'Aparri', 'Solana', 'Lal-lo', 'Sanchez-Mira', 'Claveria', 'Gattaran', 'Santa Ana'],
      },
      {
        name: 'Isabela',
        cities: ['Ilagan City', 'Cauayan City', 'Santiago City', 'Alicia', 'Roxas', 'Cabagan', 'Echague', 'San Mateo'],
      },
      {
        name: 'Nueva Vizcaya',
        cities: ['Bayombong', 'Solano', 'Bambang', 'Aritao', 'Bagabag', 'Dupax del Norte', 'Kayapa'],
      },
      {
        name: 'Quirino',
        cities: ['Cabarroguis', 'Diffun', 'Maddela', 'Aglipay', 'Saguday', 'Nagtipunan'],
      },
      {
        name: 'Batanes',
        cities: ['Basco', 'Itbayat', 'Ivana', 'Mahatao', 'Sabtang', 'Uyugan'],
      },
    ],
  },
  {
    regionId: 'region3',
    regionCode: 'Region III',
    regionName: 'Central Luzon (Region III)',
    islandGroup: 'Luzon (North & South)',
    defaultTransit: '2 - 4 Days',
    defaultFee: 85,
    provinces: [
      {
        name: 'Bulacan',
        cities: [
          'Malolos City',
          'Meycauayan City',
          'San Jose del Monte City',
          'Baliwag City',
          'Marilao',
          'Bocaue',
          'Santa Maria',
          'Guiguinto',
          'Plaridel',
          'Pulilan',
          'Hagonoy',
        ],
      },
      {
        name: 'Pampanga',
        cities: [
          'San Fernando City',
          'Angeles City',
          'Mabalacat City',
          'Guagua',
          'Lubao',
          'Mexico',
          'Apalit',
          'Porac',
          'Magalang',
          'Floridablanca',
        ],
      },
      {
        name: 'Tarlac',
        cities: ['Tarlac City', 'Capas', 'Concepcion', 'Paniqui', 'Bamban', 'Camiling', 'Gerona', 'Victoria'],
      },
      {
        name: 'Nueva Ecija',
        cities: [
          'Cabanatuan City',
          'Gapan City',
          'Palayan City',
          'San Jose City',
          'Science City of Muñoz',
          'Talavera',
          'Guimba',
          'Santa Rosa',
        ],
      },
      {
        name: 'Bataan',
        cities: ['Balanga City', 'Mariveles', 'Dinalupihan', 'Orani', 'Limay', 'Orion', 'Hermosa', 'Morong', 'Bagac'],
      },
      {
        name: 'Zambales',
        cities: ['Olongapo City', 'Iba', 'Subic', 'Castillejos', 'San Marcelino', 'San Antonio', 'San Narciso', 'Botolan', 'Masinloc'],
      },
      {
        name: 'Aurora',
        cities: ['Baler', 'Maria Aurora', 'Dipaculao', 'Casiguran', 'San Luis', 'Dingalan'],
      },
    ],
  },
  {
    regionId: 'region4a',
    regionCode: 'Region IV-A',
    regionName: 'CALABARZON (Region IV-A)',
    islandGroup: 'Luzon (North & South)',
    defaultTransit: '1 - 3 Days',
    defaultFee: 85,
    provinces: [
      {
        name: 'Laguna',
        cities: [
          'Calamba City',
          'Santa Rosa City',
          'Biñan City',
          'San Pedro City',
          'Cabuyao City',
          'San Pablo City',
          'Santa Cruz',
          'Los Baños',
          'Bay',
          'Calauan',
          'Pagsanjan',
          'Siniloan',
          'Nagcarlan',
          'Liliw',
          'Majayjay',
        ],
      },
      {
        name: 'Cavite',
        cities: [
          'Bacoor City',
          'Imus City',
          'Dasmariñas City',
          'General Trias City',
          'Tagaytay City',
          'Trece Martires City',
          'Cavite City',
          'Carmona City',
          'Silang',
          'Kawit',
          'Rosario',
          'Tanza',
          'Naic',
          'GMA (General Mariano Alvarez)',
          'Alfonso',
          'Indang',
        ],
      },
      {
        name: 'Batangas',
        cities: [
          'Batangas City',
          'Lipa City',
          'Tanauan City',
          'Santo Tomas City',
          'Calaca City',
          'Nasugbu',
          'Balayan',
          'Bauan',
          'Lemery',
          'Taal',
          'San Juan',
          'Rosario',
          'Malvar',
          'Mabini',
        ],
      },
      {
        name: 'Rizal',
        cities: [
          'Antipolo City',
          'Cainta',
          'Taytay',
          'Binangonan',
          'Rodriguez (Montalban)',
          'San Mateo',
          'Angono',
          'Tanay',
          'Teresa',
          'Morong',
          'Baras',
          'Cardona',
        ],
      },
      {
        name: 'Quezon',
        cities: [
          'Lucena City',
          'Tayabas City',
          'Sariaya',
          'Candelaria',
          'Tiaong',
          'Pagbilao',
          'Gumaca',
          'Lopez',
          'Atimonan',
          'Infanta',
          'Real',
          'Mauban',
        ],
      },
    ],
  },
  {
    regionId: 'region4b',
    regionCode: 'MIMAROPA',
    regionName: 'MIMAROPA (Region IV-B)',
    islandGroup: 'Island & Remote Areas',
    defaultTransit: '5 - 8 Days',
    defaultFee: 185,
    provinces: [
      {
        name: 'Palawan',
        cities: ['Puerto Princesa City', 'Coron', 'El Nido', 'San Vicente', 'Brooke’s Point', 'Narra', 'Roxas', 'Taytay', 'Balabac'],
      },
      {
        name: 'Oriental Mindoro',
        cities: ['Calapan City', 'Puerto Galera', 'Pinamalayan', 'Naujan', 'Roxas', 'Victoria', 'Bongabong', 'Mansalay'],
      },
      {
        name: 'Occidental Mindoro',
        cities: ['Mamburao', 'San Jose', 'Sablayan', 'Abra de Ilog', 'Santa Cruz', 'Rizal', 'Calintaan'],
      },
      {
        name: 'Marinduque',
        cities: ['Boac', 'Mogpog', 'Santa Cruz', 'Gasan', 'Buenavista', 'Torrijos'],
      },
      {
        name: 'Romblon',
        cities: ['Romblon', 'Odiongan', 'San Agustin', 'Looc', 'Cajidiocan', 'San Fernando'],
      },
    ],
  },
  {
    regionId: 'region5',
    regionCode: 'Region V',
    regionName: 'Bicol Region (Region V)',
    islandGroup: 'Luzon (North & South)',
    defaultTransit: '3 - 5 Days',
    defaultFee: 85,
    provinces: [
      {
        name: 'Albay',
        cities: ['Legazpi City', 'Tabaco City', 'Ligao City', 'Daraga', 'Camalig', 'Guinobatan', 'Polangui', 'Tiwi'],
      },
      {
        name: 'Camarines Sur',
        cities: ['Naga City', 'Iriga City', 'Pili', 'Libmanan', 'Calabanga', 'Goa', 'Nabua', 'Caramoan', 'Sipocot'],
      },
      {
        name: 'Camarines Norte',
        cities: ['Daet', 'Labo', 'Jose Panganiban', 'Paracale', 'Mercedes', 'Vinzons', 'Talisay'],
      },
      {
        name: 'Sorsogon',
        cities: ['Sorsogon City', 'Matnog', 'Bulan', 'Irosin', 'Gubat', 'Donsol', 'Casiguran', 'Pilar'],
      },
      {
        name: 'Catanduanes',
        cities: ['Virac', 'San Andres', 'Bato', 'Baras', 'Viga', 'Pandan'],
      },
      {
        name: 'Masbate',
        cities: ['Masbate City', 'Aroroy', 'Cataingan', 'Milagros', 'Placer', 'Cawayan'],
      },
    ],
  },
  {
    regionId: 'region6',
    regionCode: 'Region VI',
    regionName: 'Western Visayas (Region VI)',
    islandGroup: 'Visayas',
    defaultTransit: '4 - 6 Days',
    defaultFee: 120,
    provinces: [
      {
        name: 'Iloilo',
        cities: ['Iloilo City', 'Passi City', 'Oton', 'Pavia', 'Santa Barbara', 'Pototan', 'Miagao', 'Dumangas', 'Estancia'],
      },
      {
        name: 'Negros Occidental',
        cities: [
          'Bacolod City',
          'Silay City',
          'Talisay City',
          'Bago City',
          'San Carlos City',
          'Kabankalan City',
          'Cadiz City',
          'Sagay City',
          'Victorias City',
          'escalante City',
          'Sipalay City',
          'Himamaylan City',
        ],
      },
      {
        name: 'Aklan',
        cities: ['Kalibo', 'Malay (Boracay)', 'Ibajay', 'Nabas', 'New Washington', 'Numancia', 'Banga'],
      },
      {
        name: 'Capiz',
        cities: ['Roxas City', 'Panay', 'Pontevedra', 'Mambusao', 'Dumalag', 'Dao', 'Sigma'],
      },
      {
        name: 'Antique',
        cities: ['San Jose de Buenavista', 'Sibalom', 'Culasi', 'Pandan', 'Hamtic', 'Bugasong', 'Tibiao'],
      },
      {
        name: 'Guimaras',
        cities: ['Jordan', 'Buenavista', 'Nueva Valencia', 'San Lorenzo', 'Sibunag'],
      },
    ],
  },
  {
    regionId: 'region7',
    regionCode: 'Region VII',
    regionName: 'Central Visayas (Region VII)',
    islandGroup: 'Visayas',
    defaultTransit: '4 - 6 Days',
    defaultFee: 120,
    provinces: [
      {
        name: 'Cebu',
        cities: [
          'Cebu City',
          'Mandaue City',
          'Lapu-Lapu City',
          'Talisay City',
          'Danao City',
          'Toledo City',
          'Naga City (Cebu)',
          'Carcar City',
          'Bogo City',
          'Consolacion',
          'Liloan',
          'Minglanilla',
          'Moalboal',
          'Oslob',
          'Bantayan',
        ],
      },
      {
        name: 'Bohol',
        cities: ['Tagbilaran City', 'Panglao', 'Ubay', 'Talibon', 'Tubigon', 'Carmen', 'Jagna', 'Loon', 'Inabanga'],
      },
      {
        name: 'Negros Oriental',
        cities: ['Dumaguete City', 'Bais City', 'Bayawan City', 'Canlaon City', 'Guihulngan City', 'Tanjay City', 'Sibulan', 'Valencia'],
      },
      {
        name: 'Siquijor',
        cities: ['Siquijor', 'Larena', 'Lazi', 'San Juan', 'Maria', 'Enrique Villanueva'],
      },
    ],
  },
  {
    regionId: 'region8',
    regionCode: 'Region VIII',
    regionName: 'Eastern Visayas (Region VIII)',
    islandGroup: 'Visayas',
    defaultTransit: '4 - 6 Days',
    defaultFee: 120,
    provinces: [
      {
        name: 'Leyte',
        cities: ['Tacloban City', 'Ormoc City', 'Baybay City', 'Palo', 'Tanauan', 'Abuyog', 'Carigara', 'Palompon', 'Hilongos'],
      },
      {
        name: 'Southern Leyte',
        cities: ['Maasin City', 'Sogod', 'Liloan', 'Hinunangan', 'Malitbog', 'Padre Burgos'],
      },
      {
        name: 'Samar (Western Samar)',
        cities: ['Catbalogan City', 'Calbayog City', 'Basey', 'Gandara', 'Paranas', 'Marabut'],
      },
      {
        name: 'Eastern Samar',
        cities: ['Borongan City', 'Guiuan', 'Dolores', 'Oras', 'Balangiga', 'Salcedo'],
      },
      {
        name: 'Northern Samar',
        cities: ['Catarman', 'Allen', 'Laoang', 'Lavezares', 'Palapag', 'Bobon'],
      },
      {
        name: 'Biliran',
        cities: ['Naval', 'Almeria', 'Biliran', 'Cabucgayan', 'Caibiran', 'Kawayan'],
      },
    ],
  },
  {
    regionId: 'region9',
    regionCode: 'Region IX',
    regionName: 'Zamboanga Peninsula (Region IX)',
    islandGroup: 'Mindanao',
    defaultTransit: '5 - 8 Days',
    defaultFee: 145,
    provinces: [
      {
        name: 'Zamboanga del Sur',
        cities: ['Zamboanga City', 'Pagadian City', 'Molave', 'Aurora', 'Dumalinao', 'Tukuran'],
      },
      {
        name: 'Zamboanga del Norte',
        cities: ['Dipolog City', 'Dapitan City', 'Sindangan', 'Polanco', 'Liloy', 'Labason'],
      },
      {
        name: 'Zamboanga Sibugay',
        cities: ['Ipil', 'Kabasalan', 'Imelda', 'Buug', 'Titay', 'Diplahan'],
      },
    ],
  },
  {
    regionId: 'region10',
    regionCode: 'Region X',
    regionName: 'Northern Mindanao (Region X)',
    islandGroup: 'Mindanao',
    defaultTransit: '5 - 8 Days',
    defaultFee: 145,
    provinces: [
      {
        name: 'Misamis Oriental',
        cities: ['Cagayan de Oro City', 'Gingoog City', 'El Salvador City', 'Opol', 'Tagoloan', 'Villanueva', 'Jasaan', 'Balingasag'],
      },
      {
        name: 'Misamis Occidental',
        cities: ['Ozamiz City', 'Oroquieta City', 'Tangub City', 'Calamba (Misamis)', 'Jimenez', 'Plaridel'],
      },
      {
        name: 'Bukidnon',
        cities: ['Malaybalay City', 'Valencia City', 'Manolo Fortich', 'Maramag', 'Quezon (Bukidnon)', 'Don Carlos', 'Impasugong'],
      },
      {
        name: 'Lanao del Norte',
        cities: ['Iligan City', 'Tubod', 'Lala', 'Kapatagan', 'Bacolod (Lanao)', 'Baroy'],
      },
      {
        name: 'Camiguin',
        cities: ['Mambajao', 'Catarman (Camiguin)', 'Mahinog', 'Sagay (Camiguin)', 'Guinsiliban'],
      },
    ],
  },
  {
    regionId: 'region11',
    regionCode: 'Region XI',
    regionName: 'Davao Region (Region XI)',
    islandGroup: 'Mindanao',
    defaultTransit: '5 - 8 Days',
    defaultFee: 145,
    provinces: [
      {
        name: 'Davao del Sur',
        cities: ['Davao City', 'Digos City', 'Bansalan', 'Hagonoy', 'Matanao', 'Padada', 'Santa Cruz (Davao)'],
      },
      {
        name: 'Davao del Norte',
        cities: ['Tagum City', 'Panabo City', 'Samal City (IGACOS)', 'Carmen (Davao)', 'Kapalong', 'Santo Tomas (Davao)'],
      },
      {
        name: 'Davao de Oro',
        cities: ['Nabunturan', 'Monkayo', 'Compostela', 'Pantukan', 'Maco', 'Mawab', 'Maragusan'],
      },
      {
        name: 'Davao Oriental',
        cities: ['Mati City', 'Lupon', 'Baganga', 'Cateel', 'Banaybanay', 'Governor Generoso'],
      },
      {
        name: 'Davao Occidental',
        cities: ['Malita', 'Santa Maria (Davao)', 'Jose Abad Santos', 'Don Marcelino', 'Sarangani'],
      },
    ],
  },
  {
    regionId: 'region12',
    regionCode: 'Region XII',
    regionName: 'SOCCSKSARGEN (Region XII)',
    islandGroup: 'Mindanao',
    defaultTransit: '5 - 8 Days',
    defaultFee: 145,
    provinces: [
      {
        name: 'South Cotabato',
        cities: ['General Santos City', 'Koronadal City', 'Polomolok', 'Tupi', 'Surallah', 'Lake Sebu', 'Norala'],
      },
      {
        name: 'Cotabato (North Cotabato)',
        cities: ['Kidapawan City', 'Midsayap', 'Kabacan', 'M’lang', 'Makilala', 'Pigcawayan', 'Carmen (Cotabato)'],
      },
      {
        name: 'Sultan Kudarat',
        cities: ['Tacurong City', 'Isulan', 'Lebak', 'Kalamansig', 'Esperanza', 'Lambayong'],
      },
      {
        name: 'Sarangani',
        cities: ['Alabel', 'Glan', 'Malungon', 'Maasim', 'Kiamba', 'Maitum', 'Malapatan'],
      },
    ],
  },
  {
    regionId: 'region13',
    regionCode: 'Region XIII',
    regionName: 'Caraga (Region XIII)',
    islandGroup: 'Mindanao',
    defaultTransit: '5 - 8 Days',
    defaultFee: 145,
    provinces: [
      {
        name: 'Agusan del Norte',
        cities: ['Butuan City', 'Cabadbaran City', 'Buenavista (Agusan)', 'Nasipit', 'Carmen (Agusan)', 'Santiago'],
      },
      {
        name: 'Agusan del Sur',
        cities: ['Bayugan City', 'Prosperidad', 'San Francisco (Agusan)', 'Bunawan', 'Trento', 'Rosario (Agusan)'],
      },
      {
        name: 'Surigao del Norte',
        cities: ['Surigao City', 'General Luna (Siargao)', 'Dapa', 'Del Carmen', 'Placer', 'Claver', 'Mainit'],
      },
      {
        name: 'Surigao del Sur',
        cities: ['Tandag City', 'Bislig City', 'Hinatuan', 'Cantilan', 'Barobo', 'Lianga', 'Tago'],
      },
      {
        name: 'Dinagat Islands',
        cities: ['San Jose (Dinagat)', 'Basilisa', 'Cagdianao', 'Dinagat', 'Libjo', 'Loreto'],
      },
    ],
  },
  {
    regionId: 'barmm',
    regionCode: 'BARMM',
    regionName: 'Bangsamoro (BARMM)',
    islandGroup: 'Island & Remote Areas',
    defaultTransit: '7 - 12 Days',
    defaultFee: 185,
    provinces: [
      {
        name: 'Maguindanao del Norte',
        cities: ['Cotabato City', 'Datu Odin Sinsuat', 'Sultan Kudarat (Maguindanao)', 'Parang', 'Upi'],
      },
      {
        name: 'Maguindanao del Sur',
        cities: ['Buluan', 'Shariff Aguak', 'Datu Paglas', 'Ampatuan', 'Guindulungan'],
      },
      {
        name: 'Lanao del Sur',
        cities: ['Marawi City', 'Malabang', 'Wao', 'Balabagan', 'Tamparan', 'Saguiaran'],
      },
      {
        name: 'Basilan',
        cities: ['Isabela City', 'Lamitan City', 'Maluso', 'Sumisip', 'Tipo-Tipo', 'Lantawan'],
      },
      {
        name: 'Sulu',
        cities: ['Jolo', 'Patikul', 'Indanan', 'Siasi', 'Parang (Sulu)', 'Talipao'],
      },
      {
        name: 'Tawi-Tawi',
        cities: ['Bongao', 'Panglima Sugala', 'Sitangkai', 'Simunul', 'Sibutu', 'Languyan'],
      },
    ],
  },
];

export const TRANSIT_WINDOW_OPTIONS = [
  'Same Day - Next Day',
  '1 - 2 Days',
  '1 - 3 Days',
  '2 - 4 Days',
  '3 - 5 Days',
  '4 - 6 Days',
  '5 - 8 Days',
  '7 - 12 Days',
];

const CUSTOM_LOCATIONS_STORAGE_KEY = 'mhira_custom_ph_locations_v1';

export const getMergedPhDirectory = () => {
  try {
    const raw = localStorage.getItem(CUSTOM_LOCATIONS_STORAGE_KEY);
    if (!raw) return PH_DIRECTORY;
    const customList = JSON.parse(raw);
    if (!Array.isArray(customList) || customList.length === 0) return PH_DIRECTORY;

    const cloned = JSON.parse(JSON.stringify(PH_DIRECTORY));
    customList.forEach((entry) => {
      const reg = cloned.find((r) => r.regionId === entry.regionId || r.regionName === entry.regionName);
      if (reg) {
        let prov = reg.provinces.find((p) => p.name.toLowerCase() === String(entry.province || '').toLowerCase());
        if (!prov && entry.province) {
          prov = { name: entry.province, cities: [] };
          reg.provinces.push(prov);
        }
        if (prov && entry.city && !prov.cities.some((c) => c.toLowerCase() === entry.city.toLowerCase())) {
          prov.cities.push(entry.city);
        }
      }
    });
    return cloned;
  } catch {
    return PH_DIRECTORY;
  }
};

export const addCustomPhLocation = ({ regionId, regionName, province, city }) => {
  try {
    const raw = localStorage.getItem(CUSTOM_LOCATIONS_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push({
      regionId: regionId || 'region4a',
      regionName: regionName || 'CALABARZON (Region IV-A)',
      province: String(province || '').trim(),
      city: String(city || '').trim(),
      createdAt: Date.now(),
    });
    localStorage.setItem(CUSTOM_LOCATIONS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('ph_locations_updated'));
    return getMergedPhDirectory();
  } catch {
    return PH_DIRECTORY;
  }
};

// Detailed Barangays & Postal Codes for specific cities + automatic nationwide fallback
const SPECIFIC_CITY_BARANGAYS = {
  // Laguna
  'Calamba City': {
    postalCode: '4027',
    barangays: [
      'Uwisan', 'Parian', 'Canlubang', 'Bucal', 'Poblacion', 'Real', 'Halang',
      'Makiling', 'Pansol', 'Turbina', 'Mayapa', 'Banlic', 'batino', 'Barandal',
      'La Mesa', 'Lawa', 'Lecheria', 'Lingga', 'Looc', 'Majada Out', 'Milagrosa',
      'Paciano Rizal', 'Palingon', 'Prinza', 'Punta', 'Sampiruhan', 'San Cristobal',
      'San Jose', 'San Juan', 'Sirang Lupa', 'Sucol', 'Tulo',
    ],
  },
  'Santa Rosa City': {
    postalCode: '4026',
    barangays: [
      'Balibago', 'Don Jose', 'Dila', 'Macabling', 'Tagapo', 'Sinalhan',
      'Malitlit', 'Pulong Santa Cruz', 'Aplaya', 'Caingin', 'Dita', 'Ibaba',
      'Kanluran', 'Labas', 'Malusak', 'Market Area', 'Pooc', 'Santo Domingo',
    ],
  },
  'Biñan City': {
    postalCode: '4024',
    barangays: [
      'San Antonio', 'San Vicente', 'Platero', 'De La Paz', 'Malamig',
      'Canlalay', 'Tubigan', 'Biñan (Poblacion)', 'Bungahan', 'Casile',
      'Dela Paz', 'Ganado', 'Langkiwa', 'Loma', 'Malaban', 'Mampalasan',
      'San Francisco (Halang)', 'San Jose', 'Santo Domingo', 'Santo Niño',
      'Santo Tomas (Calabuso)', 'Soro-Soro', 'Timbao', 'Zapote',
    ],
  },
  'San Pedro City': {
    postalCode: '4023',
    barangays: [
      'San Antonio', 'San Vicente', 'Landayan', 'Nueva', 'Cuyab', 'Pacita 1',
      'Pacita 2', 'Bagong Silang', 'Calendola', 'Chrysanthemum', 'Estrella',
      'G.S.I.S.', 'Laram', 'Maharlika', 'Magsaysay', 'Narra', 'Poblacion',
      'Riverside', 'Rosario', 'Sampaguita Village', 'San Lorenzo', 'San Roque',
      'Santauki', 'United Bayanihan', 'United Better Living',
    ],
  },
  'Cabuyao City': {
    postalCode: '4025',
    barangays: [
      'Sala', 'Niugan', 'Banay-Banay', 'Pulo', 'Mamatid', 'Gulod', 'Baclaran',
      'Banlic', 'Bigaa', 'Butong', 'Casile', 'Diezmo', 'Marinig', 'Pittland',
      'Poblacion Uno', 'Poblacion Dos', 'Poblacion Tres', 'San Isidro',
    ],
  },
  'Los Baños': {
    postalCode: '4030',
    barangays: [
      'Batong Malake', 'College (UPLB)', 'Mayondon', 'San Antonio', 'Tadlac',
      'Bayog', 'Anos', 'Bagong Silang', 'Bambang', 'Baybayin', 'Lalakay',
      'Maahas', 'Malinta', 'Putho-Tuntungin', 'Timugan',
    ],
  },
  'San Pablo City': {
    postalCode: '4000',
    barangays: [
      'Poblacion', 'Concepcion', 'Del Remedio', 'San Crispin', 'San Francisco',
      'San Gabriel', 'San Gregorio', 'San Ignacio', 'San Isidro', 'San Joaquin',
      'San Jose', 'San Juan', 'San Lucas 1', 'San Marcos', 'San Mateo', 'San Nicolas',
      'San Pedro', 'San Rafael', 'San Roque', 'San Vicente', 'Santa Ana', 'Santa Cruz',
    ],
  },
  // Metro Manila
  'Makati City': {
    postalCode: '1200',
    barangays: [
      'Bel-Air', 'Poblacion', 'San Lorenzo', 'Bangkal', 'Pio del Pilar',
      'Guadalupe Nuevo', 'Guadalupe Viejo', 'Legazpi Village', 'Salcedo Village',
      'Dasmariñas', 'Forbes Park', 'Magallanes', 'Olympia', 'Palanan',
      'Pembo', 'Comembo', 'Rizal', 'San Antonio', 'San Isidro', 'Tejeros', 'Urdaneta', 'Valenzuela',
    ],
  },
  'Taguig City': {
    postalCode: '1630',
    barangays: [
      'Fort Bonifacio (BGC)', 'Ususan', 'Tuktukan', 'Pinagsama', 'Western Bicutan',
      'Central Bicutan', 'Lower Bicutan', 'Upper Bicutan', 'Bagumbayan', 'Bambang',
      'Calzada', 'Hagonoy', 'Ibayo-Tipas', 'Ligid-Tipas', 'Maharlika Village',
      'Napindan', 'New Lower Bicutan', 'North Daang Hari', 'North Signal Village',
      'Palingon', 'San Miguel', 'Santa Ana', 'South Daang Hari', 'South Signal Village', 'Wawa',
    ],
  },
  'Quezon City': {
    postalCode: '1100',
    barangays: [
      'Diliman', 'Cubao', 'Batasan Hills', 'Commonwealth', 'Loyola Heights',
      'Fairview', 'Novaliches Proper', 'Bagumbayan', 'Bahay Toro', 'Balingasa',
      'culiat', 'Damayang Lagi', 'Galas', 'Holy Spirit', 'Kamuning', 'Katipunan',
      'Krus Na Ligas', 'La Loma', 'Libis', 'Matandang Balara', 'New Era',
      'Pasong Tamo', 'Payatas', 'Project 4', 'Project 6', 'Project 8',
      'Sacred Heart', 'San Bartolome', 'Santa Mesa Heights', 'Santo Domingo',
      'Sikatuna Village', 'South Triangle', 'Tandang Sora', 'Teachers Village', 'UP Campus', 'White Plains',
    ],
  },
  'Manila City': {
    postalCode: '1000',
    barangays: [
      'Ermita', 'Malate', 'Sampaloc', 'Binondo', 'Santa Cruz', 'Paco',
      'Intramuros', 'Tondo', 'Quiapo', 'San Miguel', 'San Nicolas', 'Pandacan',
      'Port Area', 'San Andres Bukid', 'Santa Ana', 'Santa Mesa',
    ],
  },
  'Pasig City': {
    postalCode: '1600',
    barangays: [
      'Kapitolyo', 'Ortigas Center (San Antonio)', 'San Nicolas', 'Rosario',
      'Ugong', 'Maybunga', 'Bagong Ilog', 'Bagong Katipunan', 'Bambang',
      'Buting', 'Caniogan', 'Dela Paz', 'Kalawaan', 'Manggahan', 'Oranbo',
      'Palatiw', 'Pinagbuhatan', 'Pineda', 'Sagad', 'San Joaquin', 'San Jose',
      'San Miguel', 'Santaolan', 'Santa Cruz', 'Santa Lucia', 'Santo Tomas', 'Sumilang',
    ],
  },
  'Parañaque City': {
    postalCode: '1700',
    barangays: [
      'BF Homes', 'Don Bosco', 'Moonwalk', 'San Antonio', 'Baclaran',
      'Don Galo', 'La Huerta', 'Marcelo Green Village', 'Merville', 'San Dionisio',
      'San Isidro', 'San Martin de Porres', 'Santo Niño', 'Sun Valley', 'Tambo', 'Vitalez',
    ],
  },
  'Mandaluyong City': {
    postalCode: '1550',
    barangays: [
      'Highway Hills', 'Plainview', 'Wack-Wack Greenhills', 'Barangka Drive',
      'Barangka Ilaya', 'Barangka Ibaba', 'Barangka Itaas', 'Hulo', 'Addition Hills',
      'Bagong Silang', 'Buayang Bato', 'Burol', 'Daang Bakal', 'Hagdang Bato',
      'Malamig', 'Mauway', 'Namayan', 'New Zañiga', 'Old Zañiga', 'Pag-asa', 'Pleasant Hills', 'Poblacion',
    ],
  },
  'Pasay City': {
    postalCode: '1300',
    barangays: [
      'Mall of Asia Complex (CBP-1A)', 'Malibay', 'San Isidro', 'San Jose',
      'San Rafael', 'Maricaban', 'San Roque', 'Santa Clara', 'Villamor Airbase',
      'Baclaran Boundary', 'Libertad', 'Pasay Rotonda', 'Pildera', 'Tramo',
    ],
  },
  'Muntinlupa City': {
    postalCode: '1770',
    barangays: [
      'Alabang', 'Ayala Alabang', 'Putatan', 'Poblacion', 'Tunasan',
      'Bayanan', 'Buli', 'Cupang', 'Sucat',
    ],
  },
  'Las Piñas City': {
    postalCode: '1740',
    barangays: [
      'Almanza Uno', 'Almanza Dos', 'BF International Village', 'Daniel Fajardo',
      'Elias Aldana', 'Ilaya', 'Manuyo Uno', 'Manuyo Dos', 'Pamplona Uno',
      'Pamplona Dos', 'Pamplona Tres', 'Pilar', 'Pulang Lupa Uno', 'Pulang Lupa Dos',
      'Talon Uno', 'Talon Dos', 'Talon Tres', 'Talon Kuatro', 'Talon Singko', 'Zapote',
    ],
  },
  'Marikina City': {
    postalCode: '1800',
    barangays: [
      'Barangka', 'Calumpang', 'Concepcion Uno', 'Concepcion Dos', 'Fortune',
      'Industrial Valley Complex', 'Jesus Dela Peña', 'Malanday', 'Marikina Heights',
      'Nangka', 'Parang', 'San Roque', 'Santa Elena', 'Santo Niño', 'Tañong', 'Tumana',
    ],
  },
  'Caloocan City': {
    postalCode: '1400',
    barangays: [
      'Grace Park', 'Monumento', 'Bagong Barrio', 'Bagong Silang', 'Camarin',
      'Deparo', 'Kaybiga', 'Llano', 'Maypajo', 'Sangandaan', 'Talipapa', 'Tala',
    ],
  },
  'Valenzuela City': {
    postalCode: '1440',
    barangays: [
      'Karuhatan', 'Marulas', 'Malinta', 'Maysan', 'Gen. T. de Leon',
      'Dalandanan', 'valenzuela Poblacion', 'Canumay', 'Lawang Bato', 'Paso de Blas', ' Ugong',
    ],
  },
  // Cavite
  'Bacoor City': {
    postalCode: '4102',
    barangays: [
      'Molino I', 'Molino II', 'Molino III', 'Molino IV', 'Molino V', 'Molino VI', 'Molino VII',
      'Panapaan', 'Talaba', 'Habay', 'Zapote', 'Niog', 'Alima', 'Aniban', 'Banalo',
      'Bayanan', 'Daang Bukid', 'Digman', 'Dulong Bayan', 'Kaingin', 'Ligas',
      'Mambog', 'Queens Row Central', 'Queens Row East', 'Queens Row West', 'Real', 'Salinas', 'San Nicolas',
    ],
  },
  'Imus City': {
    postalCode: '4103',
    barangays: [
      'Anabu I', 'Anabu II', 'Bucandala', 'Malagasang', 'Tanzang Luma',
      'Poblacion', 'Alapan', 'Bayan Luma', 'Buhay na Tubig', 'Carsadang Bago',
      'Magdalo', 'Maharlika', 'Medicion', 'Palico', 'Pasong Buaya', 'Pinagbuklod', 'Toclong',
    ],
  },
  'Dasmariñas City': {
    postalCode: '4114',
    barangays: [
      'Salawag', 'Paliparan', 'Langkaan', 'San Jose', 'Sampaloc', 'Burol',
      'Bautista', 'Datu Esmael', 'Emannuel Bergado', 'Fatima', 'Luzviminda',
      'Pag-asa', 'Sabang', 'Salitran', 'San Agustin', 'San Andres', 'San Antonio',
      'San Dionisio', 'San Esteban', 'San Francisco', 'San Isidro Labrador',
      'San Luis', 'San Manuel', 'San Mateo', 'San Miguel', 'San Nicolas', 'San Simon',
      'Santa Cristina', 'Santa Cruz', 'Santa Fe', 'Santa Lucia', 'Santa Maria', 'Santo Cristo', 'Zone I-IV (Poblacion)',
    ],
  },
  'General Trias City': {
    postalCode: '4107',
    barangays: [
      'Manggahan', 'San Francisco', 'Bacao', 'Pasong Camachile', 'Tejero',
      'Alingaro', 'Arnaldo', 'Biclatan', 'Buenavista', 'Corregidor', 'Dulong Bayan',
      'Gov. Ferrer', 'Javalera', 'Navarro', 'Panungyanan', 'Pasong Kawayan', 'Pinagtipunan', 'San Juan', 'Santiago', 'Tapia',
    ],
  },
  'Tagaytay City': {
    postalCode: '4120',
    barangays: [
      'Kaybagal South', 'Kaybagal North', 'Kaybagal Central', 'Mendez Crossing',
      'Silang Junction', 'Maharlika', 'Sungay', 'Asisan', 'Bagong Tubig',
      'Calabuso', 'Dapdap', 'Francisco', 'Guinhawa', 'Iruhin', ' Maitim', 'Neogan', 'Patutong Malaki', 'Sambong', 'San Jose', 'Tolentino',
    ],
  },
  // Batangas
  'Batangas City': {
    postalCode: '4200',
    barangays: [
      'Alangilan', 'Balagtas', 'Kumintang Ilaya', 'Kumintang Ibaba', 'Poblacion',
      'Libjo', 'Bolbok', 'Calicanto', 'Cuta', 'Dalig', 'Gulod Labac', 'Gulod Itaas',
      'Pallocan West', 'Pallocan East', 'Santa Clara', 'Santa Rita', 'Sorosoro', 'Wawa',
    ],
  },
  'Lipa City': {
    postalCode: '4217',
    barangays: [
      'Marawoy', 'Sabang', 'Tambong', 'Banaybanay', 'Lodlod', 'Mataas na Lupa',
      'Antipolo del Norte', 'Ayala', 'Balintawak', 'Bolbok', 'Bugtong na Pulo',
      'Bulacnin', 'Dagatan', 'Inosluban', 'Kayumanggi', 'Lumbang', 'Pinagkawitan',
      'Poblacion', 'San Carlos', 'San Lucas', 'San Sebastian', 'Sico', 'Tambo',
    ],
  },
  // Cebu
  'Cebu City': {
    postalCode: '6000',
    barangays: [
      'Lahug', 'Mabolo', 'Banilad', 'Guadalupe', 'Capitol Site', 'Apas',
      'Basak San Nicolas', 'Basak Pardo', 'Bulacao', 'Busay', 'Camputhaw',
      'Carreta', 'Cogon Pardo', 'Cogon Ramos', 'Day-as', 'Duljo Fatima',
      'Ermita', 'Hipodromo', 'Inayawan', 'IT Park (Apas)', 'Kasambagan',
      'Kinasang-an', 'Labangon', 'Lorega', 'Luz', 'Mambaling', 'Pardo',
      'Pari-an', 'Punta Princesa', 'Sambag I', 'Sambag II', 'San Antonio',
      'San Jose', 'San Nicolas', 'San Roque', 'Santa Cruz', 'Talamban', 'Tinago', 'Tisa', 'Zapatera',
    ],
  },
  // Davao
  'Davao City': {
    postalCode: '8000',
    barangays: [
      'Poblacion', 'Buhangin', 'Talomo', 'Matina Crossing', 'Matina Aplaya',
      'Toril', 'Agdao', 'Bago Aplaya', 'Bago Gallera', 'Baliok', 'Cabantian',
      'Calinan', 'Catalunan Grande', 'Catalunan Pequeño', 'communal', 'Daliao',
      'Dumoy', 'Indangan', 'Lanang', 'Maa', 'Mintal', 'Panacan', 'Pampanga',
      'Sasa', 'Tugbok', 'Ulas',
    ],
  },
};

const PROVINCE_DEFAULT_POSTAL = {
  'Metro Manila': '1000',
  Laguna: '4000',
  Cavite: '4100',
  Batangas: '4200',
  Rizal: '1870',
  Quezon: '4301',
  Bulacan: '3000',
  Pampanga: '2000',
  Tarlac: '2300',
  'Nueva Ecija': '3100',
  Bataan: '2100',
  Zambales: '2200',
  Aurora: '3200',
  Pangasinan: '2400',
  'La Union': '2500',
  'Ilocos Sur': '2700',
  'Ilocos Norte': '2900',
  Benguet: '2600',
  Cagayan: '3500',
  Isabela: '3300',
  Albay: '4500',
  'Camarines Sur': '4400',
  Palawan: '5300',
  Cebu: '6000',
  Bohol: '6300',
  Iloilo: '5000',
  'Negros Occidental': '6100',
  'Negros Oriental': '6200',
  Aklan: '5600',
  Leyte: '6500',
  'Davao del Sur': '8000',
  'Davao del Norte': '8100',
  'Misamis Oriental': '9000',
  'South Cotabato': '9500',
  'Zamboanga del Sur': '7000',
};

const DEFAULT_BARANGAY_LIST = [
  'Poblacion',
  'Poblacion Uno',
  'Poblacion Dos',
  'San Isidro',
  'San Jose',
  'San Roque',
  'San Antonio',
  'San Vicente',
  'San Juan',
  'San Miguel',
  'San Nicolas',
  'San Pedro',
  'Santa Cruz',
  'Santa Maria',
  'Santa Rosa',
  'Santo Niño',
  'Santo Domingo',
  'Bagong Silang',
  'Bagumbayan',
  'Barangay 1 (Central)',
  'Barangay 2',
  'Barangay 3',
  'Buenavista',
  'Concepcion',
  'Del Pilar',
  'Dela Paz',
  'Fatima',
  'Guadalupe',
  'Mabini',
  'Magsaysay',
  'Maharlika',
  'Maligaya',
  'Pag-asa',
  'Rizal',
];

export const getCityDetailsForCustomer = (provinceName, cityName) => {
  if (SPECIFIC_CITY_BARANGAYS[cityName]) {
    return SPECIFIC_CITY_BARANGAYS[cityName];
  }
  return {
    postalCode: PROVINCE_DEFAULT_POSTAL[provinceName] || '4000',
    barangays: DEFAULT_BARANGAY_LIST,
  };
};

export const findRegionByProvinceName = (provinceName, directory = PH_DIRECTORY) => {
  if (!provinceName) return directory[0];
  const target = String(provinceName).toLowerCase();
  for (const reg of directory) {
    if ((reg.provinces || []).some((p) => p.name.toLowerCase() === target)) {
      return reg;
    }
  }
  return directory[0];
};


