import { Database } from "bun:sqlite";

const db = new Database(new URL("../database.sqlite", import.meta.url).pathname);

db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS user (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        username        TEXT NOT NULL UNIQUE,
        email           TEXT  NULL UNIQUE,
        password_hash   TEXT NOT NULL
    );

   

    CREATE TABLE IF NOT EXISTS topicos (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo          TEXT NOT NULL,
        conteudo        TEXT NOT NULL,
        autor_id        INTEGER NOT NULL,
        criado_em       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (autor_id) REFERENCES user(id)
    );

    CREATE TABLE IF NOT EXISTS respostas (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        topico_id       INTEGER NOT NULL,
        conteudo        TEXT NOT NULL,
        autor_id        INTEGER NOT NULL,
        criado_em       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (topico_id) REFERENCES topicos(id) ON DELETE CASCADE,
        FOREIGN KEY (autor_id) REFERENCES user(id)
    );
`);

export { db };
export default db;
