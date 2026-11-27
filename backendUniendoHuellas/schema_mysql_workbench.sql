-- ====================================================================
-- ESQUEMA COMPLETO PARA MYSQL WORKBENCH / DOCKER
-- Base de Datos: adopciones_db
-- ====================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE DATABASE IF NOT EXISTS adopciones_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE adopciones_db;

-- 1. Tabla: Roles
CREATE TABLE IF NOT EXISTS roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabla: Refugios
CREATE TABLE IF NOT EXISTS refugios (
    id_refugio INT AUTO_INCREMENT PRIMARY KEY,
    nombre_organizacion VARCHAR(150) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    estado VARCHAR(100) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    logo_url VARCHAR(500) NULL,
    estado_cuenta VARCHAR(30) NOT NULL DEFAULT 'activo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabla: Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    id_rol INT NOT NULL,
    id_refugio INT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    ciudad VARCHAR(150) NULL,
    CONSTRAINT fk_usuarios_roles FOREIGN KEY (id_rol) REFERENCES roles(id_rol) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_usuarios_refugios FOREIGN KEY (id_refugio) REFERENCES refugios(id_refugio) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabla: Animales
CREATE TABLE IF NOT EXISTS animales (
    id_animal INT AUTO_INCREMENT PRIMARY KEY,
    id_refugio INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    especie VARCHAR(50) NOT NULL,
    raza VARCHAR(100) NOT NULL,
    sexo VARCHAR(20) NOT NULL,
    edad_estimada VARCHAR(50) NOT NULL,
    tamano VARCHAR(30) NOT NULL,
    descripcion TEXT NULL,
    foto_url VARCHAR(500) NULL,
    es_urgente BOOLEAN NOT NULL DEFAULT FALSE,
    vacunado BOOLEAN NULL,
    esterilizado BOOLEAN NULL,
    desparasitado BOOLEAN NULL,
    estado_adopcion VARCHAR(30) NOT NULL DEFAULT 'disponible',
    CONSTRAINT fk_animales_refugios FOREIGN KEY (id_refugio) REFERENCES refugios(id_refugio) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Tabla: Solicitudes_Adopcion
CREATE TABLE IF NOT EXISTS solicitudes_adopcion (
    id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_animal INT NOT NULL,
    mensaje TEXT NULL,
    tipo_vivienda VARCHAR(30) NULL,
    experiencia VARCHAR(5) NULL,
    telefono_contacto VARCHAR(30) NULL,
    estado_solicitud VARCHAR(30) NOT NULL DEFAULT 'pendiente',
    notas_internas TEXT NULL,
    respuesta_publica TEXT NULL,
    fecha_solicitud DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_solicitudes_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_solicitudes_animales FOREIGN KEY (id_animal) REFERENCES animales(id_animal) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Tabla: Favoritos
CREATE TABLE IF NOT EXISTS favoritos (
    id_favorito INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_animal INT NOT NULL,
    CONSTRAINT uq_favorito_usuario_animal UNIQUE (id_usuario, id_animal),
    CONSTRAINT fk_favoritos_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_favoritos_animales FOREIGN KEY (id_animal) REFERENCES animales(id_animal) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS solicitudes_voluntariado (
    id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_refugio INT NOT NULL,
    modalidad VARCHAR(30) NOT NULL,
    disponibilidad VARCHAR(300) NOT NULL,
    comentarios VARCHAR(1000) NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    fecha_solicitud DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_voluntario_refugio_modalidad UNIQUE (id_usuario, id_refugio, modalidad),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_refugio) REFERENCES refugios(id_refugio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- DATOS INICIALES DE PRUEBA (SEEDS)
-- ====================================================================

-- Roles
INSERT IGNORE INTO roles (id_rol, nombre_rol) VALUES
(1, 'Administrador'),
(2, 'Refugio / Encargado'),
(3, 'Usuario');

-- Refugios (8 organizaciones activas)
INSERT IGNORE INTO refugios (id_refugio, nombre_organizacion, direccion, ciudad, estado, telefono, logo_url, estado_cuenta) VALUES
(1, 'Huellitas con Amor', 'Av. Siempre Viva 742, Col. Primavera', 'Monterrey', 'Nuevo León', '8181234567', 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=400', 'activo'),
(2, 'Refugio Esperanza Animal', 'Calle Los Olivos 120, Col. Centro', 'Guadalajara', 'Jalisco', '3339876543', 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400', 'activo'),
(3, 'Patitas del Sol', 'Calle Jacarandas 184, Col. Jardines del Sur', 'Ciudad de México', 'Ciudad de México', '5541234567', 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400', 'activo'),
(4, 'Segunda Oportunidad', 'Av. Los Encinos 52, Col. Valle del Sol', 'Puebla', 'Puebla', '2223456789', 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400', 'activo'),
(5, 'Hogar Ñandú', 'Calle Loma Serena 87, Col. Mirador del Bosque', 'Querétaro', 'Querétaro', '4422345678', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400', 'activo'),
(6, 'Amigos del Mayab', 'Calle Almendros 216, Col. Jardines del Mayab', 'Mérida', 'Yucatán', '9993456789', 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400', 'activo'),
(7, 'Bosque de Huellas', 'Av. Las Mariposas 39, Col. Valle de la Luna', 'Toluca', 'Estado de México', '7224567890', 'https://images.unsplash.com/photo-1534361960057-19889db9621e?w=400', 'activo'),
(8, 'Santuario San Roque', 'Blvd. Paseo de los Insurgentes 310, Col. Jardines del Moral', 'León', 'Guanajuato', '4775678901', 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=400', 'activo');

-- Cuentas locales iniciales (Administrador y Adoptante) con hashes bcrypt
INSERT IGNORE INTO usuarios (id_usuario, id_rol, id_refugio, nombre_completo, correo, password_hash, telefono, ciudad) VALUES
(1, 1, NULL, 'Administrador Local', 'admin@example.com', '$2b$12$ymKJ6OySuS049.8qH4baU.SOk7VgAnQOLf9KwoACXyvfKsx9WJyri', '5500000001', 'Ciudad de México'),
(2, 3, NULL, 'Adoptante Local', 'adoptante@example.com', '$2b$12$7oMVT1feXmbvxm8QDrwqSO7TtuDYkgC5Fk1c31LvwFQlY1LOi5Zy.', '5500000002', 'Ciudad de México');

-- Animales (25 ejemplares distribuidos entre los 8 refugios)
INSERT IGNORE INTO animales (id_animal, id_refugio, nombre, especie, raza, sexo, edad_estimada, tamano, descripcion, foto_url, es_urgente, vacunado, esterilizado, desparasitado, estado_adopcion) VALUES
(1, 1, 'Max', 'Perro', 'Golden Retriever Mestizo', 'Macho', '2 años', 'Grande', 'Muy cariñoso, juguetón y convive excelente con niños y otros perros.', 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600', FALSE, TRUE, TRUE, TRUE, 'disponible'),
(2, 1, 'Luna', 'Gato', 'Siamés Mestizo', 'Hembra', '1 año', 'Pequeño', 'Tranquila, ronroneadora y adora dormir cerca de la ventana.', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600', FALSE, TRUE, TRUE, TRUE, 'disponible'),
(3, 2, 'Rocky', 'Perro', 'Husky Siberiano', 'Macho', '3 años', 'Grande', 'Energético, requiere espacio para correr y paseos diarios.', 'https://images.unsplash.com/photo-1507146426996-ef05306b995a?w=600', FALSE, TRUE, TRUE, TRUE, 'disponible'),
(4, 2, 'Milo', 'Gato', 'Europeo común', 'Macho', '6 meses', 'Pequeño', 'Cachorro juguetón, desparasitado y con todas sus vacunas al corriente.', 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600', FALSE, TRUE, NULL, TRUE, 'en_proceso'),
(5, 1, 'Firulais', 'Perro', 'Mestizo cariñoso', 'Macho', '2 años', 'Mediano', 'Juguetón, alegre y muy leal. Le encanta pasear en parques.', 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600', FALSE, TRUE, TRUE, TRUE, 'disponible'),
(6, 3, 'Nala', 'Perro', 'Mestizo', 'Hembra', '1 año', 'Mediano', 'Nala disfruta los paseos tranquilos con correa y convive bien con otros perros equilibrados.', 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600', TRUE, TRUE, TRUE, TRUE, 'disponible'),
(7, 3, 'Bruno', 'Perro', 'Border Collie Mestizo', 'Macho', '8 meses', 'Mediano', 'Bruno aprende órdenes básicas con rapidez y necesita actividad física moderada cada día.', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600', FALSE, TRUE, NULL, TRUE, 'disponible'),
(8, 3, 'Mía', 'Gato', 'Calicó doméstico', 'Hembra', '2 años', 'Pequeño', 'Mía es serena, limpia y disfruta descansar junto a una ventana protegida con malla.', 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=600', FALSE, TRUE, TRUE, TRUE, 'disponible'),
(9, 4, 'Toby', 'Perro', 'Schnauzer Mestizo', 'Macho', '4 años', 'Pequeño', 'Toby se adapta fácil a departamentos y agradece rutinas estables y paseos cortos.', 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=600', FALSE, TRUE, TRUE, TRUE, 'disponible'),
(10, 4, 'Kiara', 'Gato', 'Atigrado naranja', 'Hembra', '5 meses', 'Pequeño', 'Kiara es curiosa, juguetona y busca un hogar paciente para completar su esquema de cuidados.', 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=600', TRUE, NULL, FALSE, TRUE, 'disponible'),
(11, 4, 'Simón', 'Perro', 'Labrador Mestizo', 'Macho', '6 años', 'Grande', 'Simón es noble, obediente y prefiere hogares tranquilos donde lo acompañen por las tardes.', 'https://images.unsplash.com/photo-1534361960057-19889db9621e?w=600', FALSE, TRUE, TRUE, TRUE, 'disponible'),
(12, 5, 'Coco', 'Gato', 'Doméstico pelo corto', 'Macho', '3 años', 'Pequeño', 'Coco disfruta los rascadores altos, los juegos con varita y la compañía sin sobresaltos.', 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=600', FALSE, TRUE, TRUE, NULL, 'disponible'),
(13, 5, 'Olivia', 'Perro', 'Pastor Mestizo', 'Hembra', '9 años', 'Mediano', 'Olivia es una perrita senior dulce y calmada que necesita un rincón cómodo para descansar.', 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=600', TRUE, TRUE, TRUE, TRUE, 'disponible'),
(14, 5, 'Bimba', 'Gato', 'Tuxedo doméstico', 'Hembra', '1 año', 'Pequeño', 'Bimba es observadora y cariñosa cuando toma confianza; ideal para ambientes interiores seguros.', 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600', FALSE, TRUE, NULL, TRUE, 'disponible'),
(15, 6, 'Ñoño', 'Perro', 'Bóxer Mestizo', 'Macho', '5 años', 'Grande', 'Ñoño es afectuoso, protector con su familia y disfruta las caminatas al amanecer.', 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600', FALSE, TRUE, TRUE, TRUE, 'disponible'),
(16, 6, 'Frida', 'Gato', 'Carey doméstico', 'Hembra', '4 años', 'Pequeño', 'Frida prefiere hogares sin ruido excesivo y le encanta tomar el sol por las mañanas.', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600', FALSE, TRUE, TRUE, TRUE, 'disponible'),
(17, 6, 'Leo', 'Perro', 'Cocker Mestizo', 'Macho', '4 meses', 'Pequeño', 'Leo es un cachorro sociable que está aprendiendo a pasear con pechera y socializar.', 'https://images.unsplash.com/photo-1507146426996-ef05306b995a?w=600', FALSE, NULL, FALSE, TRUE, 'disponible'),
(18, 7, 'Kira', 'Perro', 'Mestizo de montaña', 'Hembra', '3 años', 'Grande', 'Kira necesita patio cercado o caminatas largas y responde muy bien al refuerzo positivo.', 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600', TRUE, TRUE, TRUE, TRUE, 'disponible'),
(19, 7, 'Duna', 'Gato', 'Doméstico gris', 'Hembra', '7 años', 'Pequeño', 'Duna es tranquila, independiente y muy agradecida con quienes respetan su espacio.', 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600', FALSE, TRUE, TRUE, TRUE, 'disponible'),
(20, 7, 'Benito', 'Perro', 'Beagle Mestizo', 'Macho', '2 años', 'Mediano', 'Benito es curioso, olfateador incansable y excelente compañero para familias activas.', 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600', FALSE, TRUE, NULL, TRUE, 'disponible'),
(21, 8, 'Ámbar', 'Gato', 'Siamés doméstico', 'Hembra', '8 meses', 'Pequeño', 'Ámbar es juguetona y vocal; busca una familia que disfrute interactuar con ella a diario.', 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=600', FALSE, TRUE, FALSE, TRUE, 'disponible'),
(22, 8, 'Pancho', 'Perro', 'Mestizo criollo', 'Macho', '8 años', 'Mediano', 'Pancho es un compañero sereno con excelentes modales en casa y paseos pausados.', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600', FALSE, TRUE, TRUE, TRUE, 'disponible'),
(23, 8, 'Gala', 'Gato', 'Blanco y negro', 'Hembra', '2 años', 'Pequeño', 'Gala convive bien con otros gatos tranquilos y adora las siestas en lugares cálidos.', 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=600', FALSE, TRUE, TRUE, TRUE, 'disponible'),
(24, 2, 'Trufa', 'Perro', 'Poodle Mestizo', 'Hembra', '1 año', 'Pequeño', 'Trufa es dócil, alegre y actualmente se encuentra en etapa de entrevistas con una familia.', 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=600', FALSE, TRUE, TRUE, TRUE, 'en_proceso'),
(25, 1, 'Mora', 'Gato', 'Doméstico negro', 'Hembra', '3 años', 'Pequeño', 'Mora completó su proceso de adopción responsable y ya disfruta de su nuevo hogar.', 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=600', FALSE, TRUE, TRUE, TRUE, 'adoptado');
