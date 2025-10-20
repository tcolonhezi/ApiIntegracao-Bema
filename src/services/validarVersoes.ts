// Lista de versões conforme fornecido

// Import prisma lazily to avoid possible circular import / initialization issues
// that can make model accessors undefined at module-evaluation time.
//const versoes = [{ data: "16/05/2025", revisao: 46209 }];

export async function versoes_referencia() {
  const { prisma } = await import("../lib/prisma");
  if (!prisma || !prisma.versao_sistema) {
    throw new Error("Prisma client or model 'versao_sistema' not available");
  }
  return await prisma.versao_sistema.findMany();
}

export async function verificarVersao(versao: string, revisao: string) {
  const { prisma } = await import("../lib/prisma");
  if (!prisma || !prisma.versao_sistema) {
    throw new Error("Prisma client or model 'versao_sistema' not available");
  }
  const versoes = await prisma.versao_sistema.findMany();
  // Convert the input date (YYYY-MM-DD) to DD/MM/YYYY
  let dataFormatada;
  let versaoReplaced = versao.replace(/^[^-]+-/, "");

  if (versaoReplaced.includes("-")) {
    const [ano, mes, dia] = versao.split("-");
    dataFormatada = `${dia}/${mes}/${ano}`;
  } else {
    const [dia, mes, ano] = versao.replace(/^[^-]+-/, "").split("/");
    dataFormatada = `${dia}/${mes}/${ano}`;
  }

  const versaoEncontrada = versoes.find((v) => v.versao_data === dataFormatada);

  if (versaoEncontrada) {
    return Number(revisao) >= Number.parseInt(versaoEncontrada.versao_revisao)
      ? "Atualizado"
      : "Desatualizado (Revisão)";
  }
  return "Versão não encontrada (Atualizar)";
}
