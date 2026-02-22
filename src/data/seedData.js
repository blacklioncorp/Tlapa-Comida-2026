// Seed Data for Tlapa Comida

export const CATEGORIES = [
    { id: 'cat-1', name: 'Pizza', label: 'Pizza', icon: '🍕', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500' },
    { id: 'cat-2', name: 'Hamburguesas', label: 'Hamburguesas', icon: '🍔', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500' },
    { id: 'cat-3', name: 'Tacos', label: 'Tacos', icon: '🌮', image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500' },
    { id: 'cat-4', name: 'Sushi', label: 'Sushi', icon: '🍣', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500' },
    { id: 'cat-5', name: 'Bebidas', label: 'Bebidas', icon: '🥤', image: 'https://images.unsplash.com/photo-1544145945-f904253d0c71?w=500' },
    { id: 'cat-6', name: 'Postres', label: 'Postres', icon: '🍰', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500' },
    { id: 'cat-7', name: 'Comida Mexicana', label: 'Comida Mexicana', icon: '🇲🇽', image: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=500' },
    { id: 'cat-8', name: 'Pollo', label: 'Pollo', icon: '🍗', image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500' },
];

export const MERCHANTS = [
    {
        id: 'merchant-1',
        name: 'La Terraza',
        description: 'Cocina internacional con los mejores ingredientes de la región',
        category: 'cat-1',
        rating: 4.8,
        reviews: 124,
        totalOrders: 1850,
        deliveryTime: '20-30',
        deliveryFee: 25,
        minOrder: 100,
        commissionRate: 0.15,
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
        bannerUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
        logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
        isOpen: true,
        address: {
            street: 'Calle Juárez #10, Centro',
            colony: 'Centro',
        },
        coordinates: { lat: 17.5512, lng: -98.5756 },
        menu: [
            {
                id: 'item-1',
                name: 'Pizza Pepperoni',
                description: 'Masa artesanal con pepperoni premium y queso mozzarella',
                price: 180,
                category: 'Pizzas',
                image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500',
                isAvailable: true,
                baseIngredients: ['Salsa de tomate', 'Mozzarella', 'Pepperoni'],
                modifierGroups: [
                    {
                        id: 'mg-pizza-size-1',
                        name: 'Tamaño',
                        required: true,
                        multiSelect: false,
                        minSelect: 1,
                        maxSelect: 1,
                        options: [
                            { id: 'opt-sm', name: 'Personal', price: 0 },
                            { id: 'opt-md', name: 'Mediana', price: 40 },
                            { id: 'opt-lg', name: 'Grande', price: 80 },
                        ]
                    },
                    {
                        id: 'mg-pizza-ex-1',
                        name: 'Extras',
                        required: false,
                        multiSelect: true,
                        minSelect: 0,
                        maxSelect: 5,
                        options: [
                            { id: 'extra-1', name: 'Doble queso', price: 30 },
                            { id: 'extra-2', name: 'Jalapeños', price: 15 },
                            { id: 'extra-3', name: 'Champiñones', price: 25 },
                        ],
                    },
                ],
                // Legacy format kept for backward compatibility
                extras: [
                    { id: 'extra-1', name: 'Doble queso', price: 30 },
                    { id: 'extra-2', name: 'Jalapeños', price: 15 },
                    { id: 'extra-3', name: 'Champiñones', price: 25 },
                ],
            },
            {
                id: 'item-2',
                name: 'Pizza Hawaiana',
                description: 'Piña miel, jamón ahumado y extra queso mozzarella',
                price: 165,
                category: 'Pizzas',
                image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500',
                isAvailable: true,
                baseIngredients: ['Salsa de tomate', 'Mozzarella', 'Piña', 'Jamón'],
                modifierGroups: [
                    {
                        id: 'mg-pizza-size-2',
                        name: 'Tamaño',
                        required: true,
                        multiSelect: false,
                        minSelect: 1,
                        maxSelect: 1,
                        options: [
                            { id: 'opt-sm', name: 'Personal', price: 0 },
                            { id: 'opt-md', name: 'Mediana', price: 40 },
                            { id: 'opt-lg', name: 'Grande', price: 80 },
                        ]
                    },
                    {
                        id: 'mg-pizza-ex-2',
                        name: 'Extras',
                        required: false,
                        multiSelect: true,
                        minSelect: 0,
                        maxSelect: 3,
                        options: [
                            { id: 'extra-1', name: 'Doble queso', price: 30 },
                        ],
                    },
                ],
                extras: [
                    { id: 'extra-1', name: 'Doble queso', price: 30 },
                ],
            },
            {
                id: 'item-3',
                name: 'Pasta Alfredo',
                description: 'Fettuccine cremoso con salsa alfredo y parmesano',
                price: 155,
                category: 'Pastas',
                image: 'https://images.unsplash.com/photo-1645112411341-6c4fd023882a?w=500',
                isAvailable: true,
                baseIngredients: ['Pasta', 'Crema', 'Parmesano'],
                modifierGroups: [],
                extras: [],
            },
            {
                id: 'item-4',
                name: 'Ensalada César',
                description: 'Lechuga romana, crutones, parmesano y aderezo césar',
                price: 95,
                category: 'Ensaladas',
                image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=500',
                isAvailable: true,
                baseIngredients: ['Lechuga', 'Crutones', 'Parmesano', 'Aderezo césar'],
                modifierGroups: [
                    {
                        id: 'mg-ensalada-prot',
                        name: 'Proteína',
                        required: false,
                        multiSelect: false,
                        minSelect: 0,
                        maxSelect: 1,
                        options: [
                            { id: 'extra-4', name: 'Pollo grillé', price: 40 },
                            { id: 'opt-camaron', name: 'Camarón', price: 55 },
                        ]
                    },
                ],
                extras: [
                    { id: 'extra-4', name: 'Pollo grillé', price: 40 },
                ],
            },
            {
                id: 'item-5',
                name: 'Limonada Natural',
                description: 'Limonada fresca con hierbabuena',
                price: 35,
                category: 'Bebidas',
                image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=500',
                isAvailable: true,
                baseIngredients: [],
                modifierGroups: [],
                extras: [],
            },
        ],
    },
    {
        id: 'merchant-2',
        name: 'Burguer King Tlapa',
        description: 'Las mejores hamburguesas artesanales de Tlapa',
        category: 'cat-2',
        rating: 4.5,
        reviews: 89,
        totalOrders: 1230,
        deliveryTime: '25-40',
        deliveryFee: 30,
        minOrder: 120,
        commissionRate: 0.12,
        image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800',
        bannerUrl: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800',
        logoUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=200',
        isOpen: true,
        address: {
            street: 'Av. Morelos #45, San Francisco',
            colony: 'San Francisco',
        },
        coordinates: { lat: 17.5545, lng: -98.5789 },
        menu: [
            {
                id: 'item-6',
                name: 'Hamburguesa Clásica',
                description: 'Carne angus, lechuga, tomate, cebolla y salsa especial',
                price: 120,
                category: 'Hamburguesas',
                image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
                isAvailable: true,
                baseIngredients: ['Lechuga', 'Tomate', 'Cebolla', 'Salsa especial'],
                modifierGroups: [
                    {
                        id: 'mg-term-6',
                        name: 'Término de la carne',
                        required: true,
                        multiSelect: false,
                        minSelect: 1,
                        maxSelect: 1,
                        options: [
                            { id: 'opt-medio', name: 'Medio', price: 0 },
                            { id: 'opt-3cuartos', name: 'Tres cuartos', price: 0 },
                            { id: 'opt-bien', name: 'Bien cocido', price: 0 },
                        ]
                    },
                    {
                        id: 'mg-extras-6',
                        name: 'Extras',
                        required: false,
                        multiSelect: true,
                        minSelect: 0,
                        maxSelect: 5,
                        options: [
                            { id: 'extra-5', name: 'Tocino extra', price: 25 },
                            { id: 'extra-6', name: 'Queso cheddar', price: 15 },
                            { id: 'opt-doble', name: 'Doble carne', price: 45 },
                        ],
                    },
                ],
                extras: [
                    { id: 'extra-5', name: 'Tocino extra', price: 25 },
                    { id: 'extra-6', name: 'Queso cheddar', price: 15 },
                ],
            },
            {
                id: 'item-7',
                name: 'Hamburguesa BBQ',
                description: 'Doble carne, salsa BBQ, aros de cebolla y queso gouda',
                price: 165,
                category: 'Hamburguesas',
                image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500',
                isAvailable: true,
                baseIngredients: ['Salsa BBQ', 'Aros de cebolla', 'Queso gouda'],
                modifierGroups: [
                    {
                        id: 'mg-term-7',
                        name: 'Término de la carne',
                        required: true,
                        multiSelect: false,
                        minSelect: 1,
                        maxSelect: 1,
                        options: [
                            { id: 'opt-medio', name: 'Medio', price: 0 },
                            { id: 'opt-3cuartos', name: 'Tres cuartos', price: 0 },
                            { id: 'opt-bien', name: 'Bien cocido', price: 0 },
                        ]
                    },
                    {
                        id: 'mg-extras-7',
                        name: 'Extras',
                        required: false,
                        multiSelect: true,
                        minSelect: 0,
                        maxSelect: 3,
                        options: [
                            { id: 'extra-5', name: 'Tocino extra', price: 25 },
                        ],
                    },
                ],
                extras: [
                    { id: 'extra-5', name: 'Tocino extra', price: 25 },
                ],
            },
            {
                id: 'item-8',
                name: 'Papas Francesas',
                description: 'Crujientes papas con sal y ketchup',
                price: 55,
                category: 'Acompañamientos',
                image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500',
                isAvailable: true,
                baseIngredients: [],
                modifierGroups: [],
                extras: [],
            },
            {
                id: 'item-9',
                name: 'Malteada de Chocolate',
                description: 'Cremosa malteada de chocolate con crema batida',
                price: 65,
                category: 'Bebidas',
                image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500',
                isAvailable: true,
                baseIngredients: [],
                modifierGroups: [],
                extras: [],
            },
        ],
    },
    {
        id: 'merchant-3',
        name: 'Tacos "El Paisa"',
        description: 'Auténticos tacos al pastor y de suadero',
        category: 'cat-3',
        rating: 4.9,
        reviews: 256,
        totalOrders: 3420,
        deliveryTime: '15-25',
        deliveryFee: 15,
        minOrder: 50,
        commissionRate: 0.10,
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        bannerUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        logoUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200',
        isOpen: true,
        address: {
            street: 'Calle Mina #5, Centro',
            colony: 'Centro',
        },
        coordinates: { lat: 17.5501, lng: -98.5742 },
        menu: [
            {
                id: 'item-10',
                name: 'Tacos al Pastor (5 pzas)',
                description: 'Trompo de cerdo marinado, piña, cebolla y cilantro',
                price: 85,
                category: 'Tacos',
                image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500',
                isAvailable: true,
                baseIngredients: ['Piña', 'Cebolla', 'Cilantro', 'Salsa verde'],
                modifierGroups: [
                    {
                        id: 'mg-tortilla-10',
                        name: 'Tipo de tortilla',
                        required: true,
                        multiSelect: false,
                        minSelect: 1,
                        maxSelect: 1,
                        options: [
                            { id: 'opt-maiz', name: 'Maíz', price: 0 },
                            { id: 'opt-harina', name: 'Harina', price: 5 },
                        ]
                    },
                    {
                        id: 'mg-salsa-10',
                        name: 'Salsa',
                        required: false,
                        multiSelect: true,
                        minSelect: 0,
                        maxSelect: 3,
                        options: [
                            { id: 'extra-7', name: 'Salsa extra', price: 5 },
                            { id: 'extra-8', name: 'Guacamole', price: 20 },
                        ],
                    },
                ],
                extras: [
                    { id: 'extra-7', name: 'Salsa extra', price: 5 },
                    { id: 'extra-8', name: 'Guacamole', price: 20 },
                ],
            },
            {
                id: 'item-11',
                name: 'Tacos de Suadero (5 pzas)',
                description: 'Suadero jugoso con limón, cebolla y cilantro',
                price: 90,
                category: 'Tacos',
                image: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=500',
                isAvailable: true,
                baseIngredients: ['Cebolla', 'Cilantro', 'Limón'],
                modifierGroups: [
                    {
                        id: 'mg-tortilla-11',
                        name: 'Tipo de tortilla',
                        required: true,
                        multiSelect: false,
                        minSelect: 1,
                        maxSelect: 1,
                        options: [
                            { id: 'opt-maiz', name: 'Maíz', price: 0 },
                            { id: 'opt-harina', name: 'Harina', price: 5 },
                        ]
                    },
                    {
                        id: 'mg-salsa-11',
                        name: 'Salsa',
                        required: false,
                        multiSelect: true,
                        minSelect: 0,
                        maxSelect: 2,
                        options: [
                            { id: 'extra-7', name: 'Salsa extra', price: 5 },
                        ],
                    },
                ],
                extras: [
                    { id: 'extra-7', name: 'Salsa extra', price: 5 },
                ],
            },
            {
                id: 'item-12',
                name: 'Quesadilla de Queso',
                description: 'Tortilla de maíz con queso Oaxaca derretido',
                price: 35,
                category: 'Antojitos',
                image: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=500',
                isAvailable: true,
                baseIngredients: ['Queso Oaxaca'],
                modifierGroups: [
                    {
                        id: 'mg-rell-12',
                        name: 'Relleno extra',
                        required: false,
                        multiSelect: false,
                        minSelect: 0,
                        maxSelect: 1,
                        options: [
                            { id: 'extra-9', name: 'Con picadillo', price: 15 },
                            { id: 'extra-10', name: 'Con chicharrón', price: 15 },
                            { id: 'opt-flor', name: 'Con flor de calabaza', price: 15 },
                        ]
                    },
                ],
                extras: [
                    { id: 'extra-9', name: 'Con picadillo', price: 15 },
                    { id: 'extra-10', name: 'Con chicharrón', price: 15 },
                ],
            },
            {
                id: 'item-13',
                name: 'Agua de Horchata (1L)',
                description: 'Refrescante agua de horchata con canela',
                price: 30,
                category: 'Bebidas',
                image: 'https://images.unsplash.com/photo-1544145945-f904253d0c71?w=500',
                isAvailable: true,
                baseIngredients: [],
                modifierGroups: [],
                extras: [],
            },
        ],
    },
];

// ORDER_STATUSES — updated to match FSM
export const ORDER_STATUSES = {
    created: { id: 'created', label: 'Pedido creado', icon: '📋', color: 'info', step: 0 },
    confirmed: { id: 'confirmed', label: 'Confirmado', icon: '✅', color: 'info', step: 1 },
    preparing: { id: 'preparing', label: 'Preparando', icon: '👨‍🍳', color: 'primary', step: 2 },
    ready: { id: 'ready', label: 'Listo para envío', icon: '📦', color: 'success', step: 3 },
    searching_driver: { id: 'searching_driver', label: 'Buscando repartidor', icon: '🔍', color: 'warning', step: 4 },
    picked_up: { id: 'picked_up', label: 'Recogido', icon: '🛵', color: 'primary', step: 5 },
    on_the_way: { id: 'on_the_way', label: 'En camino', icon: '🚀', color: 'primary', step: 6 },
    delivered: { id: 'delivered', label: 'Entregado', icon: '🎉', color: 'success', step: 7 },
    cancelled: { id: 'cancelled', label: 'Cancelado', icon: '❌', color: 'error', step: -1 },
    // Legacy statuses (backward compatibility)
    paid: { id: 'paid', label: 'Pagado', icon: '💳', color: 'info', step: 0 },
    pending: { id: 'pending', label: 'Pendiente', icon: '⏳', color: 'warning', step: 0 },
    accepted: { id: 'accepted', label: 'Aceptado', icon: '👍', color: 'info', step: 1 },
};

export const ALL_USERS = [
    {
        id: 'user-admin',
        email: 'admin@tlapacomida.mx',
        displayName: 'Administrador',
        role: 'admin',
        phone: '7571234567',
        avatarUrl: '',
        trustScore: 100,
        savedAddresses: [],
    },
    {
        id: 'user-merchant-1',
        email: 'terraza@tlapacomida.mx',
        displayName: 'La Terraza',
        role: 'merchant',
        merchantId: 'merchant-1',
        phone: '7577654321',
        avatarUrl: '',
        trustScore: 100,
        savedAddresses: [],
    },
    {
        id: 'user-merchant-2',
        email: 'nai@tlapacomida.mx',
        displayName: 'Naí Cocina',
        role: 'merchant',
        merchantId: 'merchant-2',
        phone: '7577654322',
        avatarUrl: '',
        trustScore: 100,
        savedAddresses: [],
    },
    {
        id: 'user-merchant-3',
        email: 'carbon@tlapacomida.mx',
        displayName: 'Carbón & Brasas',
        role: 'merchant',
        merchantId: 'merchant-3',
        phone: '7577654323',
        avatarUrl: '',
        trustScore: 100,
        savedAddresses: [],
    },
    {
        id: 'user-driver-1',
        email: 'carlos@tlapacomida.mx',
        displayName: 'Carlos M.',
        role: 'driver',
        phone: '7572345678',
        avatarUrl: '',
        vehicleType: 'moto',
        trustScore: 85,
        location: { lat: 17.5490, lng: -98.5750 },
        savedAddresses: [],
    },
    {
        id: 'user-driver-2',
        email: 'jose@tlapacomida.mx',
        displayName: 'José López',
        role: 'driver',
        phone: '7572345679',
        avatarUrl: '',
        vehicleType: 'moto',
        trustScore: 90,
        location: { lat: 17.5520, lng: -98.5780 },
        savedAddresses: [],
    },
    {
        id: 'user-driver-3',
        email: 'ana@tlapacomida.mx',
        displayName: 'Ana García',
        role: 'driver',
        phone: '7572345680',
        avatarUrl: '',
        vehicleType: 'bici',
        trustScore: 75,
        location: { lat: 17.5505, lng: -98.5760 },
        savedAddresses: [],
    },
    {
        id: 'user-client-1',
        email: 'maria@ejemplo.com',
        displayName: 'María Pérez',
        role: 'client',
        phone: '7573456789',
        avatarUrl: '',
        trustScore: 50,
        completedOrders: 0,
        savedAddresses: [
            {
                id: 'addr-1',
                label: 'Casa',
                street: 'Calle Hidalgo #5',
                colony: 'Centro',
                reference: 'Casa blanca con portón azul, junto a la papelería',
                coordinates: { lat: 17.5510, lng: -98.5748, accuracy: 'manual_pin' },
                phone: '7573456789',
            }
        ],
    },
];

export const SAMPLE_USERS = {
    admin: ALL_USERS.find(u => u.role === 'admin'),
    merchant: ALL_USERS.find(u => u.role === 'merchant'),
    driver: ALL_USERS.find(u => u.role === 'driver'),
    client: ALL_USERS.find(u => u.role === 'client'),
};

export const PROMOTIONS = [
    {
        id: 'promo-1',
        code: 'TLAPA20',
        description: '20% de descuento en tu primer pedido',
        discount: 0.20,
        type: 'percentage',
        minOrder: 100,
        maxDiscount: 50,
        isActive: true,
    },
    {
        id: 'promo-2',
        code: 'ENVIO50',
        description: '50% de descuento en envío',
        discount: 0.50,
        type: 'delivery',
        minOrder: 80,
        maxDiscount: 25,
        isActive: true,
    },
];

// Functions to handle data persistence in localStorage (until we fully migrate to Firestore)
export const getMerchants = () => {
    try {
        const saved = localStorage.getItem('tlapa_merchants');
        const parsed = saved ? JSON.parse(saved) : null;
        return Array.isArray(parsed) ? parsed : MERCHANTS;
    } catch (e) {
        console.warn('Failed to load merchants from storage', e);
        return MERCHANTS;
    }
};

export const saveMerchants = (merchants) => {
    localStorage.setItem('tlapa_merchants', JSON.stringify(merchants));
};

export const getCategories = () => {
    try {
        const saved = localStorage.getItem('tlapa_categories');
        const parsed = saved ? JSON.parse(saved) : null;
        return Array.isArray(parsed) ? parsed : CATEGORIES;
    } catch (e) {
        console.warn('Failed to load categories from storage', e);
        return CATEGORIES;
    }
};

export const saveCategories = (categories) => {
    localStorage.setItem('tlapa_categories', JSON.stringify(categories));
};
