import { Console } from "console";

export function paginateArray<T>(
  data: T[],
  page: number,
  pageSize: number
): { data: T[]; total: number; totalPages: number } {
  const total = data.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = page * pageSize;
  const end = start + pageSize;

  // console.log(`Total items: ${total}`);
  // console.log(`Total pages: ${totalPages}`);
  // console.log(`Current page: ${page}`);
  // console.log(`Page size: ${pageSize}`);
  // console.log(`Start index: ${start}`);
  // console.log(`End index: ${end}`);

  const paginatedData = data.slice(start, end);

  // console.log(`Paginated data:`, paginatedData);

  return {
    data: paginatedData,
    total,
    totalPages,
  };
}
