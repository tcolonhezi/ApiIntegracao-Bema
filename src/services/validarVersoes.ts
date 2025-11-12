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

export function versaoSGDFEEstaDesatualizada(
  currentVersion: string,
  targetVersion: string
): boolean {
  // 1. SPLIT e Conversão para Números
  // Divide a string de versão usando o ponto (.) e converte cada parte para número.
  const currentParts = currentVersion.split(".").map(Number);
  const targetParts = targetVersion.split(".").map(Number);
  //console.log(currentVersion);
  // 2. Comparação Parte por Parte (Major, Minor, Patch)
  for (let i = 0; i < 3; i++) {
    // Garante que versões incompletas (ex: '2.1') sejam tratadas como tendo '0' no final.
    const currentPart = currentParts[i] || 0;
    const targetPart = targetParts[i] || 0;

    // a) Se a parte atual é MENOR, a versão está desatualizada.
    if (currentPart < targetPart) {
      return true;
    }

    // b) Se a parte atual é MAIOR, a versão NÃO está desatualizada (é igual ou superior).
    if (currentPart > targetPart) {
      return false;
    }

    // c) Se as partes são IGUAIS, o loop continua para a próxima parte (ex: Major é igual, verifica Minor).
  }

  // 3. Conclusão: Se o loop terminar sem retornar, significa que todas as partes são IGUAIS.
  // Uma versão IGUAL à versão de corte (ex: 2.13.1 vs 2.13.1) não é considerada desatualizada (não é estritamente menor).
  return false;
}
