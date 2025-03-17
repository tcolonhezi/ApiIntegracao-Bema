export function parseData(data: string | undefined): {
  formattedDate: string | null;
  parsedDate: Date | null;
} {
  let parsedDate: Date | null = null;
  if (!data) return { formattedDate: null, parsedDate: null };
  const hasTimeInfo = data.includes(",");

  try {
    if (data.includes(",")) {
      // Formato: "11/03/2025, 14:39"
      const [datePart, timePart] = data.split(",");
      const [day, month, year] = datePart.trim().split("/").map(Number);
      const [hour, minute] = timePart.trim().split(":").map(Number);
      parsedDate = new Date(year, month - 1, day, hour, minute);
    } else if (data.includes("-")) {
      // Formato: "2025-03-11"
      const [year, month, day] = data.split("-").map(Number);
      parsedDate = new Date(year, month - 1, day, 0, 0, 0);
    } else if (data.includes("/")) {
      // Formato: "11/03/2025"
      const [day, month, year] = data.split("/").map(Number);
      parsedDate = new Date(year, month - 1, day, 0, 0, 0);
    } else if (data.length == 8) {
      const day = data.substring(6, 8);
      const month = data.substring(4, 6);
      const year = data.substring(0, 4);
      parsedDate = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        0,
        0,
        0
      );
    }
  } catch (error) {
    return { formattedDate: null, parsedDate: null }; // Se houver erro no parsing, não renderiza
  }

  if (!parsedDate || isNaN(parsedDate.getTime()))
    return { formattedDate: null, parsedDate: null };
  const formattedDate = hasTimeInfo
    ? parsedDate.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : parsedDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
  return { formattedDate, parsedDate };
}

export function calcularDiferencaDias(dataString: string): number | null {
  const data = parseData(dataString).parsedDate;
  if (!data) {
    return null;
  }
  const hoje = new Date();
  const diffMs = hoje.getTime() - data.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)); // Converte para dias
}
