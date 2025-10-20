// Lista de versões conforme fornecido

import { prisma } from "../lib/prisma";

//const versoes = [{ data: "16/05/2025", revisao: 46209 }];

export async function versoes_referencia() {
  return await prisma.versao_sistema.findMany();
}

export async function verificarVersao(versao: string, revisao: string) {
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
