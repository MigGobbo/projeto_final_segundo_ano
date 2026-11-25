import signupPage from "./html/index.html";
import home from "./html/home.html";
import forumPage from "./html/forum.html";
import topicPage from "./html/topico.html";
import db from "./db";

const loggedUsers: any = {};

const srv = Bun.serve({
  port: 3000,
  routes: {
    "/css/index.css": new Response(
      Bun.file(new URL("./css/index.css", import.meta.url)),
      { headers: { "Content-Type": "text/css; charset=utf-8" } },
    ),
    "/css/login.css": new Response(
      Bun.file(new URL("./css/login.css", import.meta.url)),
      { headers: { "Content-Type": "text/css; charset=utf-8" } },
    ),
    "/css/home.css": new Response(
      Bun.file(new URL("./css/home.css", import.meta.url)),
      { headers: { "Content-Type": "text/css; charset=utf-8" } },
    ),
    "/css/forum.css": new Response(
      Bun.file(new URL("./css/forum.css", import.meta.url)),
      { headers: { "Content-Type": "text/css; charset=utf-8" } },
    ),
    "/css/topico.css": new Response(
      Bun.file(new URL("./css/topico.css", import.meta.url)),
      { headers: { "Content-Type": "text/css; charset=utf-8" } },
    ),
    "/": signupPage,
    "/home": home,
    "/forum": forumPage,
    "/forum/:id": topicPage,

    "/api/topicos": {
      GET: () => {
        const query = db.query(`
                    SELECT topicos.id, topicos.titulo, topicos.conteudo, user.username AS autor,
                        topicos.criado_em, COUNT(respostas.id) AS quantidade_respostas
                    FROM topicos
                    JOIN user ON user.id = topicos.autor_id
                    LEFT JOIN respostas ON respostas.topico_id = topicos.id
                    GROUP BY topicos.id
                    ORDER BY topicos.criado_em DESC, topicos.id DESC
                `);
        return Response.json(query.all());
      },

      POST: async (req) => {
        const ses = req.cookies.get("ses") as string;
        const user = loggedUsers[ses];
        if (!ses || !user)
          return Response.json(
            { msg: "usuário não esta logado" },
            { status: 401 },
          );

        const body = (await req.json().catch(() => null)) as {
          titulo?: string;
          conteudo?: string;
        } | null;
        if (
          !body ||
          typeof body.titulo !== "string" ||
          !body.titulo.trim() ||
          typeof body.conteudo !== "string" ||
          !body.conteudo.trim()
        )
          return Response.json(
            { msg: "título e conteúdo são obrigatórios" },
            { status: 400 },
          );

        const query = db.query(`
                    INSERT INTO topicos(titulo, conteudo, autor_id)
                    VALUES(:titulo, :conteudo, :autor_id)
                `);
        const data = query.run({
          ":titulo": body.titulo.trim(),
          ":conteudo": body.conteudo.trim(),
          ":autor_id": user.id,
        });
        return Response.json(
          { id: Number(data.lastInsertRowid) },
          { status: 201 },
        );
      },
    },

    "/api/topicos/:id": {
      GET: (req) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id < 1)
          return Response.json({ msg: "tópico inválido" }, { status: 400 });

        const topico = db
          .query(
            `
                    SELECT topicos.id, topicos.titulo, topicos.conteudo, user.username AS autor, topicos.criado_em
                    FROM topicos
                    JOIN user ON user.id = topicos.autor_id
                    WHERE topicos.id = :id
                `,
          )
          .get({ ":id": id });
        if (!topico)
          return Response.json(
            { msg: "tópico não encontrado" },
            { status: 404 },
          );

        const respostas = db
          .query(
            `
                    SELECT respostas.id, respostas.conteudo, user.username AS autor, respostas.criado_em
                    FROM respostas
                    JOIN user ON user.id = respostas.autor_id
                    WHERE respostas.topico_id = :id
                    ORDER BY respostas.criado_em ASC, respostas.id ASC
                `,
          )
          .all({ ":id": id });
        return Response.json({ topico, respostas });
      },
    },

    "/api/topicos/:id/respostas": {
      POST: async (req) => {
        const ses = req.cookies.get("ses") as string;
        const user = loggedUsers[ses];
        if (!ses || !user)
          return Response.json(
            { msg: "usuário não esta logado" },
            { status: 401 },
          );

        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id < 1)
          return Response.json({ msg: "tópico inválido" }, { status: 400 });

        const topico = db
          .query(`SELECT id FROM topicos WHERE id = :id`)
          .get({ ":id": id });
        if (!topico)
          return Response.json(
            { msg: "tópico não encontrado" },
            { status: 404 },
          );

        const body = (await req.json().catch(() => null)) as {
          conteudo?: string;
        } | null;
        if (!body || typeof body.conteudo !== "string" || !body.conteudo.trim())
          return Response.json(
            { msg: "conteúdo é obrigatório" },
            { status: 400 },
          );

        const query = db.query(`
                    INSERT INTO respostas(topico_id, conteudo, autor_id)
                    VALUES(:topico_id, :conteudo, :autor_id)
                `);
        const data = query.run({
          ":topico_id": id,
          ":conteudo": body.conteudo.trim(),
          ":autor_id": user.id,
        });
        return Response.json(
          { id: Number(data.lastInsertRowid) },
          { status: 201 },
        );
      },
    },

    "/user": {
      POST: async (req) => {
        const body = (await req.json()) as any;
        const existingUser = db
          .query(`SELECT 1 FROM user WHERE username=:username LIMIT 1`)
          .get({ ":username": body.username });
        if (existingUser)
          return Response.json(
            { msg: "usuário já cadastrado" },
            { status: 409 },
          );

        const query = db.query(
          `INSERT INTO user(username, password_hash) VALUES(:username, :password_hash)`,
        );
        const hash = await Bun.password.hash(body.password);
        const data = query.run({
          ":username": body.username,
          ":password_hash": hash,
        });
        return Response.json(data, { status: 201 });
      },
    },

    "/login": {
      GET: () =>
        new Response(Bun.file(new URL("./html/login.html", import.meta.url))),
      POST: async (req) => {
        const body = (await req.json()) as any;
        const query = db.query(
          `SELECT * FROM user WHERE username=:username LIMIT 1`,
        );
        const data: any = query.get({ ":username": body.username });
        if (!data)
          return Response.json(
            { msg: "usuário não encontrado" },
            { status: 404 },
          );
        const hash = data.password_hash;
        const isMatch = await Bun.password.verify(body.password, hash);
        if (!isMatch)
          return Response.json({ msg: "senha incorreta" }, { status: 401 });
        const uuid = crypto.randomUUID();
        delete data.password_hash;
        loggedUsers[uuid] = data;
        req.cookies.set("ses", uuid);
        return Response.json(isMatch);
      },
    },

    "/login/user": {
      GET: (req) => {
        const ses = req.cookies.get("ses") as string;
        const data = loggedUsers[ses];
        if (!ses || !data)
          return Response.json(
            { msg: "usuário não esta logado" },
            { status: 401 },
          );
        return Response.json(data);
      },

      POST: async (req) => {
        const body = (await req.json()) as any;
        const query = db.query(`INSERT INTO comment(content) VALUES(:content)`);
        const data = query.run({ ":content": body.content });
        return Response.json(data, { status: 201 });
      },
    },
  },
});

console.log(`servidor em ${srv.url}`);
