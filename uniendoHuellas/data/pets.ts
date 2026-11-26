export interface Pet {
  id: string;
  name: string;
  species: 'perros' | 'gatos' | 'otros';
  breed: string;
  age: string;
  ageCategory: 'cachorro' | 'joven' | 'adulto' | 'senior';
  gender: 'Macho' | 'Hembra' | 'Pareja';
  size: 'Pequeño' | 'Mediano' | 'Grande' | string;
  energy: 'Baja' | 'Moderada' | 'Alta' | 'Sin confirmar';
  location: string;
  locationCity: string;
  adoptionStatus?: string;
  shelter: string;
  shelterContact?: {
    email: string;
    phone: string;
    address: string;
    hours: string;
  };
  tags: string[];
  urgent: boolean;
  urgencyTag?: string;
  description: string;
  story?: string;
  vaccinated: boolean | null;
  sterilized: boolean | null;
  dewormed: boolean | null;
  images: string[];
}

export const PETS_DATA: Pet[] = [
  {
    id: 'milo',
    name: 'Milo',
    species: 'perros',
    breed: 'Mestizo amoroso',
    age: '2 años (2a 3m)',
    ageCategory: 'joven',
    gender: 'Macho',
    size: 'Medio (14 kg)',
    energy: 'Moderada',
    location: 'Ciudad de México',
    locationCity: 'cdmx',
    shelter: 'Refugio Esperanza Verde',
    shelterContact: {
      email: 'contacto@esperanzaverde.org',
      phone: '+56 9 8456 2210',
      address: 'Camino El Olivar 420, Buin, Región Metropolitana',
      hours: 'Mar a Dom: 10:30 - 17:30 hrs (previa cita)',
    },
    tags: ['Sociable', 'Cariñoso', 'Esterilizado', 'Apto con niños'],
    urgent: false,
    description: 'Milo adora las caminatas suaves y descansar cerca de ti mientras lees. Sociable con niños y otros perros.',
    story: 'Milo fue rescatado de una zona periurbana donde vagaba pacientemente en busca de afecto. A pesar de haber experimentado el desamparo, su temperamento conserva una ternura inquebrantable y una disposición espontánea a confiar en las personas. Es un compañero equilibrado: adora los paseos matinales con correa, explorar aromas con tranquilidad y acomodarse a los pies del sofá durante las tardes de lectura o trabajo remoto.',
    vaccinated: true,
    sterilized: true,
    dewormed: true,
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBKvJ_nKFLQLeODel4KOsHiqdC5cKggfmX3TAS6w5XIQ5XLt7j7DZqrIYJT8icKS-YaoZ0zWK3M3TnPIFbXVZ65RszVJn-1GwD51h7_z3YynrMk5uu1KjKOd3Tlo_UJaTr4tSwo-KpBhpBwSF0mfvYBsY7fdnXUoHGTu_Jb0_IZhf3o1dA7za7D3ZTInIjF-fpGRnJoKFpsOCCX5LIZImfNXmlhdE9UPNfuNGbkP9E3v-Dq2cIuWhGa',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC6Aj_CiLP8B_GhBqAaZ5MWSKoK0d16ZgiLDoM3LhAI0UHnzhknJoe-ST_0p5yRbBnjBszkisOHPtq_65KD5kKj6Pume0okvfV5At36AyapfKukVYOF2VTEeN-6u2_vm8pMK3BhZ5nUPUeC6dwwZ7lOBXlBk5sbe_Fe9TQFEtog435uPYNIF_Jt0dC_ufRNKQTOBypceDr8wPN2gmOcJibdQ17Iv0yU73dj5w2WzDRzDQQBXVmm5s1w',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCzXqo_qRZDQ-8PLCcvV__lzGTRtrtEAVWi5dGgtp4glmJ9GoNrw7GHb09PFR9PdLQAD-uGEd0QybGHJtxmGa5uDVfXh6MvnVFaDEVAvojAu6CqW6F4v8BBwIpWjRVyIury79g5AdeVnkjALm78U4ORygmTQbZAcFDqwm3iB6VX-EpGy08uKd-Tr0HnYWzMrovgek5W_0KdrAFA_qjHLr1UmVhwCHJg_sqdZPi-e48OASztJuWrnu_E',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDMROcifZCtmCPejgCKGr25ptBkzzLLq__6B3YtxPQpyePRnw9FkVYhCRkOnQkTK9OFGKWtjiIqWLxQnt-8Z1tglf-ZBvVhf-neY1zsCF0mVc3tam5CLE2xC0B62uG3x9Gwhqg3Yp5FZXSyEkSvubld7_59guwdSKA-tFvSa6xCvyILjKovjtgVwXsigzVL8l__1bjG_o23Jou1-CbM5_nQzaErwUcA1mnAuMJ_Zb4BcudkrzM74iXc',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA4-HnHgK7zSDp-uNbsSq2W1EKKLRqhNmSH78HgA5yhTpyi2wcuTbyidmFLecve9a-e6Mf8-yrC97-Dh275Yox_XRkhLMTb8iMz77JHYnZn2kl_Sl3WHDENIzqW97BMGySg8z6K-Z6BOIi_KHDR0fWWuQmgR_nsT6E99wDv8efA9fytZnI0J17z5dIWPruCwTxjaIlG-z6vAlrXk28FHDduTqb811DLNTcZ0zlrINLTRiBrFTMjY8Ih'
    ]
  },
  {
    id: 'luna',
    name: 'Luna',
    species: 'gatos',
    breed: 'Calicó de hogar',
    age: '1.5 años',
    ageCategory: 'joven',
    gender: 'Hembra',
    size: 'Pequeño (3.8 kg)',
    energy: 'Baja',
    location: 'Guadalajara, Jalisco',
    locationCity: 'gdl',
    shelter: 'Albergue San Roque',
    shelterContact: {
      email: 'sanroque@adopta.org',
      phone: '+52 33 4455 6677',
      address: 'Av. Las Palmas 102, Guadalajara',
      hours: 'Lun a Sáb: 10:00 - 18:00 hrs',
    },
    tags: ['Tranquilo', 'Esterilizada', 'Ronroneadora', 'Ideal departamentos'],
    urgent: false,
    description: 'De ronroneo constante y alma serena. Ideal para departamentos y personas que aprecian la tranquilidad.',
    story: 'Luna fue hallada en un jardín comunal donde buscaba protección de la lluvia. Es sumamente limpia, equilibrada, y su compañía transmite una paz inmensa mientras te acompaña en silencio.',
    vaccinated: true,
    sterilized: true,
    dewormed: true,
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBQ7LOdnej27K74t_VBTZITTntTgrGgkYJnuIgMLRMWiYavvz7muNTJblj6ysTzirIpb-WbwRpBxMY3WijkobI5GpxzmaPg2aeKwILWAaGeYLnQmJ9WUy_fOtJZxKKpZ5yKUn4ljlSlHxn1fNLuK4Ezly9pLwnzqet1XbFmAddNgqRIWASAXQY0XNcMhbxkVuTS5yeN8qJvtPZ4s9slAHk05UzyDTcNFuySqaFCtAwXSRxyrI2CIfdZ'
    ]
  },
  {
    id: 'bruno',
    name: 'Bruno',
    species: 'perros',
    breed: 'Border Collie Mix',
    age: '8 meses',
    ageCategory: 'cachorro',
    gender: 'Macho',
    size: 'Mediano (12 kg)',
    energy: 'Alta',
    location: 'Monterrey, Nuevo León',
    locationCity: 'mty',
    shelter: 'Refugio Nueva Oportunidad',
    shelterContact: {
      email: 'contacto@nuevaoportunidad.mx',
      phone: '+52 81 8765 4321',
      address: 'Carretera Nacional Km 245, Monterrey',
      hours: 'Mié a Dom: 11:00 - 17:00 hrs',
    },
    tags: ['Juguetón', 'Enérgico', 'Aprende rápido', 'Aventurero'],
    urgent: false,
    description: 'Joven con mucho entusiasmo por aprender trucos. Busca una familia activa con quien explorar parques.',
    story: 'Bruno tiene una inteligencia despierta y una chispa alegre inagotable. Aprende órdenes básicas rápidamente y disfruta de los juegos de búsqueda.',
    vaccinated: true,
    sterilized: true,
    dewormed: true,
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAWOpiOPVkdspXxg14e-Lg-SvrZq5EoYiuRMvlMjZzn-eluDVReFnXF5dP5YXSwu9_D-x2oa54HLc52jTZ_i9BanPAng3ZebacI1V27G0hi5WdeNvc1YWKKYQ2jIn8TmeZ1BTQsll0THCWnk9eLwRIiuyymUxjO3FRpdIHTZ5hj6elQh7AxfTO_ByKahKFDScEA2t7MgcsCEOQvgxog7U3fxBvjJogFlXH5in6KT2jh1YxDBeYYx20u'
    ]
  },
  {
    id: 'ramon',
    name: 'Ramón',
    species: 'perros',
    breed: 'Criollo noble',
    age: '4 años',
    ageCategory: 'adulto',
    gender: 'Macho',
    size: 'Medio (16 kg)',
    energy: 'Moderada',
    location: 'Ciudad de México',
    locationCity: 'cdmx',
    shelter: 'Refugio Patitas CDMX',
    tags: ['Urgente', 'Desalojo', 'Muy dócil'],
    urgent: true,
    urgencyTag: 'Urgente • Desalojo',
    description: 'El refugio temporal cierra a fin de mes. Cariñoso, tamaño mediano, convive con otros perros.',
    story: 'Ramón necesita una familia definitiva o casa puente urgente antes del cierre de las instalaciones actuales. Es leal, obediente y muy agradecido.',
    vaccinated: true,
    sterilized: true,
    dewormed: true,
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDqICKpTNcqIX0hbwVNb4I26teW9evHOTK5d1TFSQGim9Tf7O9da2UfnhJwq3a660BZKMcpHXvdZUfg88rFNiPZtCTC0_Txp7FgxFL2DdMNFwnMGjBqyacCIb8Qj8eXsoztsyJWI8fCcecpQbXN-K0yuQH8p5xzK_X7bpang6bHjmsRPkLM2nrOqtsc21sZzUtA9LQTiRiO0VgYjFnXRVpoesTDImiK7FfXLn9AsJ3AqzA0NnDrbibE'
    ]
  },
  {
    id: 'michi-miel',
    name: 'Michi Miel',
    species: 'gatos',
    breed: 'Atigrada dorada',
    age: '8 años',
    ageCategory: 'senior',
    gender: 'Hembra',
    size: 'Pequeño (4 kg)',
    energy: 'Baja',
    location: 'Guadalajara, Jalisco',
    locationCity: 'gdl',
    shelter: 'Albergue San Roque',
    tags: ['Caso Especial', 'Senior', 'Amorosa'],
    urgent: true,
    urgencyTag: 'Caso Especial • Senior',
    description: 'Perdió a su dueña adulta mayor. Requiere un hogar tranquilo sin ruidos fuertes. Muy mimosa.',
    story: 'Michi Miel merece pasar sus años dorados en un regazo acogedor donde le ofrezcan calor y caricias suaves.',
    vaccinated: true,
    sterilized: true,
    dewormed: true,
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBQ7LOdnej27K74t_VBTZITTntTgrGgkYJnuIgMLRMWiYavvz7muNTJblj6ysTzirIpb-WbwRpBxMY3WijkobI5GpxzmaPg2aeKwILWAaGeYLnQmJ9WUy_fOtJZxKKpZ5yKUn4ljlSlHxn1fNLuK4Ezly9pLwnzqet1XbFmAddNgqRIWASAXQY0XNcMhbxkVuTS5yeN8qJvtPZ4s9slAHk05UzyDTcNFuySqaFCtAwXSRxyrI2CIfdZ'
    ]
  },
  {
    id: 'pecas-y-nube',
    name: 'Pecas y Nube',
    species: 'gatos',
    breed: 'Hermanitos inseparables',
    age: '4 meses',
    ageCategory: 'cachorro',
    gender: 'Pareja',
    size: 'Pequeño (1.5 kg c/u)',
    energy: 'Moderada',
    location: 'Puebla y alrededores',
    locationCity: 'pue',
    shelter: 'Rescate Con Amor',
    tags: ['Adopción conjunta', 'Cachorros', 'Inseparables'],
    urgent: true,
    urgencyTag: 'Hermanitos Inseparables',
    description: 'Rescatados juntos en caja de cartón. Buscan adopción conjunta o casa puente para no separarse.',
    story: 'Comparten sus siestas entrelazados y se limpian mutuamente. Adoptarlos juntos garantiza gatitos equilibrados y doble dosis de ternura.',
    vaccinated: true,
    sterilized: true,
    dewormed: true,
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBD6i-igFs--mXQj0vwBXO1QawXA4zymjsdlryVh8sQRTNPhQUe9EHx3G8O93O_KeKn_GKGAzv-uLVlcQewJrqOglAJUMlURENVehmo5jVhH3uWBcXpCN6XdoI59jgGl1MHFR-2TyUy02r3iZTsXEyjPOZIkaKX0Vr08NmQRLIZiCsuvAq5whTW_lT6AceE-3TPzSZEYz7ex_A-2bgiy6p8mYw9jyQkUROezNqHN5VH5HigjdftKwtF'
    ]
  },
  {
    id: 'kiko',
    name: 'Kiko',
    species: 'perros',
    breed: 'Mestizo de orejas atentas',
    age: '1 año',
    ageCategory: 'joven',
    gender: 'Macho',
    size: 'Mediano (13 kg)',
    energy: 'Moderada',
    location: 'Monterrey, Nuevo León',
    locationCity: 'mty',
    shelter: 'Refugio Nueva Oportunidad',
    tags: ['Rehabilitado', 'Hogar temporal', 'Dulce'],
    urgent: true,
    urgencyTag: 'Hogar Temporal Urgente',
    description: 'Terminó su tratamiento de patita con éxito. Necesita espacio amoroso para rehabilitación final.',
    story: 'Kiko ha demostrado una gran resiliencia y ganas de vivir. Camina con normalidad y ahora busca la seguridad de un hogar comprensivo.',
    vaccinated: true,
    sterilized: true,
    dewormed: true,
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAWOpiOPVkdspXxg14e-Lg-SvrZq5EoYiuRMvlMjZzn-eluDVReFnXF5dP5YXSwu9_D-x2oa54HLc52jTZ_i9BanPAng3ZebacI1V27G0hi5WdeNvc1YWKKYQ2jIn8TmeZ1BTQsll0THCWnk9eLwRIiuyymUxjO3FRpdIHTZ5hj6elQh7AxfTO_ByKahKFDScEA2t7MgcsCEOQvgxog7U3fxBvjJogFlXH5in6KT2jh1YxDBeYYx20u'
    ]
  },
  {
    id: 'canela',
    name: 'Canela',
    species: 'perros',
    breed: 'Golden Retriever Mix',
    age: '3 años',
    ageCategory: 'adulto',
    gender: 'Hembra',
    size: 'Grande (22 kg)',
    energy: 'Moderada',
    location: 'Ciudad de México',
    locationCity: 'cdmx',
    shelter: 'Refugio Esperanza Verde',
    tags: ['Familiar', 'Dócil', 'Protectora'],
    urgent: false,
    description: 'Una perrita llena de dulzura, obediente y leal. Adora acompañar a niños y adultos por igual.',
    story: 'Canela vivió en situación de calle durante su primer año. Gracias al refugio fue rehabilitada completamente y hoy está lista para brindar su devoción incondicional.',
    vaccinated: true,
    sterilized: true,
    dewormed: true,
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAla2IhsUWYxtedlZ-rCCqbGO7Fe3ONI7Z0R8BoNmImcNmrDh_7-goqJYtbf0vkzkVi78gYg7vaZtNd9cfcyuT2qDPOjXHO7_M-pQ6D9DTDYh0olAodufa1OJK8IGRn4OKUQkfMWn6iQgjD_-AEVh9kTJPBVnUvlS2EzbPfKdod3562_tVTfGP06rt9CZopAbtA8tIchCpQXv5qvcrv-OEYogT5FmYywnGh12K0zMj1AECbku1YBMLS'
    ]
  }
];
