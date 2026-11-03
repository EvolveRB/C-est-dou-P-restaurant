export const CATEGORIES = [
  { id: 'todos', name: 'Todos' },
  { id: 'entradas', name: 'Entradas' },
  { id: 'sopas', name: 'Sopas' },
  { id: 'carnes', name: 'Carnes' },
  { id: 'pastas', name: 'Pastas' },
  { id: 'postres', name: 'Postres' },
  { id: 'bebidas', name: 'Bebidas' }
];

export const INITIAL_PRODUCTS = [
  {
    id: 1,
    nombre: "Plato Principal Alpha",
    categoria: "carnes",
    precio: 12500,
    descripcion: "Descripción breve de los ingredientes seleccionados y guarnición de autor.",
    tiempo: 20,
    disponible: true,
    destacado: true,
    imagen: "plato_alpha.jpg",
    etiquetas: ["Especialidad", "Sin Gluten"]
  },
  {
    id: 2,
    nombre: "Entrada Especial Beta",
    categoria: "entradas",
    precio: 8000,
    descripcion: "Porción individual ideal para comenzar, con toque de finas hierbas y aderezo.",
    tiempo: 10,
    disponible: true,
    destacado: true,
    imagen: "entrada_beta.jpg",
    etiquetas: ["Vegetariano", "Ligero"]
  },
  {
    id: 3,
    nombre: "Sopa Tradicional Gamma",
    categoria: "sopas",
    precio: 9500,
    descripcion: "Receta de la casa servida caliente con croutons dorados y queso gratinado.",
    tiempo: 15,
    disponible: true,
    destacado: false,
    imagen: "sopa_gamma.jpg",
    etiquetas: ["Casero", "Caliente"]
  },
  {
    id: 4,
    nombre: "Corte de Carne Delta",
    categoria: "carnes",
    precio: 18000,
    descripcion: "Acompañado de papas rústicas al romero y suave reducción de vino tinto.",
    tiempo: 25,
    disponible: true,
    destacado: true,
    imagen: "corte_delta.jpg",
    etiquetas: ["Chef Choice", "Premium"]
  },
  {
    id: 5,
    nombre: "Pasta Artesanal Epsilon",
    categoria: "pastas",
    precio: 14000,
    descripcion: "Salsa marinara clásica con albahaca fresca cosechada y parmesano reggiano.",
    tiempo: 18,
    disponible: true,
    destacado: true,
    imagen: "pasta_epsilon.jpg",
    etiquetas: ["Vegetariano", "Artesanal"]
  },
  {
    id: 6,
    nombre: "Postre Tentación Zeta",
    categoria: "postres",
    precio: 6500,
    descripcion: "Bizcocho húmedo con relleno de crema suave y coulis de frutos rojos silvestres.",
    tiempo: 8,
    disponible: true,
    destacado: true,
    imagen: "postreUV.jpeg",
    etiquetas: ["Dulce", "Sin TACC"]
  },
  {
    id: 7,
    nombre: "Carpaccio de Res Trufado",
    categoria: "entradas",
    precio: 11500,
    descripcion: "Finas láminas de filete con alcaparras crocantes, rúcula y aceite de trufa blanca.",
    tiempo: 12,
    disponible: true,
    destacado: false,
    imagen: "carpaccio_trufado.jpg",
    etiquetas: ["Gourmet", "Sin Gluten"]
  },
  {
    id: 8,
    nombre: "Bisque de Mariscos del Puerto",
    categoria: "sopas",
    precio: 13500,
    descripcion: "Crema aterciopelada a base de langostinos, coñac y un toque de crema fresca.",
    tiempo: 15,
    disponible: true,
    destacado: false,
    imagen: "bisque_mariscos.jpg",
    etiquetas: ["Mariscos", "Especialidad"]
  },
  {
    id: 9,
    nombre: "Ravioles de Ricotta y Nueces",
    categoria: "pastas",
    precio: 15500,
    descripcion: "Masa hecha a mano bañada en mantequilla de salvia y lluvia de nueces tostadas.",
    tiempo: 18,
    disponible: true,
    destacado: false,
    imagen: "ravioles_ricotta.jpg",
    etiquetas: ["Vegetariano", "Casero"]
  },
  {
    id: 10,
    nombre: "Limonada Menta Jengibre",
    categoria: "bebidas",
    precio: 4200,
    descripcion: "Zumo natural de limones sutiles con menta recién machacada y jarabe de jengibre.",
    tiempo: 5,
    disponible: true,
    destacado: false,
    imagen: "limonada_menta.jpg",
    etiquetas: ["Vegano", "Natural"]
  },
  {
    id: 11,
    nombre: "Copa de Vino Reserva Syrah",
    categoria: "bebidas",
    precio: 5500,
    descripcion: "Vino del Valle de Colchagua, notas a frutos negros maduros y roble tostado.",
    tiempo: 3,
    disponible: true,
    destacado: false,
    imagen: "vino_reserva.jpg",
    etiquetas: ["18+", "Reserva"]
  }
];

export const formatPrice = (price) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(price).replace('CLP', '$').trim();
};
