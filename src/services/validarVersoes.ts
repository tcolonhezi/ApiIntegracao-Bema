// Lista de versões conforme fornecido
const versoes = [
  { data: "17/05/2025", revisao: 31161 },
  { data: "14/06/2024", revisao: 31160 },
  { data: "09/08/2024", revisao: 31159 },
  { data: "04/10/2024", revisao: 31158 },
];

export function verificarVersao(versao: string, revisao: string) {
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

  const versaoEncontrada = versoes.find((v) => v.data === dataFormatada);

  if (versaoEncontrada) {
    return Number(revisao) >= versaoEncontrada.revisao
      ? "Atualizado"
      : "Desatualizado (Revisão)";
  }
  return "Versão não encontrada (Atualizar)";
}
