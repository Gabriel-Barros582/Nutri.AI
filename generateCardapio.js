export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
  const { perfil } = req.body;

  if (!perfil) {
    return res.status(400).json({ error: 'Perfil é obrigatório' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Crie um cardápio saudável detalhado baseado no perfil: ${perfil}.
Formate a resposta com:
- Título para cada refeição (Ex: Café da Manhã ☕)
- Lista com alimentos
- Modo de preparo com subtítulo

Seja direto e bem organizado, como um nutricionista faria.`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.error.message || 'Erro na API Gemini' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Erro no backend:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
