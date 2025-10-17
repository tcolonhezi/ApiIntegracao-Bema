// Lista de versões conforme fornecido
const versoes = [{ data: "16/05/2025", revisao: 46209 }];

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
