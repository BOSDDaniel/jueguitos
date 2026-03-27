-- ============================================================
-- SISTEMA DE AUTENTICACIÓN - jueguitosDB
-- Host: mysql-5ddca62-bosddaniel-6781.a.aivencloud.com:20571
-- ============================================================

-- Seleccionar la base de datos
USE jueguitosDB;

-- ============================================================
-- TABLA: roles
-- Define los niveles de acceso al sistema
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    nombre      VARCHAR(50)     NOT NULL UNIQUE,
    descripcion VARCHAR(255)    NOT NULL DEFAULT '',
    creado_en   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Roles base del sistema
INSERT INTO roles (nombre, descripcion) VALUES
    ('admin',    'Acceso total: gestión de usuarios, roles y todos los juegos'),
    ('moderador','Puede autorizar usuarios y ver estadísticas'),
    ('jugador',  'Acceso a los juegos autorizados por un admin'),
    ('pendiente','Usuario registrado que espera aprobación manual')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- ============================================================
-- TABLA: usuarios
-- Almacena credenciales y datos de cada usuario
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    nombre          VARCHAR(100)    NOT NULL,
    correo          VARCHAR(191)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    rol_id          INT UNSIGNED    NOT NULL DEFAULT 4,  -- 'pendiente' por defecto
    activo          TINYINT(1)      NOT NULL DEFAULT 1,
    creado_en       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    ultimo_login    DATETIME                 DEFAULT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id)
        REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_correo (correo),
    INDEX idx_rol    (rol_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: juegos
-- Catálogo de juegos JavaScript disponibles
-- ============================================================
CREATE TABLE IF NOT EXISTS juegos (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    nombre      VARCHAR(100)    NOT NULL,
    descripcion TEXT,
    ruta        VARCHAR(255)    NOT NULL,   -- ruta en el repo, e.g. /games/tetris
    activo      TINYINT(1)      NOT NULL DEFAULT 1,
    creado_en   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: permisos_juegos
-- Control granular: qué roles pueden acceder a qué juego
-- ============================================================
CREATE TABLE IF NOT EXISTS permisos_juegos (
    juego_id    INT UNSIGNED    NOT NULL,
    rol_id      INT UNSIGNED    NOT NULL,
    PRIMARY KEY (juego_id, rol_id),
    CONSTRAINT fk_pj_juego FOREIGN KEY (juego_id)
        REFERENCES juegos(id) ON DELETE CASCADE,
    CONSTRAINT fk_pj_rol   FOREIGN KEY (rol_id)
        REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: sesiones_log
-- Auditoría de accesos (opcional pero recomendado)
-- ============================================================
CREATE TABLE IF NOT EXISTS sesiones_log (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id  INT UNSIGNED    NOT NULL,
    accion      ENUM('login','logout','registro','cambio_rol') NOT NULL,
    ip          VARCHAR(45)              DEFAULT NULL,
    user_agent  VARCHAR(255)             DEFAULT NULL,
    creado_en   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_log_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_log_usuario (usuario_id),
    INDEX idx_log_fecha   (creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- VISTA: vista_usuarios
-- Útil para consultas rápidas con el nombre del rol incluido
-- ============================================================
CREATE OR REPLACE VIEW vista_usuarios AS
SELECT
    u.id,
    u.nombre,
    u.correo,
    r.nombre   AS rol,
    u.activo,
    u.creado_en,
    u.ultimo_login
FROM usuarios u
JOIN roles r ON u.rol_id = r.id;

-- ============================================================
-- USUARIO ADMIN INICIAL (cambiar contraseña después del primer login)
-- Hash bcrypt de: Admin1234! (costo 12)
-- ============================================================
INSERT IGNORE INTO usuarios (nombre, correo, password_hash, rol_id) VALUES (
    'Administrador',
    'admin@jueguitos.com',
    '$2b$12$KIX8/fGa1Y0XNqBFkEkLmeSLp3oAiGOu1NiWjfE8JxKHCGzqxBH5K',
    1  -- rol 'admin'
);
